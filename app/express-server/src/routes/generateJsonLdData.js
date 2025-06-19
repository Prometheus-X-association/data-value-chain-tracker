const mongoose = require('mongoose');
const jsonld = require('jsonld');

const generateJsonLdData = async (inputData) => {
  const nodeId = new mongoose.Types.ObjectId().toString(); // Generate a unique node ID
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

  const jsonLdData = {
    "@context": context,
    "@type": "Node",
    "nodeId": nodeId,
    "dataId": inputData.dataId,
    "nodeMetadata": {
      "dvctId": inputData.dvctId,
      "usecaseContractId": inputData.usecaseContractId,
      "dataProviderId": inputData.dataProviderId,
      "dataConsumerId": inputData.dataConsumerId,
      "incentiveReceivedFrom": [
        {
          "organizationId": inputData.dataConsumerId,
          "numPoints": inputData.extraIncentiveForAIProvider.numPoints,
          "contractId": inputData.contractId
        }
      ]
    },
    "childNode": [] // Assuming no child nodes initially
  };

  if (inputData.prevDataId) {
    jsonLdData.prevNode = inputData.prevDataId.map(prevId => ({
      "nodeId": prevId,
      "@nodeUrl": `https://url-to-prevNode/${prevId}`
    }));
  }

  return jsonld.compact(jsonLdData, context);
};

module.exports = { generateJsonLdData };
