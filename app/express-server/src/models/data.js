const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  "@context": Object,
  "@type": String,
  nodeId: String,
  // One node per (use case, data, participant): concurrent events for the same identity merge.
  canonicalKey: { type: String, unique: true, sparse: true },
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
  }],
  // Names of the organizations involved, as reported by the source (dataspace catalog or PDC).
  // The organization registry's displayName takes precedence when showing names.
  organizationNames: [{
    _id: false,
    organizationId: String,
    name: String
  }]
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Data', dataSchema);
