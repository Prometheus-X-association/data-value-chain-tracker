const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  "@context": Object,
  "@type": String,
  nodeId: String,
  canonicalKey: { type: String, index: true },
  nodeType: String,
  dataId: String,
  participantId: String,
  participantShare: Number,
  participantSourceId: String,
  usecaseContractTitle: String,
  nodeMetadata: {
    dvctId: String,
    usecaseContractId: String,
    dataProviderId: String,
    dataConsumerId: String,
    incentiveReceivedFrom: [{
      organizationId: String,
      numPoints: Number,
      contractId: String
    }]
  },
  prevNode: [{
    nodeId: String,
    "@nodeUrl": String
  }],
  childNode: [{
    nodeId: String,
    "@nodeUrl": String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Data', dataSchema);
