const Data = require('../models/data');

// Recursive function to fetch node, its child nodes, and calculate the total incentive
const fetchNodeTree = async (nodeId) => {
  const node = await Data.findOne({ nodeId });

  if (!node) {
    return null;
  }

  let totalIncentive = 0;

  // Calculate incentives for the current node
  node.nodeMetadata.incentiveReceivedFrom.forEach((incentive) => {
    totalIncentive += incentive.numPoints;
  });

  const childNodes = [];

  // Recursively fetch all child nodes and their incentives
  for (const child of node.childNode) {
    const childData = await fetchNodeTree(child.nodeId);
    if (childData) {
      childNodes.push(childData);
      totalIncentive += childData.totalIncentive; // Add the incentive from child nodes to the total incentive
    }
  }

  // Return the node along with its children and the calculated total incentive
  return {
    nodeId: node.nodeId,
    dataId: node.dataId,
    nodeMetadata: node.nodeMetadata,
    totalIncentive, // Include the total incentive in the response
    childNode: childNodes, // Nested child nodes
  };
};

module.exports = { fetchNodeTree };