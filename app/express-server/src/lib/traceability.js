const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const buildCanonicalKey = ({
  dataId,
  usecaseContractId,
  dvctId,
  participantId,
  dataProviderId,
  dataConsumerId,
  nodeId,
}) => {
  const normalizedDataId = normalizeString(dataId);
  const normalizedUseCase = normalizeString(usecaseContractId);
  const normalizedDvctId = normalizeString(dvctId);
  const normalizedParticipantId = normalizeString(participantId);
  const normalizedProvider = normalizeString(dataProviderId);
  const normalizedConsumer = normalizeString(dataConsumerId);
  const normalizedNodeId = normalizeString(nodeId);

  if (normalizedDataId && normalizedUseCase && normalizedParticipantId) {
    return `trace-node:${normalizedUseCase}:${normalizedDataId}:${normalizedParticipantId}`;
  }

  if (normalizedDataId && normalizedDvctId && normalizedParticipantId) {
    return `trace-node:${normalizedDvctId}:${normalizedDataId}:${normalizedParticipantId}`;
  }

  if (normalizedDataId && normalizedParticipantId) {
    return `trace-node:${normalizedDataId}:${normalizedParticipantId}`;
  }

  if (normalizedDataId && normalizedUseCase && (normalizedProvider || normalizedConsumer)) {
    return `trace:${normalizedUseCase}:${normalizedDataId}:${normalizedProvider || 'unknown'}:${normalizedConsumer || 'unknown'}`;
  }

  if (normalizedDataId && normalizedDvctId && (normalizedProvider || normalizedConsumer)) {
    return `trace:${normalizedDvctId}:${normalizedDataId}:${normalizedProvider || 'unknown'}:${normalizedConsumer || 'unknown'}`;
  }

  if (normalizedDataId && normalizedUseCase) {
    return `trace:${normalizedUseCase}:${normalizedDataId}`;
  }

  if (normalizedDataId) {
    return `data:${normalizedDataId}`;
  }

  if (normalizedUseCase) {
    return `usecase:${normalizedUseCase}`;
  }

  if (normalizedDvctId) {
    return `dvct:${normalizedDvctId}`;
  }

  if (normalizedNodeId) {
    return `node:${normalizedNodeId}`;
  }

  return '';
};

const buildNodeType = ({ prevDataId, dataConsumerIsAIProvider, usecaseContractId }) => {
  const hasParents = Array.isArray(prevDataId) && prevDataId.filter(Boolean).length > 0;

  if (!hasParents) {
    return 'raw_data';
  }

  if (dataConsumerIsAIProvider) {
    return 'ai_processing';
  }

  if (normalizeString(usecaseContractId)) {
    return 'use_case_step';
  }

  return 'linked_data';
};

const dedupeIncentives = (incentives = []) => {
  const seen = new Set();

  return incentives.filter((incentive) => {
    const key = [
      normalizeString(incentive.organizationId),
      normalizeString(incentive.contractId),
      Number(incentive.numPoints || 0),
    ].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const dedupeLinks = (links = []) => {
  const seen = new Set();

  return links.filter((link) => {
    const nodeId = normalizeString(link.nodeId);

    if (!nodeId || seen.has(nodeId)) {
      return false;
    }

    seen.add(nodeId);
    return true;
  });
};

module.exports = {
  buildCanonicalKey,
  buildNodeType,
  dedupeIncentives,
  dedupeLinks,
  normalizeString,
};
