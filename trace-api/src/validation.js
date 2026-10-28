import crypto from "node:crypto";
import { parseEther } from "ethers";

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

const REQUIRED_FIELDS = [
  "dvctId",
  "contractId",
  "useCaseContractTitle",
  "dataId",
  "dataProviderId",
  "dataConsumerId",
  "factorCheck",
  "reachEndFlow",
  "providerUrl",
  "currentParticipantId",
  "nextParticipantId",
  "useCaseId",
  "useCaseName",
  "dataQualityCheck",
  "participantShare",
];

const STRING_FIELDS = [
  "dvctId",
  "contractId",
  "useCaseContractTitle",
  "dataId",
  "dataProviderId",
  "dataConsumerId",
  "currentParticipantId",
  "nextParticipantId",
  "useCaseId",
  "useCaseName",
];

const MAX_STRING = 2048;
const MAX_PARTICIPANTS = 100;
const MAX_TOTAL_SHARES = 10_000;

const toBoolean = (value, field) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ValidationError(`${field} must be a boolean`);
};

// Validates the PDC payload. Returns a normalized copy; throws ValidationError when invalid.
export const validateRunScriptPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  for (const field of REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new ValidationError(`Missing or invalid field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) {
    if (typeof payload[field] !== "string" || payload[field].length > MAX_STRING) {
      throw new ValidationError(`${field} must be a string of at most ${MAX_STRING} characters`);
    }
  }

  if (!Array.isArray(payload.participantShare) || payload.participantShare.length === 0) {
    throw new ValidationError("participantShare must contain at least one participant");
  }
  if (payload.participantShare.length > MAX_PARTICIPANTS) {
    throw new ValidationError(`participantShare accepts at most ${MAX_PARTICIPANTS} participants`);
  }

  const participantShare = payload.participantShare.map((participant, index) => {
    const numOfShare = Number(participant?.numOfShare);
    if (!Number.isFinite(numOfShare) || numOfShare < 0) {
      throw new ValidationError(`participantShare[${index}].numOfShare must be a non-negative number`);
    }
    const participantId = String(participant?.participantId || "").trim();
    if (!participantId || participantId.length > MAX_STRING) {
      throw new ValidationError(`participantShare[${index}].participantId is required`);
    }
    return {
      participantId,
      participantName: String(participant.participantName || "").slice(0, 256),
      role: String(participant.role || "").slice(0, 256),
      numOfShare,
    };
  });

  return {
    ...payload,
    useCaseName: payload.useCaseName.trim(),
    reachEndFlow: toBoolean(payload.reachEndFlow, "reachEndFlow"),
    participantShare,
  };
};

export const parseRewardPool = (payload, { defaultRewardPool, maxRewardPool }) => {
  const raw = payload.rewardPool ?? payload.rewardPoolAmount ?? payload.rewardAmount ?? defaultRewardPool;
  const normalized = String(raw).trim();

  if (!/^\d+(\.\d{1,18})?$/.test(normalized) || Number(normalized) <= 0 || Number(normalized) > maxRewardPool) {
    throw new ValidationError(`rewardPool must be a positive amount of at most ${maxRewardPool} PTX`);
  }

  return { rewardPool: normalized, rewardPoolWei: parseEther(normalized) };
};

// Resolves every participant to its registered wallet and turns the raw weights into basis points.
// Participants that share a wallet are merged; participants without weight are left out.
export const buildPayoutPlan = (participants, registry) => {
  const byAddress = new Map();

  for (const participant of participants) {
    // Participants without weight are not paid, so they need no wallet.
    if (participant.numOfShare === 0) continue;
    const organization = registry.resolve(participant.participantId);
    if (!organization?.walletAddress) {
      throw new ValidationError(
        `No wallet address registered for participant "${participant.participantId}"`,
      );
    }

    const entry = byAddress.get(organization.walletAddress) || {
      walletAddress: organization.walletAddress,
      organizationId: organization.organizationId,
      weight: 0,
    };
    entry.weight += participant.numOfShare;
    byAddress.set(organization.walletAddress, entry);
  }

  const entries = [...byAddress.values()];
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    throw new ValidationError("participantShare numOfShare total must be greater than zero");
  }

  // Largest-remainder rounding so the shares add up to exactly 100%.
  const raw = entries.map((entry) => (entry.weight / totalWeight) * MAX_TOTAL_SHARES);
  const shares = raw.map(Math.floor);
  let remaining = MAX_TOTAL_SHARES - shares.reduce((sum, share) => sum + share, 0);
  raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder)
    .forEach(({ index }) => {
      if (remaining > 0) {
        shares[index] += 1;
        remaining -= 1;
      }
    });

  return entries.map((entry, index) => ({ ...entry, basisPoints: shares[index] }));
};

// Two requests describing the same data-exchange event map to the same job.
export const buildIdempotencyKey = (payload) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        payload.dvctId,
        payload.contractId,
        payload.useCaseId,
        payload.useCaseName,
        payload.dataId,
        payload.dataProviderId,
        payload.dataConsumerId,
        payload.currentParticipantId,
        payload.nextParticipantId,
        payload.reachEndFlow,
      ]),
    )
    .digest("hex");
