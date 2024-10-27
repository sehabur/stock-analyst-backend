const mongoose = require("mongoose");

const haltStatusSchema = mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
    },
    time: {
      type: Date,
    },
    initMarketDepthStatus: {
      type: String,
      enum: ["sell", "buy", "none"],
    },
    upperCircuitLimitReached: {
      type: Boolean,
    },
    lowerCircuitLimitReached: {
      type: Boolean,
    },
    circuitLimitReached: {
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
