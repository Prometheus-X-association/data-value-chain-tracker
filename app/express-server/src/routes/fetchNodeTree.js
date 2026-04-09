const Data = require('../models/data');

// Recursive function to fetch node, its child nodes, and calculate the total incentive
const fetchNodeTree = async (nodeId, options = {}, visited = new Set()) => {
  const { allowedNodeIds } = options;

  if (visited.has(nodeId)) {
    return null;
  }

  visited.add(nodeId);

  const node = await Data.findOne({
    $or: [{ nodeId }, { canonicalKey: nodeId }, { dataId: nodeId }],
  });

  if (!node) {
    return null;
  }

  if (allowedNodeIds && !allowedNodeIds.has(node.nodeId)) {
    return null;
  }

  let totalIncentive = 0;
  const incentives = Array.isArray(node.nodeMetadata?.incentiveReceivedFrom)
    ? node.nodeMetadata.incentiveReceivedFrom
    : [];

  // Calculate incentives for the current node
  incentives.forEach((incentive) => {
    totalIncentive += incentive.numPoints;
  });

  const childNodes = [];

  // Recursively fetch all child nodes and their incentives
  for (const child of node.childNode) {
    const childData = await fetchNodeTree(child.nodeId, options, visited);
    if (childData) {
      childNodes.push(childData);
      totalIncentive += childData.totalIncentive; // Add the incentive from child nodes to the total incentive
    }
  }

  // Return the node along with its children and the calculated total incentive
  return {
    nodeId: node.nodeId,
    canonicalKey: node.canonicalKey,
    nodeType: node.nodeType,
    dataId: node.dataId,
    participantId: node.participantId,
    participantShare: node.participantShare,
    participantSourceId: node.participantSourceId,
    usecaseContractTitle: node.usecaseContractTitle,
    nodeMetadata: node.nodeMetadata,
    totalIncentive, // Include the total incentive in the response
    childNode: childNodes, // Nested child nodes
  };
};

module.exports = { fetchNodeTree };
