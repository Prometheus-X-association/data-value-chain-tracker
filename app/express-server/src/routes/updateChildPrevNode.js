const Data = require('../models/data'); 

const updateChildPrevNode = async (prevDataId, childNodeData) => {
  await Data.findOneAndUpdate(
    { 'nodeId': prevDataId },
    { $set: { childNode: childNodeData } }
  );
};

module.exports = { updateChildPrevNode };
