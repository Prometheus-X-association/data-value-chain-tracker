const mongoose = require('mongoose');
const Data = require('../models/data'); 
const { buildCanonicalKey, buildNodeType } = require('../lib/traceability');

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
    "canonicalKey": buildCanonicalKey({ dataId: prevDataId }),
    "nodeType": buildNodeType({ prevDataId: [] }),
    "dataId": prevDataId,
    "participantId": prevDataId,
    "participantShare": inputData.participantShare || 0,
    "participantSourceId": inputData.participantSourceId || "",
    "usecaseContractTitle": inputData.usecaseContractTitle || "",
    "nodeMetadata": {
      "dvctId": "",
      "usecaseContractId": "",
      "dataProviderId": "",
      "dataConsumerId": "",
      "incentiveReceivedFrom": [{
        "organizationId": inputData.participantSourceId || inputData.participantId || inputData.dataProviderId,
        "numPoints": inputData.participantShare || inputData.incentiveForDataProvider?.numPoints || 0,
        "contractId": inputData.contractId
      }]
    },
    "prevNode": [],
    "childNode": []
  };

  const existingNode = await Data.findOne({ canonicalKey: newNode.canonicalKey });
  if (existingNode) {
    return existingNode;
  }

  await Data.create(newNode);
  return newNode;
};

module.exports = { generateNewNodeForPrevDataId };
