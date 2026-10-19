// Records a data-exchange event in the core API traceability graph.

const buildParticipantNodeReference = (body, participantId) => {
  const useCaseId = body.useCaseId || body.usecaseContractId || body.contractId || body.dvctId;

  if (body.dataId && useCaseId && participantId) {
    return `trace-node:${useCaseId}:${body.dataId}:${participantId}`;
  }
  if (body.dataId && body.dvctId && participantId) {
    return `trace-node:${body.dvctId}:${body.dataId}:${participantId}`;
  }
  if (body.dataId && participantId) {
    return `trace-node:${body.dataId}:${participantId}`;
  }
  return participantId || "";
};

export const buildTraceabilityPayloads = (body, providerExists) => {
  const shareById = new Map(body.participantShare.map((participant) => [participant.participantId, participant]));
  const providerShare = shareById.get(body.currentParticipantId)?.numOfShare || 0;
  const consumerShare = shareById.get(body.nextParticipantId)?.numOfShare || 0;
  const providerReference = buildParticipantNodeReference(body, body.dataProviderId);

  const organizationNames = body.participantShare
    .filter((participant) => participant.participantName)
    .map((participant) => ({ organizationId: participant.participantId, name: participant.participantName }));

  const common = {
    organizationNames,
    dvctId: body.dvctId,
    usecaseContractId: body.useCaseId,
    usecaseContractTitle: body.useCaseContractTitle,
    contractId: body.contractId,
    dataId: body.dataId,
    dataProviderId: body.dataProviderId,
    dataConsumerId: body.dataConsumerId,
  };
  const payloads = [];

  if (!providerExists) {
    payloads.push({
      ...common,
      participantId: body.dataProviderId,
      participantSourceId: body.currentParticipantId,
      participantShare: providerShare,
      dataConsumerIsAIProvider: false,
      prevDataId: [],
      incentiveForDataProvider: { numPoints: providerShare, factor: 1, factorCheck: true },
      extraIncentiveForAIProvider: { numPoints: providerShare, factor: 1, factorCheck: true },
    });
  }

  payloads.push({
    ...common,
    participantId: body.dataConsumerId,
    participantSourceId: body.nextParticipantId,
    participantShare: consumerShare,
    dataConsumerIsAIProvider: true,
    prevDataId: providerReference ? [providerReference] : [],
    incentiveForDataProvider: { numPoints: providerShare, factor: 1, factorCheck: true },
    extraIncentiveForAIProvider: { numPoints: consumerShare, factor: 1, factorCheck: true },
  });

  return { providerReference, payloads };
};

export const createCoreApiClient = ({ coreApiUrl, internalApiToken }) => {
  const call = async (method, path, body) => {
    const response = await fetch(`${coreApiUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-DVCT-Internal-Token": internalApiToken },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const error = new Error(`core-api ${method} ${path} answered ${response.status}`);
      error.retryable = response.status >= 500;
      throw error;
    }
    return response.json();
  };

  return {
    nodeExists: async (canonicalKey) =>
      (await call("GET", `/api/internal/data?canonicalKey=${encodeURIComponent(canonicalKey)}`)).length > 0,
    postNode: (payload) => call("POST", "/api/node", payload),
    saveUseCaseMetadata: (payload) => call("POST", "/api/internal/incentive-use-case-metadata", payload),
  };
};

// Idempotent: the core API merges events with the same canonical identity.
export const recordTraceability = async (coreApi, body) => {
  const { providerReference } = buildTraceabilityPayloads(body, true);
  const providerExists = providerReference ? await coreApi.nodeExists(providerReference) : false;
  const { payloads } = buildTraceabilityPayloads(body, providerExists);

  const canonicalKeys = [];
  for (const payload of payloads) {
    const response = await coreApi.postNode(payload);
    canonicalKeys.push(response?.data?.canonicalKey);
  }
  return canonicalKeys.filter(Boolean);
};

// Records the traceability nodes of a data exchange, parents first. The core API merges events
// with the same canonical identity, so repeating this is safe.
export const recordExchangeNodes = async (coreApi, nodes) => {
  const canonicalKeys = [];
  for (const node of nodes) {
    const response = await coreApi.postNode(node);
    if (response?.data?.canonicalKey) canonicalKeys.push(response.data.canonicalKey);
  }
  return canonicalKeys;
};
