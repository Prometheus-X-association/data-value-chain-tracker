const express = require('express');
const Data = require('../models/data');
const IncentiveUseCaseMetadata = require('../models/incentiveUseCaseMetadata');
const logger = require('../lib/logger');
const { generateJsonLdData } = require('./generateJsonLdData');
const { updateChildNode } = require('./updateChildNode');
const { fetchNodeTree } = require('./fetchNodeTree');
const {
  attachSessionCookie,
  authenticateCredentials,
  clearLoginFailures,
  clearSessionCookie,
  createSession,
  destroySession,
  expandToAuthorizedHierarchy,
  getSessionFromRequest,
  isLoginThrottled,
  nodeOwnedByOrganization,
  recordLoginFailure,
  requireAuthenticatedSession,
  requireInternalApiToken,
  requireTrustedOrigin,
} = require('../lib/auth');
const {
  buildCanonicalKey,
  buildNodeUrl,
  dedupeIncentives,
  dedupeLinks,
  normalizeString,
} = require('../lib/traceability');
const { validateNodeInput } = require('../lib/validation');
const { findDisplayName } = require('../lib/organizations');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     sessionCookie:
 *       type: apiKey
 *       in: cookie
 *       name: dvct_session
 *     internalToken:
 *       type: apiKey
 *       in: header
 *       name: X-DVCT-Internal-Token
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in as an organization user and receive an HttpOnly session cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Signed in }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many failed attempts }
 * /api/auth/logout:
 *   post:
 *     summary: Sign out and invalidate the session
 *     responses:
 *       204: { description: Signed out }
 * /api/auth/me:
 *   get:
 *     summary: Profile of the signed-in organization user
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: Profile }
 *       401: { description: Authentication required }
 */

/**
 * @swagger
 * /api/node:
 *   post:
 *     summary: Record a traceability event as a JSON-LD node (service-to-service only)
 *     security: [{ internalToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InputData'
 *     responses:
 *       201:
 *         description: Data saved successfully
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Internal authentication required
 */

/**
 * @swagger
 * /api/data/{nodeId}:
 *   get:
 *     summary: Retrieve a JSON-LD node visible to the signed-in organization
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: nodeId, canonicalKey or dataId of the node
 *     responses:
 *       200:
 *         description: JSON-LD data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonLdData'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Node not found
 *   delete:
 *     summary: Delete a node owned by the signed-in organization and unlink it from the graph
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Node not found
 */

/**
 * @swagger
 * /api/data:
 *   get:
 *     summary: Retrieve every JSON-LD node visible to the signed-in organization
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200:
 *         description: Visible JSON-LD nodes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JsonLdData'
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/node-tree/{nodeId}:
 *   get:
 *     summary: Retrieve a node and its visible descendants, with total incentive
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: nodeId, canonicalKey or dataId of the starting node
 *     responses:
 *       200:
 *         description: Hierarchical node data retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Node not found
 */

/**
 * @swagger
 * /api/participant-names:
 *   get:
 *     summary: Display names of the organizations that appear in the signed-in organization's graph
 *     description: Maps organization identifiers (catalog URLs, connector URLs) to the names set in the organization registry. Only identifiers present in the visible graph are returned.
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: "Object of identifier -> display name" }
 *       401: { description: Authentication required }
 */

/**
 * @swagger
 * /api/incentive-use-case-metadata/{useCaseId}:
 *   get:
 *     summary: Participants of an incentive use case (members of the use case only)
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: useCaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Use case metadata }
 *       401: { description: Authentication required }
 *       404: { description: Use case metadata not found }
 */

const sendServerError = (res, error, context) => {
  logger.error(`${context}: ${error.stack || error.message}`);
  res.status(500).json({ error: 'Internal server error' });
};

// Merges reported organization names; the latest report for an organization wins.
const mergeOrganizationNames = (existing = [], incoming = []) => {
  const byId = new Map();
  [...existing, ...incoming].forEach((entry) => {
    const organizationId = normalizeString(entry?.organizationId);
    const name = normalizeString(entry?.name);
    if (organizationId && name) byId.set(organizationId, { organizationId, name });
  });
  return Array.from(byId.values());
};

const buildProviderSeedPayload = (inputData) => ({
  dvctId: inputData.dvctId,
  usecaseContractId: inputData.usecaseContractId,
  usecaseContractTitle: inputData.usecaseContractTitle,
  contractId: inputData.contractId,
  dataId: inputData.dataId,
  participantId: inputData.dataProviderId,
  participantSourceId: inputData.participantSourceId || inputData.currentParticipantId || '',
  // Provider seed nodes must use the provider-side points, not the currently processed
  // consumer node's participantShare.
  participantShare: inputData.incentiveForDataProvider?.numPoints || 0,
  dataProviderId: inputData.dataProviderId,
  dataConsumerId: inputData.dataConsumerId,
  dataConsumerIsAIProvider: false,
  prevDataId: [],
  incentiveForDataProvider: inputData.incentiveForDataProvider,
  extraIncentiveForAIProvider: inputData.extraIncentiveForAIProvider,
});

const isConcurrentWriteError = (error) => error?.code === 11000 || error?.name === 'VersionError';

const findOrCreateProviderNode = async (inputData) => {
  const providerSeedPayload = buildProviderSeedPayload(inputData);
  const providerCanonicalKey = buildCanonicalKey(providerSeedPayload);
  const existingProvider = await Data.findOne({ canonicalKey: providerCanonicalKey });

  if (existingProvider) {
    return existingProvider;
  }

  try {
    return await Data.create({
      ...(await generateJsonLdData(providerSeedPayload)),
      organizationNames: mergeOrganizationNames([], inputData.organizationNames),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Data.findOne({ canonicalKey: providerCanonicalKey });
    }
    throw error;
  }
};

const resolveParentLinks = async (inputData, canonicalKey) => {
  const parentLinks = [];
  const normalizedPrevIds = Array.isArray(inputData.prevDataId)
    ? inputData.prevDataId.filter((prevId) => normalizeString(prevId))
    : [];
  const expectedProviderKey = buildCanonicalKey({
    dataId: inputData.dataId,
    usecaseContractId: inputData.usecaseContractId,
    dvctId: inputData.dvctId,
    participantId: inputData.dataProviderId,
  });

  for (const prevId of normalizedPrevIds) {
    // Parents are referenced by their stable identity only.
    let parentNode = await Data.findOne({ $or: [{ canonicalKey: prevId }, { nodeId: prevId }] });

    const shouldCreateProviderNode =
      !parentNode &&
      normalizeString(inputData.dataProviderId) &&
      (prevId === expectedProviderKey || prevId === inputData.dataProviderId);

    if (shouldCreateProviderNode) {
      parentNode = await findOrCreateProviderNode(inputData);
    }

    if (!parentNode) {
      logger.warn(`Skipping unresolved parent reference ${prevId} for canonical node ${canonicalKey}`);
      continue;
    }

    await updateChildNode(parentNode.nodeId, {
      nodeId: canonicalKey,
      '@nodeUrl': buildNodeUrl(canonicalKey),
    });

    const parentReference = parentNode.canonicalKey || parentNode.nodeId;
    parentLinks.push({ nodeId: parentReference, '@nodeUrl': buildNodeUrl(parentReference) });
  }

  return parentLinks;
};

const upsertTraceNode = async (inputData, canonicalKey) => {
  let traceNode = await Data.findOne({ canonicalKey });

  if (!traceNode) {
    traceNode = new Data(await generateJsonLdData(inputData));
  } else {
    const mergedIncentives = dedupeIncentives([
      ...(traceNode.nodeMetadata?.incentiveReceivedFrom || []),
      {
        organizationId:
          inputData.participantSourceId || inputData.participantId || inputData.dataConsumerId,
        numPoints:
          inputData.participantShare || inputData.extraIncentiveForAIProvider?.numPoints || 0,
        contractId: inputData.contractId,
      },
    ]);

    traceNode.dataId = traceNode.dataId || inputData.dataId;
    traceNode.participantId = traceNode.participantId || inputData.participantId;
    traceNode.participantShare = Math.max(
      Number(traceNode.participantShare || 0),
      Number(inputData.participantShare || 0),
    );
    traceNode.participantSourceId = traceNode.participantSourceId || inputData.participantSourceId;
    traceNode.usecaseContractTitle = traceNode.usecaseContractTitle || inputData.usecaseContractTitle;
    traceNode.nodeMetadata = {
      dvctId: traceNode.nodeMetadata?.dvctId || inputData.dvctId,
      usecaseContractId: traceNode.nodeMetadata?.usecaseContractId || inputData.usecaseContractId,
      dataProviderId: traceNode.nodeMetadata?.dataProviderId || inputData.dataProviderId,
      dataConsumerId: traceNode.nodeMetadata?.dataConsumerId || inputData.dataConsumerId,
      incentiveReceivedFrom: mergedIncentives,
    };
  }

  const parentLinks = await resolveParentLinks(inputData, canonicalKey);
  // JSON-LD compaction drops "@nodeUrl" (it looks like a keyword), so fill in missing URLs here.
  traceNode.organizationNames = mergeOrganizationNames(
    (traceNode.organizationNames || []).map((entry) => ({
      organizationId: entry.organizationId,
      name: entry.name,
    })),
    inputData.organizationNames,
  );
  traceNode.prevNode = dedupeLinks([...(traceNode.prevNode || []), ...parentLinks]).map((link) => ({
    nodeId: link.nodeId,
    '@nodeUrl': link['@nodeUrl'] || buildNodeUrl(link.nodeId),
  }));
  await traceNode.save();
};

// Finds the node a user refers to among the nodes that user may see.
const resolveAuthorizedNode = (authorizedGraph, reference) =>
  authorizedGraph.find((node) => node.nodeId === reference) ||
  authorizedGraph.find((node) => node.canonicalKey === reference) ||
  authorizedGraph.find((node) => node.dataId === reference) ||
  null;

const loadAuthorizedGraph = async (auth) =>
  expandToAuthorizedHierarchy(await Data.find({}).lean(), auth.identifiers);

router.post('/internal/incentive-use-case-metadata', requireInternalApiToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const normalizedUseCaseId = String(payload.useCaseId || '').trim();

    if (!normalizedUseCaseId) {
      return res.status(400).json({ error: 'useCaseId is required' });
    }

    const participants = Array.isArray(payload.participants)
      ? payload.participants.map((participant) => ({
          participantId: String(participant.participantId || '').trim(),
          participantName: String(participant.participantName || '').trim(),
          role: String(participant.role || '').trim(),
          walletAddress: String(participant.walletAddress || '').trim(),
          numOfShare: Number(participant.numOfShare || 0),
        }))
      : [];

    const metadata = await IncentiveUseCaseMetadata.findOneAndUpdate(
      { useCaseId: normalizedUseCaseId },
      {
        $set: {
          useCaseId: normalizedUseCaseId,
          useCaseName: String(payload.useCaseName || '').trim(),
          sourceUseCaseId: String(payload.sourceUseCaseId || '').trim(),
          rewardPool: String(payload.rewardPool || '').trim(),
          participants,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json(metadata);
  } catch (error) {
    return sendServerError(res, error, 'Error saving incentive use case metadata');
  }
});

router.get('/incentive-use-case-metadata/:useCaseId', requireAuthenticatedSession, async (req, res) => {
  try {
    const metadata = await IncentiveUseCaseMetadata.findOne({
      useCaseId: String(req.params.useCaseId || ''),
    }).lean();

    const isMember = (metadata?.participants || []).some((participant) =>
      req.auth.identifiers.includes(participant.participantId),
    );

    // Members only: the metadata links organization identities to wallet addresses.
    if (!metadata || !isMember) {
      return res.status(404).json({ error: 'Use case metadata not found' });
    }

    return res.status(200).json(metadata);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving incentive use case metadata');
  }
});

// Records a traceability event. Only the trace-api (internal token) may write the graph.
router.post('/node', requireInternalApiToken, async (req, res) => {
  const inputData = req.body;
  const validationErrors = validateNodeInput(inputData);

  if (validationErrors.length > 0) {
    return res.status(400).json({ error: 'Invalid node payload', details: validationErrors });
  }

  const canonicalKey = buildCanonicalKey(inputData);
  if (!canonicalKey) {
    return res.status(400).json({ error: 'Missing canonical traceability identity' });
  }

  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await upsertTraceNode(inputData, canonicalKey);
        break;
      } catch (error) {
        // Another request created or updated the same node concurrently: merge again.
        if (!isConcurrentWriteError(error) || attempt >= 3) {
          throw error;
        }
      }
    }

    const savedNode = await Data.findOne({ canonicalKey }).lean();
    return res.status(201).json({ message: 'Data saved successfully', data: savedNode });
  } catch (error) {
    return sendServerError(res, error, 'Error saving node');
  }
});

router.post('/auth/login', requireTrustedOrigin, async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const normalizedUsername = String(username).trim();

  if (isLoginThrottled(req, normalizedUsername)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Try again later.' });
  }

  try {
    const profile = authenticateCredentials(normalizedUsername, String(password));

    if (!profile) {
      recordLoginFailure(req, normalizedUsername);
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearLoginFailures(req, normalizedUsername);
    attachSessionCookie(res, await createSession(profile));
    return res.json({
      username: profile.username,
      organizationId: profile.organizationId,
      displayName: profile.displayName,
    });
  } catch (error) {
    return sendServerError(res, error, 'Error during sign-in');
  }
});

router.post('/auth/logout', requireTrustedOrigin, async (req, res) => {
  try {
    const activeSession = await getSessionFromRequest(req);
    await destroySession(activeSession?.token);
  } catch (error) {
    logger.warn(`Error during sign-out: ${error.message}`);
  }

  clearSessionCookie(res);
  res.status(204).send();
});

router.get('/auth/me', requireAuthenticatedSession, async (req, res) => {
  res.json({
    username: req.auth.username,
    organizationId: req.auth.organizationId,
    displayName: req.auth.displayName,
  });
});

// Names for the identifiers in the caller's visible graph, so the UI can show names instead of URLs.
// The registry's displayName wins; otherwise the name reported with the trace (dataspace catalog).
router.get('/participant-names', requireAuthenticatedSession, async (req, res) => {
  try {
    const identifiers = new Set();
    const reportedNames = new Map();
    (await loadAuthorizedGraph(req.auth)).forEach((node) => {
      (node.organizationNames || []).forEach((entry) => {
        if (entry?.organizationId && entry?.name) reportedNames.set(entry.organizationId, entry.name);
      });
      [
        node.participantId,
        node.participantSourceId,
        node.nodeMetadata?.dataProviderId,
        node.nodeMetadata?.dataConsumerId,
        ...(node.nodeMetadata?.incentiveReceivedFrom || []).map((incentive) => incentive.organizationId),
      ]
        .filter(Boolean)
        .forEach((identifier) => identifiers.add(identifier));
    });

    const names = {};
    identifiers.forEach((identifier) => {
      const name = findDisplayName(identifier) || reportedNames.get(identifier);
      if (name) names[identifier] = name;
    });
    res.json(names);
  } catch (error) {
    sendServerError(res, error, 'Error retrieving participant names');
  }
});

router.get('/data/:nodeId', requireAuthenticatedSession, async (req, res) => {
  try {
    const node = resolveAuthorizedNode(await loadAuthorizedGraph(req.auth), req.params.nodeId);
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    return res.json(node);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving node');
  }
});

// Deletes a node owned by the caller's organization and removes every link pointing to it.
router.delete('/data/:nodeId', requireAuthenticatedSession, requireTrustedOrigin, async (req, res) => {
  try {
    const node = resolveAuthorizedNode(await loadAuthorizedGraph(req.auth), req.params.nodeId);

    if (!node || !nodeOwnedByOrganization(node, req.auth.identifiers)) {
      return res.status(404).json({ message: 'Node not found' });
    }

    const references = [node.nodeId, node.canonicalKey].filter(Boolean);
    await Data.updateMany(
      { $or: [{ 'childNode.nodeId': { $in: references } }, { 'prevNode.nodeId': { $in: references } }] },
      { $pull: { childNode: { nodeId: { $in: references } }, prevNode: { nodeId: { $in: references } } } },
    );
    await Data.deleteOne({ _id: node._id });

    logger.info(`Node ${node.nodeId} deleted by ${req.auth.username} (${req.auth.organizationId})`);
    return res.json({ message: 'Node deleted successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Error deleting node');
  }
});

router.get('/data', requireAuthenticatedSession, async (req, res) => {
  try {
    res.json(await loadAuthorizedGraph(req.auth));
  } catch (error) {
    sendServerError(res, error, 'Error retrieving nodes');
  }
});

// Lookup used by the trace-api. Requires a filter so the whole graph is never dumped.
router.get('/internal/data', requireInternalApiToken, async (req, res) => {
  const canonicalKey = normalizeString(req.query.canonicalKey);
  const dataId = normalizeString(req.query.dataId);

  if (!canonicalKey && !dataId) {
    return res.status(400).json({ error: 'canonicalKey or dataId query parameter is required' });
  }

  try {
    const filter = canonicalKey ? { canonicalKey } : { dataId };
    res.json(await Data.find(filter).limit(500).lean());
  } catch (error) {
    sendServerError(res, error, 'Error retrieving internal node data');
  }
});

router.get('/node-tree/:nodeId', requireAuthenticatedSession, async (req, res) => {
  try {
    const authorizedGraph = await loadAuthorizedGraph(req.auth);
    const requestedNode = resolveAuthorizedNode(authorizedGraph, req.params.nodeId);

    if (!requestedNode) {
      return res.status(404).json({ message: 'Node not found' });
    }

    const allowedNodeIds = new Set(authorizedGraph.map((node) => node.nodeId));
    const nodeTree = await fetchNodeTree(requestedNode.nodeId, { allowedNodeIds });
    if (!nodeTree) {
      return res.status(404).json({ message: 'Node not found' });
    }
    return res.json(nodeTree);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving node tree');
  }
});

module.exports = router;
