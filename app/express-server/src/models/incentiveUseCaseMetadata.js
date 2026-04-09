const mongoose = require("mongoose");

const incentiveUseCaseParticipantSchema = new mongoose.Schema(
  {
    participantId: String,
    participantName: String,
    role: String,
    walletAddress: String,
    numOfShare: Number,
  },
  { _id: false },
);

const incentiveUseCaseMetadataSchema = new mongoose.Schema(
  {
    useCaseId: { type: String, required: true, unique: true, index: true },
    useCaseName: String,
    sourceUseCaseId: String,
    rewardPool: String,
    participants: [incentiveUseCaseParticipantSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "IncentiveUseCaseMetadata",
  incentiveUseCaseMetadataSchema,
);
