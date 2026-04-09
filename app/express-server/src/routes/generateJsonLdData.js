const mongoose = require('mongoose');
const jsonld = require('jsonld');
const { buildCanonicalKey, buildNodeType } = require('../lib/traceability');

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
    "canonicalKey": buildCanonicalKey(inputData),
    "nodeType": buildNodeType(inputData),
    "dataId": inputData.dataId,
    "participantId": inputData.participantId || "",
    "participantShare": inputData.participantShare || 0,
    "participantSourceId": inputData.participantSourceId || "",
    "usecaseContractTitle": inputData.usecaseContractTitle,
    "nodeMetadata": {
      "dvctId": inputData.dvctId,
      "usecaseContractId": inputData.usecaseContractId,
      "dataProviderId": inputData.dataProviderId,
      "dataConsumerId": inputData.dataConsumerId,
      "incentiveReceivedFrom": [
        {
          "organizationId": inputData.participantSourceId || inputData.participantId || inputData.dataConsumerId,
          "numPoints": inputData.participantShare || inputData.extraIncentiveForAIProvider?.numPoints || 0,
          "contractId": inputData.contractId
        }
      ]
    },
    "childNode": [] // Assuming no child nodes initially
  };

  const validPrevDataIds = Array.isArray(inputData.prevDataId)
    ? inputData.prevDataId.filter((prevId) => typeof prevId === 'string' && prevId.trim())
    : [];

  if (validPrevDataIds.length > 0) {
    jsonLdData.prevNode = validPrevDataIds.map(prevId => ({
      "nodeId": prevId,
      "@nodeUrl": `https://url-to-prevNode/${prevId}`
    }));
  }

  return jsonld.compact(jsonLdData, context);
};

module.exports = { generateJsonLdData };
