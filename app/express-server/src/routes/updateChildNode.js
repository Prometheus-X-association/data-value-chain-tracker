const Data = require('../models/data'); 

const updateChildNode = async (prevDataId, childNodeData) => {
  await Data.findOneAndUpdate(
    { 'nodeId': prevDataId },
    { $addToSet: { childNode: childNodeData } }
  );
};

module.exports = { updateChildNode };
