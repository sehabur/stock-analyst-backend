const mongoose = require("mongoose");

const haltStatusSchema = mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: Date,
      required: true,
    },
    tradingCode: {
      type: String,
      required: true,
    },
    initMarketDepthStatus: {
      type: String,
    },
    upperCircuitLimitReached: {
      type: Boolean,
    },
    lowerCircuitLimitReached: {
      type: Boolean,
    },
    totalBuyVolume: {
      type: Number,
    },
    totalSellVolume: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["sell", "buy", "none"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const HaltStatus = mongoose.model("Halt_share", haltStatusSchema);

module.exports = HaltStatus;
