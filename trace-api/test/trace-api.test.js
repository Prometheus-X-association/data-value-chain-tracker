import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createApp } from "../src/server.js";
import { loadWalletRegistry } from "../src/registry.js";
import { buildTraceabilityPayloads } from "../src/traceability.js";
import {
  ValidationError,
  buildIdempotencyKey,
  buildPayoutPlan,
  parseRewardPool,
  validateRunScriptPayload,
} from "../src/validation.js";

const WALLET_A = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const WALLET_B = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const registryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-api-")), "organizations.json");
fs.writeFileSync(
  registryFile,
  JSON.stringify([
    { organizationId: "org-a", aliases: ["http://localhost:3335/"], walletAddress: WALLET_A.toLowerCase() },
    { organizationId: "org-b", walletAddress: WALLET_B },
    { organizationId: "org-no-wallet", walletAddress: null },
  ]),
);
const registry = loadWalletRegistry(registryFile);

const validPayload = (overrides = {}) => ({
  dvctId: "123",
  contractId: "contract-1",
  useCaseContractTitle: "Title",
  dataId: "data-1",
  dataProviderId: "http://localhost:3335/",
  dataConsumerId: "http://localhost:3339/",
  factorCheck: true,
  reachEndFlow: false,
  providerUrl: "TBD",
  currentParticipantId: "org-a",
  nextParticipantId: "org-b",
  useCaseId: "usecase-1",
  useCaseName: "Use case 1",
  dataQualityCheck: "TBD",
  participantShare: [
    { participantId: "org-a", numOfShare: 17, role: "orchestrator" },
    { participantId: "org-b", numOfShare: 41, role: "participant" },
  ],
  ...overrides,
});

test("rejects payloads with missing or mistyped fields", () => {
  assert.throws(() => validateRunScriptPayload({}), ValidationError);
  assert.throws(() => validateRunScriptPayload(validPayload({ dataId: { $ne: null } })), ValidationError);
  assert.throws(
    () => validateRunScriptPayload(validPayload({ participantShare: [{ participantId: "org-a", numOfShare: -1 }] })),
    /non-negative/,
  );
});

test("never accepts private keys from the caller", () => {
  const payload = validateRunScriptPayload(
    validPayload({ participantShare: [{ participantId: "org-a", numOfShare: 1, participantWallet: "0xsecret" }] }),
  );
  assert.equal(payload.participantShare[0].participantWallet, undefined);
});

test("resolves wallets by organization id or alias and normalizes shares to 100%", () => {
  const plan = buildPayoutPlan(
    [
      { participantId: "org-a", numOfShare: 1 },
      { participantId: "org-b", numOfShare: 1 },
      { participantId: "http://localhost:3335/", numOfShare: 1 },
    ],
    registry,
  );
  assert.deepEqual(
    plan.map((entry) => [entry.walletAddress, entry.basisPoints]),
    [
      [WALLET_A, 6667],
      [WALLET_B, 3333],
    ],
  );
});

test("fails before any write when a participant has no wallet", () => {
  assert.throws(
    () => buildPayoutPlan([{ participantId: "org-no-wallet", numOfShare: 1 }], registry),
    /No wallet address registered/,
  );
  assert.throws(() => buildPayoutPlan([{ participantId: "unknown", numOfShare: 1 }], registry), ValidationError);
});

test("validates the reward pool", () => {
  const limits = { defaultRewardPool: "1000", maxRewardPool: 5000 };
  assert.equal(parseRewardPool({}, limits).rewardPool, "1000");
  assert.equal(parseRewardPool({ rewardPool: "12.5" }, limits).rewardPoolWei, 12_500_000_000_000_000_000n);
  assert.throws(() => parseRewardPool({ rewardPool: "-1" }, limits), ValidationError);
  assert.throws(() => parseRewardPool({ rewardPool: "999999" }, limits), ValidationError);
});

test("builds provider and consumer trace nodes", () => {
  const payload = validateRunScriptPayload(validPayload());
  const { providerReference, payloads } = buildTraceabilityPayloads(payload, false);
  assert.equal(providerReference, "trace-node:usecase-1:data-1:http://localhost:3335/");
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[1].prevDataId, [providerReference]);
  assert.equal(payloads[1].participantShare, 41);
  assert.equal(buildTraceabilityPayloads(payload, true).payloads.length, 1);
  assert.equal(payloads[0].organizationNames.length, 0, "payload participants have no names here");
  const named = validateRunScriptPayload(
    validPayload({ participantShare: [{ participantId: "org-a", participantName: "Org A", numOfShare: 1 }] }),
  );
  assert.deepEqual(buildTraceabilityPayloads(named, false).payloads[0].organizationNames, [
    { organizationId: "org-a", name: "Org A" },
  ]);
});

test("maps the same event to the same idempotency key", () => {
  const first = buildIdempotencyKey(validateRunScriptPayload(validPayload()));
  const same = buildIdempotencyKey(validateRunScriptPayload(validPayload({ providerUrl: "other" })));
  const different = buildIdempotencyKey(validateRunScriptPayload(validPayload({ dataId: "data-2" })));
  assert.equal(first, same);
  assert.notEqual(first, different);
});

// --- HTTP layer with an in-memory job store ---

const TOKEN = "t".repeat(40);

const createMemoryStore = () => {
  const jobs = new Map();
  return {
    jobs,
    async enqueue({ payload, idempotencyKey, plan }) {
      const existing = [...jobs.values()].find((job) => job.idempotencyKey === idempotencyKey);
      if (existing) return { job: existing, created: false };
      const job = { _id: `job-${jobs.size + 1}`, idempotencyKey, status: "queued", step: "trace", payload, result: { plan } };
      jobs.set(job._id, job);
      return { job, created: true };
    },
    get: async (id) => jobs.get(id) || null,
  };
};

const withServer = async (callback) => {
  const store = createMemoryStore();
  const config = { apiToken: TOKEN, organizationsFile: registryFile, defaultRewardPool: "1000", maxRewardPool: 5000 };
  const server = createApp({ config, store, worker: { wake() {} } }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await callback({ base, store });
  } finally {
    server.close();
  }
};

const post = (base, body, token = TOKEN) =>
  fetch(`${base}/api/run-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

test("requires the bearer token", async () => {
  await withServer(async ({ base, store }) => {
    assert.equal((await post(base, validPayload(), null)).status, 401);
    assert.equal((await post(base, validPayload(), "wrong")).status, 401);
    assert.equal(store.jobs.size, 0);
  });
});

test("accepts an event as a job and deduplicates repeated events", async () => {
  await withServer(async ({ base, store }) => {
    const first = await post(base, validPayload());
    assert.equal(first.status, 202);
    const body = await first.json();
    assert.equal(body.statusUrl, `/api/jobs/${body.jobId}`);

    const repeated = await post(base, validPayload());
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).jobId, body.jobId);
    assert.equal(store.jobs.size, 1);

    const status = await fetch(`${base}${body.statusUrl}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal((await status.json()).status, "queued");
  });
});

test("validates payout participants before creating a job", async () => {
  await withServer(async ({ base, store }) => {
    const response = await post(
      base,
      validPayload({ reachEndFlow: true, participantShare: [{ participantId: "unknown", numOfShare: 1 }] }),
    );
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /No wallet address registered/);
    assert.equal(store.jobs.size, 0);
  });
});
