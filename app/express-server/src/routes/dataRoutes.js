const express = require('express');
const winston = require("winston");
const Data = require('../models/data'); 
const { generateJsonLdData } = require('./generateJsonLdData');
const { updateChildNode } = require('./updateChildNode');
const { updateChildPrevNode } = require('./updateChildPrevNode');
const { fetchNodeTree } = require('./fetchNodeTree'); // Ensure this function is available
const {
  buildCanonicalKey,
  dedupeIncentives,
  dedupeLinks,
  normalizeString,
} = require('../lib/traceability');
const router = express.Router();

/**
 * @swagger
 * /api/node:
 *   post:
 *     summary: Post node data and save as JSON-LD format to MongoDB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InputData'
 *     responses:
 *       201:
 *         description: Data saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/JsonLdData'
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/data/{nodeId}:
 *   get:
 *     summary: Retrieve JSON-LD data based on nodeId
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The nodeId of the data to retrieve
 *     responses:
 *       200:
 *         description: JSON-LD data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonLdData'
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/data/{nodeId}:
 *   delete:
 *     summary: Deletes JSON-LD data based on nodeId
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The nodeId of the data to delete
 *     responses:
 *       200:
 *         description: JSON-LD data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonLdData'
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/data:
 *   get:
 *     summary: Retrieve all JSON-LD data
 *     responses:
 *       200:
 *         description: All JSON-LD data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JsonLdData'
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/node-tree/{nodeId}:
 *   get:
 *     summary: Retrieve node and all connected child and grandchild nodes
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The nodeId of the starting node
 *     responses:
 *       200:
 *         description: Hierarchical node data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonLdData'
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */


const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/ServerApp.log" }),
  ],
});

const buildProviderSeedPayload = (inputData) => ({
  dvctId: inputData.dvctId,
  usecaseContractId: inputData.usecaseContractId,
  usecaseContractTitle: inputData.usecaseContractTitle,
  contractId: inputData.contractId,
  dataId: inputData.dataId,
  participantId: inputData.dataProviderId,
  participantSourceId: inputData.participantSourceId || inputData.currentParticipantId || '',
  participantShare:
    inputData.participantShare ||
    inputData.incentiveForDataProvider?.numPoints ||
    0,
  dataProviderId: inputData.dataProviderId,
  dataConsumerId: inputData.dataConsumerId,
  dataConsumerIsAIProvider: false,
  prevDataId: [],
  incentiveForDataProvider: inputData.incentiveForDataProvider,
  extraIncentiveForAIProvider: inputData.extraIncentiveForAIProvider,
});

// API to receive JSON data and save as JSON-LD format to MongoDB
router.post('/node', async (req, res) => {
  try {
    const inputData = req.body;
    const canonicalKey = buildCanonicalKey(inputData);

    if (!canonicalKey) {
      return res.status(400).json({ error: 'Missing canonical traceability identity' });
    }

    let traceNode = await Data.findOne({ canonicalKey });

    if (!traceNode) {
      const jsonLdData = await generateJsonLdData(inputData);
      traceNode = new Data(jsonLdData);
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
      traceNode.participantSourceId =
        traceNode.participantSourceId || inputData.participantSourceId;
      traceNode.usecaseContractTitle =
        traceNode.usecaseContractTitle || inputData.usecaseContractTitle;
      traceNode.nodeMetadata = {
        dvctId: traceNode.nodeMetadata?.dvctId || inputData.dvctId,
        usecaseContractId:
          traceNode.nodeMetadata?.usecaseContractId || inputData.usecaseContractId,
        dataProviderId:
          traceNode.nodeMetadata?.dataProviderId || inputData.dataProviderId,
        dataConsumerId:
          traceNode.nodeMetadata?.dataConsumerId || inputData.dataConsumerId,
        incentiveReceivedFrom: mergedIncentives,
      };
    }

    const parentLinks = [];
    const normalizedPrevIds = Array.isArray(inputData.prevDataId)
      ? inputData.prevDataId.filter((prevId) => normalizeString(prevId))
      : [];

    for (const prevId of normalizedPrevIds) {
      let parentNode = await Data.findOne({
        $or: [{ canonicalKey: prevId }, { nodeId: prevId }, { dataId: prevId }, { participantId: prevId }],
      });

      const expectedProviderKey = buildCanonicalKey({
        dataId: inputData.dataId,
        usecaseContractId: inputData.usecaseContractId,
        dvctId: inputData.dvctId,
        participantId: inputData.dataProviderId,
      });

      const shouldCreateProviderNode =
        !parentNode &&
        normalizeString(inputData.dataProviderId) &&
        (prevId === expectedProviderKey || prevId === inputData.dataProviderId);

      if (shouldCreateProviderNode) {
        const providerSeedPayload = buildProviderSeedPayload(inputData);
        const providerCanonicalKey = buildCanonicalKey(providerSeedPayload);
        const existingProvider = await Data.findOne({ canonicalKey: providerCanonicalKey });

        if (existingProvider) {
          parentNode = existingProvider;
        } else {
          const providerJsonLdData = await generateJsonLdData(providerSeedPayload);
          parentNode = await Data.create(providerJsonLdData);
        }
      }

      if (!parentNode) {
        logger.warn(`Skipping unresolved parent reference ${prevId} for canonical node ${canonicalKey}`);
        continue;
      }

      const childNodeData = {
        nodeId: canonicalKey,
        "@nodeUrl": `https://url-to-childNode/${canonicalKey}`,
      };

      await updateChildNode(parentNode.nodeId, childNodeData);
      parentLinks.push({
        nodeId: parentNode.canonicalKey || parentNode.nodeId,
        "@nodeUrl": `https://url-to-prevNode/${parentNode.canonicalKey || parentNode.nodeId}`,
      });
    }

    traceNode.prevNode = dedupeLinks([...(traceNode.prevNode || []), ...parentLinks]);
    await traceNode.save();

    const savedNode = await Data.findOne({ canonicalKey });
    res.status(201).json({ message: 'Data saved successfully', data: savedNode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to retrieve JSON-LD data based on nodeId
router.get('/data/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const data = await Data.findOne({
      $or: [{ nodeId }, { canonicalKey: nodeId }, { dataId: nodeId }],
    });
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ message: 'Node not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/data/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const node = await Data.findOne({
      $or: [{ nodeId }, { canonicalKey: nodeId }, { dataId: nodeId }],
    });
    const allNodes = await Data.find();
    const data = node
      ? await Data.findOneAndDelete({ nodeId: node.nodeId })
      : null;

    if (data && node?.prevNode.length > 0) {
      var newVal = {}
      node.prevNode.map(async(obj) =>{
          allNodes.map((obj) =>{
            newVal = obj.prevNode.filter((_node) => _node.nodeId !== node.nodeId)
          })
          await updateChildPrevNode(obj.nodeId, newVal);
      })
      res.json({ message: 'Node deleted successfully' });
    } else {
      res.status(404).json({ message: 'Node not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to retrieve all JSON-LD data
router.get('/data', async (req, res) => {
  try {
    const allData = await Data.find({});
    res.json(allData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to retrieve node and all connected child and grandchild nodes, with total incentive calculation
router.get('/node-tree/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const nodeTree = await fetchNodeTree(nodeId);
    if (nodeTree) {
      res.json(nodeTree); // Return node tree with total incentive
    } else {
      res.status(404).json({ message: 'Node not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
