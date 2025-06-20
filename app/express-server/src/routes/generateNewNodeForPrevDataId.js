const mongoose = require('mongoose');
const Data = require('../models/data'); 

const generateNewNodeForPrevDataId = async (prevDataId, inputData) => {
  const context = {
    "@vocab": "https://example.org/vocab#",
    "nodeId": "https://example.org/vocab#nodeId",
    "dataId": "https://example.org/vocab#dataId",
    "nodeMetadata": "https://example.org/vocab#nodeMetadata",
    "dvctId": "https://example.org/vocab#dvctId",
    "usecaseContractId": "https://example.org/vocab#usecaseContractId",
    "dataProviderId": "https://example.org/vocab#dataProviderId",
    "dataConsumerId": "https://example.org/vocab#dataConsumerId",
    "incentiveReceivedFrom": "https://example.org/vocab#incentiveReceivedFrom",
    "organizationId": "https://example.org/vocab#organizationId",
    "numPoints": "https://example.org/vocab#numPoints",
    "contractId": "https://example.org/vocab#contractId",
    "prevNode": "https://example.org/vocab#prevNode",
    "childNode": "https://example.org/vocab#childNode",
    "@nodeUrl": {
      "@id": "https://example.org/vocab#nodeUrl",
      "@type": "@id"
    }
  };

  const newNodeId = new mongoose.Types.ObjectId().toString();

  const newNode = {
    "@context": context,
    "@type": "Node",
    "nodeId": newNodeId,
    "dataId": prevDataId,
    "nodeMetadata": {
      "dvctId": "",
      "usecaseContractId": "",
      "dataProviderId": "",
      "dataConsumerId": "",
      "incentiveReceivedFrom": { 
        "organizationId": inputData.dataProviderId,
        "numPoints": inputData.incentiveForDataProvider.numPoints,
        "contractId": inputData.contractId
        
      }
    },
    "prevNode": [],
    "childNode": []
  };

  await Data.create(newNode);
  return newNode;
};

module.exports = { generateNewNodeForPrevDataId };
