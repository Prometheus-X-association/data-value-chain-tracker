const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const buildParticipantKey = ({ nodeScope, dataId, useCaseId, dvctId, participantId }) => {
  if (nodeScope === 'data-source' && dataId && participantId) {
    return `trace-source:${dataId}:${participantId}`;
  }

  if (dataId && useCaseId && participantId) {
    return `trace-node:${useCaseId}:${dataId}:${participantId}`;
  }

  if (dataId && dvctId && participantId) {
    return `trace-node:${dvctId}:${dataId}:${participantId}`;
  }

  return dataId && participantId ? `trace-node:${dataId}:${participantId}` : '';
};

const buildRelationshipKey = ({ dataId, useCaseId, dvctId, providerId, consumerId }) => {
  const organizations = providerId || consumerId;

  if (dataId && useCaseId && organizations) {
    return `trace:${useCaseId}:${dataId}:${providerId || 'unknown'}:${consumerId || 'unknown'}`;
  }

  if (dataId && dvctId && organizations) {
    return `trace:${dvctId}:${dataId}:${providerId || 'unknown'}:${consumerId || 'unknown'}`;
  }

  return '';
};

const buildFallbackKey = ({ dataId, useCaseId, dvctId, nodeId }) => {
  if (dataId && useCaseId) {
    return `trace:${useCaseId}:${dataId}`;
  }

  if (dataId) {
    return `data:${dataId}`;
  }

  if (useCaseId) {
    return `usecase:${useCaseId}`;
  }

  if (dvctId) {
    return `dvct:${dvctId}`;
  }

  return nodeId ? `node:${nodeId}` : '';
};

const buildCanonicalKey = (node) => {
  const normalized = {
    nodeScope: node.nodeScope,
    dataId: normalizeString(node.dataId),
    useCaseId: normalizeString(node.usecaseContractId),
    dvctId: normalizeString(node.dvctId),
    participantId: normalizeString(node.participantId),
    providerId: normalizeString(node.dataProviderId),
    consumerId: normalizeString(node.dataConsumerId),
    nodeId: normalizeString(node.nodeId),
  };

  // A data source is one node per data resource and provider, shared by every use case, service
  // chain and exchange that uses it, so its branches show up side by side.
  return (
    buildParticipantKey(normalized) ||
    buildRelationshipKey(normalized) ||
    buildFallbackKey(normalized)
  );
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
    // Points are counted per exchange (dvctId): a shared data source sums the points of every
    // exchange that used it, while repeating the same exchange does not add them twice.
    const key = [
      normalizeString(incentive.organizationId),
      normalizeString(incentive.contractId),
      normalizeString(incentive.dvctId),
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

// Resolvable URL of a node in the core API (JSON-LD @id of a link). Must be absolute:
// JSON-LD compaction drops relative IRIs.
const buildNodeUrl = (nodeReference) => {
  const baseUrl = (process.env.DVCT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${baseUrl}/api/data/${encodeURIComponent(nodeReference)}`;
};

module.exports = {
  buildCanonicalKey,
  buildNodeUrl,
  buildNodeType,
  dedupeIncentives,
  dedupeLinks,
  normalizeString,
};
