const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  "@context": Object,
  "@type": String,
  nodeId: String,
  dataId: String,
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
});

module.exports = mongoose.model('Data', dataSchema);
