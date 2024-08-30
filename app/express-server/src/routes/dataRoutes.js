const express = require('express');
const Data = require('../models/data'); 
const { generateJsonLdData } = require('./generateJsonLdData');
const { updateChildNode } = require('./updateChildNode');
const { generateNewNodeForPrevDataId } = require('./generateNewNodeForPrevDataId');
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

// API to receive JSON data and save as JSON-LD format to MongoDB
router.post('/node', async (req, res) => {
  try {
    const inputData = req.body;
    const jsonLdData = await generateJsonLdData(inputData);

    if (inputData.prevDataId && inputData.prevDataId.length > 0) {
      for (const prevId of inputData.prevDataId) {
        const existingNode = await Data.findOne({ nodeId: prevId });
        if (existingNode) {
          const childNodeData = {
            "nodeId": jsonLdData.nodeId,
            "@nodeUrl": `https://url-to-childNode/${jsonLdData.nodeId}`
          };
          await updateChildNode(prevId, childNodeData);
        } else {
          const newNode = await generateNewNodeForPrevDataId(prevId);
          const childNodeData = {
            "nodeId": jsonLdData.nodeId,
            "@nodeUrl": `https://url-to-childNode/${jsonLdData.nodeId}`
          };
          await updateChildNode(prevId, childNodeData);
        }
      }
    }

    const data = new Data(jsonLdData);
    await data.save();

    res.status(201).json({ message: 'Data saved successfully', data: jsonLdData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to retrieve JSON-LD data based on nodeId
router.get('/data/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const data = await Data.findOne({ nodeId });
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
    const data = await Data.findOneAndDelete({ nodeId });
    if (data) {
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

module.exports = router;
