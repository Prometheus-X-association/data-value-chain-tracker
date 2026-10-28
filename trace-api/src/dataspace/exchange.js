import { SourceError } from "./http.js";
import { ValidationError, buildPayoutPlan, parseRewardPool } from "../validation.js";

export const REWARD_POOL_PARAM = "dvctRewardPool";
export const WEIGHTS_PARAM = "dvctWeights";

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const FAILED_STATUS = /ERROR|FAIL/i;
const CACHE_TTL_MS = 10 * 60 * 1000;

const lastSegment = (url) => String(url || "").replace(/\/+$/, "").split("/").pop();

export const isDataExchangeId = (value) => OBJECT_ID.test(String(value || ""));

/** Reads connector, contract manager and catalog documents through the safe fetcher. */
export const createDataspaceClient = ({ safeFetch, config }) => {
  const cache = new Map();
  const cached = async (key, load) => {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    const value = await load();
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  };

  return {
    async getDataExchange(connectorBase, id) {
      const body = await safeFetch(
        `${connectorBase}/dataexchanges/${encodeURIComponent(id)}`,
        config.connectorDomains,
        "data exchange",
      );
      const content = body?.content ?? body;
      if (!content || typeof content !== "object" || String(content._id) !== String(id)) {
        throw new SourceError(`data exchange: connector did not return data exchange ${id}`);
      }
      return content;
    },

    // Contracts are not cached: their status or membership can change.
    getContract: (url) => safeFetch(url, config.contractDomains, "contract"),

    getEcosystem: (url) => cached(`eco:${url}`, () => safeFetch(url, config.catalogDomains, "ecosystem")),

    // Only the public identity is kept (catalog participant documents also carry connector keys).
    getParticipant: (url) =>
      cached(`participant:${url}`, async () => {
        const participant = await safeFetch(url, config.catalogDomains, "participant");
        return { legalName: String(participant?.legalName || "").slice(0, 256) };
      }),

    // Display name of a data resource (only the name is kept).
    getResourceName: (url) =>
      cached(`resource:${url}`, async () => {
        try {
          const resource = await safeFetch(url, config.catalogDomains, "data resource");
          return String(resource?.name || "").slice(0, 256);
        } catch {
          return "";
        }
      }),

    // A service offering is the DVCT service itself when one of its software resources declares the
    // DVCT incentive parameters, or when it is listed in DVCT_SERVICE_OFFERINGS.
    isDvctService: (offeringUrl) =>
      cached(`dvct:${offeringUrl}`, async () => {
        if ((config.dvctServiceOfferings || []).some((id) => id && (offeringUrl === id || lastSegment(offeringUrl) === id))) {
          return true;
        }
        try {
          const offering = await safeFetch(offeringUrl, config.catalogDomains, "service offering");
          for (const resourceUrl of (offering?.aggregationOf || []).slice(0, 10)) {
            const resource = await safeFetch(String(resourceUrl), config.catalogDomains, "software resource");
            const declared = resource?.representation?.queryParams || [];
            if (declared.includes(REWARD_POOL_PARAM) || declared.includes(WEIGHTS_PARAM)) {
              return true;
            }
          }
        } catch {
          // Unknown offering: treat it as a regular service.
        }
        return false;
      }),
  };
};

export const resolveConnector = (requested, config) => {
  const connector = String(requested || config.defaultConnector || "").replace(/\/+$/, "");
  if (!connector) {
    throw new ValidationError("No connector given and PDC_DEFAULT_CONNECTOR is not configured");
  }
  return connector;
};

/**
 * Collects the `params.query` entries of a data exchange ([{ key: value }, ...]) from every place
 * the connector stores them. The same key with two different values is ambiguous and rejected.
 */
export const extractQueryParams = (exchange) => {
  const lists = [
    ...(exchange.purposes || []).map((entry) => entry?.params?.query),
    ...(exchange.serviceChainParams || []).map((entry) => entry?.params?.query),
    ...(exchange.resources || []).map((entry) => entry?.params?.query),
    exchange.providerParams?.query,
    exchange.consumerParams?.query,
  ];

  const values = new Map();
  for (const list of lists) {
    for (const entry of Array.isArray(list) ? list : []) {
      for (const [key, value] of Object.entries(entry && typeof entry === "object" ? entry : {})) {
        const normalized = String(value ?? "").trim();
        if (values.has(key) && values.get(key) !== normalized) {
          throw new ValidationError(`Query parameter "${key}" has conflicting values in the data exchange`);
        }
        values.set(key, normalized);
      }
    }
  }
  return values;
};

/**
 * Parses dvctWeights. Accepted formats:
 *   "<participantId>:<weight>,..."  (catalog participant id or full participant URL)
 *   "<weight>,<weight>,..."         (one weight per distinct participant, in order of first
 *                                   appearance in the chain)
 * Participants that are not listed get weight 0.
 */
export const parseWeights = (raw, participants) => {
  const entries = String(raw).split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new ValidationError(`${WEIGHTS_PARAM} is empty`);
  }

  const toWeight = (value, label) => {
    const weight = Number(value);
    if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(weight)) {
      throw new ValidationError(`${WEIGHTS_PARAM}: invalid weight "${value}" for ${label}`);
    }
    return weight;
  };

  const weights = new Map(participants.map((url) => [url, 0]));

  if (entries.every((entry) => !entry.includes(":"))) {
    if (entries.length !== participants.length) {
      throw new ValidationError(
        `${WEIGHTS_PARAM}: ${entries.length} positional weights given for ${participants.length} chain participants`,
      );
    }
    participants.forEach((url, index) => weights.set(url, toWeight(entries[index], url)));
    return weights;
  }

  for (const entry of entries) {
    const separator = entry.lastIndexOf(":");
    if (separator <= 0) {
      throw new ValidationError(`${WEIGHTS_PARAM}: expected "<participantId>:<weight>", got "${entry}"`);
    }
    const reference = entry.slice(0, separator).trim();
    const id = lastSegment(reference);
    const participant = participants.find((url) => url === reference || lastSegment(url) === id);
    if (!participant) {
      throw new ValidationError(`${WEIGHTS_PARAM}: participant "${reference}" is not part of this service chain`);
    }
    weights.set(participant, toWeight(entry.slice(separator + 1).trim(), reference));
  }
  return weights;
};

const flattenPre = (pre) => (Array.isArray(pre) ? pre.flat(Infinity) : []).filter((entry) => entry?.participant);

/**
 * Steps of the executed service chain, in order. Each step takes its input from the steps listed
 * in its `pre` dependencies (matched by participant and service), or else from the previous step.
 * A participant can appear in several steps; every step becomes its own node in the graph, so a
 * chain such as A -> B -> A stays a path and never turns into a cycle.
 */
export const buildChainSteps = (services) =>
  services.map((service, index) => {
    const sources = [];
    for (const dependency of flattenPre(service.pre)) {
      for (let earlier = index - 1; earlier >= 0; earlier--) {
        const candidate = services[earlier];
        if (
          candidate.participant === dependency.participant &&
          (!dependency.service || candidate.service === dependency.service)
        ) {
          if (!sources.includes(earlier)) sources.push(earlier);
          break;
        }
      }
    }
    if (sources.length === 0 && index > 0) sources.push(index - 1);
    return { index, participant: String(service.participant), sources };
  });

// Signature values used by contract managers for a member that signed.
const SIGNED_STATES = new Set(["signed", "hassigned"]);

/**
 * Resolves a data exchange into everything the trace and payout need, and checks it against the
 * signed contract so that a tampered connector record cannot invent participants.
 */
export const resolveDataExchange = async (client, { dataExchangeId, connector }) => {
  if (!isDataExchangeId(dataExchangeId)) {
    throw new ValidationError("dataExchangeId must be a 24-character hexadecimal id");
  }

  const exchange = await client.getDataExchange(connector, dataExchangeId);
  if (FAILED_STATUS.test(String(exchange.status || ""))) {
    throw new ValidationError(`Data exchange ${dataExchangeId} has status ${exchange.status}`);
  }

  // The consumer-side record points to the provider-side one: both describe the same exchange.
  const providerDataExchangeId = String(exchange.providerDataExchange || exchange._id);
  const chainId = String(exchange.serviceChain?.catalogId || "");
  const services = Array.isArray(exchange.serviceChain?.services) ? exchange.serviceChain.services : [];
  if (!isDataExchangeId(chainId) || services.length < 2) {
    throw new ValidationError("The data exchange is not part of a service chain with at least two services");
  }

  const contract = await client.getContract(String(exchange.contract || ""));
  if (String(contract?.status) !== "signed") {
    throw new ValidationError(`Contract ${lastSegment(exchange.contract)} is not signed`);
  }
  const contractChain = (contract.serviceChains || []).find(
    (chain) => String(chain.catalogId) === chainId || String(chain.serviceChainId) === chainId,
  );
  if (!contractChain) {
    throw new ValidationError(`Service chain ${chainId} is not part of contract ${contract._id}`);
  }

  const revoked = new Set(
    (contract.revokedMembers || []).map((member) => String(member?.participant ?? member)),
  );
  const signedMembers = new Map(
    (contract.members || [])
      .filter((member) => SIGNED_STATES.has(String(member?.signature || "").toLowerCase()))
      .filter((member) => !revoked.has(String(member.participant)))
      .map((member) => [String(member.participant), String(member.role || "participant")]),
  );
  if (contract.orchestrator && !signedMembers.has(contract.orchestrator) && !revoked.has(contract.orchestrator)) {
    signedMembers.set(String(contract.orchestrator), "orchestrator");
  }

  const participantUrls = [];
  for (const service of services) {
    for (const url of [service.participant, ...flattenPre(service.pre).map((entry) => entry.participant)]) {
      if (!signedMembers.has(String(url))) {
        throw new ValidationError(`Participant ${url} is not a signed member of contract ${contract._id}`);
      }
      if (!participantUrls.includes(url)) participantUrls.push(url);
    }
  }

  const ecosystem = await client.getEcosystem(String(contract.ecosystem || ""));
  const chainName =
    (ecosystem.serviceChains || []).find((chain) => String(chain._id) === chainId)?.name || chainId;

  const participants = [];
  for (const url of participantUrls) {
    const { legalName } = await client.getParticipant(url);
    participants.push({
      url,
      legalName: legalName || lastSegment(url),
      catalogName: legalName || "",
      role: signedMembers.get(url),
    });
  }

  // Data sources of the exchange: each input data resource and the chain step that provides it.
  const inputResources = [];
  for (const entry of Array.isArray(exchange.resources) ? exchange.resources : []) {
    const resourceUrl = String(entry?.resource || "");
    if (!resourceUrl || inputResources.some((resource) => resource.url === resourceUrl)) continue;
    const providerIndex = services.findIndex((service) => service.service && service.service === entry.serviceOffering);
    inputResources.push({
      url: resourceUrl,
      stepIndex: providerIndex >= 0 ? providerIndex : 0,
      name: await client.getResourceName(resourceUrl),
    });
  }

  const steps = buildChainSteps(services);
  for (const step of steps) {
    step.resources = inputResources.filter((resource) => resource.stepIndex === step.index);
    step.isDvct = false;
  }
  // Only the last step of the chain can be the DVCT service (the step that calls this API).
  const lastStep = steps[steps.length - 1];
  const lastService = String(services[lastStep.index].service || "");
  lastStep.isDvct = Boolean(lastService) && lastStep.index > 0 && (await client.isDvctService(lastService));

  return {
    dataExchangeId: String(exchange._id),
    providerDataExchangeId,
    connector,
    status: String(exchange.status || ""),
    completed: services.every((service) => service.completed === true),
    contractId: String(contract._id),
    chainId,
    chainName,
    ecosystemName: String(ecosystem.name || ""),
    participants,
    steps,
    params: extractQueryParams(exchange),
  };
};

export const isExchangeComplete = (exchange) =>
  String(exchange.status) === "IMPORT_SUCCESS" &&
  (exchange.serviceChain?.services || []).every((service) => service.completed === true);

/**
 * Turns a resolved exchange into a trace-api job: a traceability node per chain step and, when the
 * exchange carries dvctRewardPool and dvctWeights, the payout plan.
 */
export const buildExchangeJob = (resolved, { registry, config, reachEndFlow = true }) => {
  const rewardPoolValue = resolved.params.get(REWARD_POOL_PARAM);
  const weightsValue = resolved.params.get(WEIGHTS_PARAM);
  const participantUrls = resolved.participants.map((participant) => participant.url);

  if (Boolean(rewardPoolValue) !== Boolean(weightsValue)) {
    throw new ValidationError(`${REWARD_POOL_PARAM} and ${WEIGHTS_PARAM} must be set together`);
  }

  const weights = weightsValue ? parseWeights(weightsValue, participantUrls) : new Map();
  const participantShare = resolved.participants.map((participant) => ({
    participantId: participant.url,
    participantName: participant.legalName,
    role: participant.role,
    numOfShare: weights.get(participant.url) || 0,
  }));

  let plan = null;
  if (reachEndFlow && rewardPoolValue) {
    const { rewardPool, rewardPoolWei } = parseRewardPool({ rewardPool: rewardPoolValue }, config);
    plan = {
      rewardPool,
      rewardPoolWei: rewardPoolWei.toString(),
      participants: buildPayoutPlan(participantShare, registry),
      walletByParticipant: participantShare.map((participant) => [
        participant.participantId,
        registry.resolve(participant.participantId)?.walletAddress || "",
      ]),
    };
  }

  const title = [resolved.ecosystemName, resolved.chainName].filter(Boolean).join(" – ");
  const weightOf = (url) => weights.get(url) || 0;
  // Catalog names travel with the trace, so the UI can name organizations missing from the registry.
  const organizationNames = resolved.participants
    .filter((participant) => participant.catalogName)
    .map((participant) => ({ organizationId: participant.url, name: participant.catalogName }));

  const nodes = buildTraceNodes(resolved, { title, weightOf, organizationNames });

  const common = {
    dvctId: resolved.providerDataExchangeId,
    contractId: resolved.contractId,
    useCaseContractTitle: title,
    dataId: resolved.providerDataExchangeId,
    useCaseId: resolved.chainId,
    participantShare,
  };

  return {
    plan,
    payload: {
      kind: "dataExchange",
      ...common,
      // One payout per data exchange: the on-chain use case is the chain plus the exchange.
      useCaseName: `${resolved.chainId}:${resolved.providerDataExchangeId}`,
      useCaseDisplayName: resolved.chainName,
      reachEndFlow: Boolean(plan),
      dataExchange: {
        id: resolved.dataExchangeId,
        providerId: resolved.providerDataExchangeId,
        connector: resolved.connector,
      },
      // Traceability nodes, in chain order (parents before children).
      nodes,
      hops: nodes.flatMap((node) =>
        node.prevDataId.map((parentKey) => ({
          from: nodes.find((candidate) => nodeKeyOf(candidate) === parentKey)?.participantId || parentKey,
          to: node.participantId,
        })),
      ),
    },
  };
};

// Canonical key the core API derives for a node (kept in sync with app/express-server traceability.js).
export const nodeKeyOf = (node) =>
  node.nodeScope === "data-source"
    ? `trace-source:${node.dataId}:${node.participantId}`
    : `trace-node:${node.usecaseContractId}:${node.dataId}:${node.participantId}`;

/**
 * Traceability nodes of one data exchange, parents before children:
 * - the step that provides the input data becomes one data-source node per input data resource.
 *   Data-source nodes do not depend on the chain, use case or exchange, so every exchange using
 *   the same data resource branches off the same node (parallel ramifications);
 * - every other step becomes one node per service chain and step, linked to the steps it receives
 *   data from; repeated runs of the same chain reuse these nodes;
 * - the DVCT service (the chain's last step, see resolveDataExchange) is not recorded;
 * - an organization's points are carried by its first node in chain order only.
 */
export const buildTraceNodes = (resolved, { title, weightOf, organizationNames }) => {
  const { steps } = resolved;
  const pointsGiven = new Set();
  const pointsFor = (participant) => {
    if (pointsGiven.has(participant)) return 0;
    pointsGiven.add(participant);
    return weightOf(participant);
  };

  // Skips DVCT steps when following a step's inputs.
  const inputsOf = (step) =>
    step.sources.flatMap((index) => (steps[index].isDvct ? inputsOf(steps[index]) : [index]));

  const keysByStep = new Map();
  const nodes = [];
  const base = {
    dvctId: resolved.providerDataExchangeId,
    usecaseContractId: resolved.chainId,
    contractId: resolved.contractId,
    organizationNames,
  };
  const nextParticipant = (index) => steps.find((step) => step.index > index && !step.isDvct)?.participant;

  for (const step of steps) {
    if (step.isDvct) continue;

    if (step.resources.length > 0 && inputsOf(step).length === 0) {
      const keys = [];
      for (const resource of step.resources) {
        const points = pointsFor(step.participant);
        const node = {
          ...base,
          nodeScope: "data-source",
          usecaseContractTitle: resource.name || title,
          dataId: resource.url,
          participantId: step.participant,
          participantSourceId: step.participant,
          participantShare: points,
          dataProviderId: step.participant,
          dataConsumerId: nextParticipant(step.index) || step.participant,
          dataConsumerIsAIProvider: false,
          prevDataId: [],
          incentiveForDataProvider: { numPoints: points, factor: 1, factorCheck: true },
          extraIncentiveForAIProvider: { numPoints: points, factor: 1, factorCheck: true },
        };
        nodes.push(node);
        keys.push(nodeKeyOf(node));
      }
      keysByStep.set(step.index, keys);
      continue;
    }

    const inputs = inputsOf(step);
    const points = pointsFor(step.participant);
    const provider = inputs.length > 0 ? steps[inputs[0]].participant : step.participant;
    const node = {
      ...base,
      usecaseContractTitle: title,
      // Identified by chain and step, not by exchange: re-running the same service chain updates
      // the same nodes (execution count, points) instead of adding a parallel sequence.
      dataId: `step-${step.index}`,
      participantId: step.participant,
      participantSourceId: step.participant,
      participantShare: points,
      dataProviderId: provider,
      dataConsumerId: inputs.length > 0 ? step.participant : nextParticipant(step.index) || step.participant,
      dataConsumerIsAIProvider: inputs.length > 0,
      prevDataId: inputs.flatMap((index) => keysByStep.get(index) || []),
      incentiveForDataProvider: { numPoints: 0, factor: 1, factorCheck: true },
      extraIncentiveForAIProvider: { numPoints: points, factor: 1, factorCheck: true },
    };
    nodes.push(node);
    keysByStep.set(step.index, [nodeKeyOf(node)]);
  }

  return nodes;
};
