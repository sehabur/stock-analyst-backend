const mongoose = require("mongoose");

const latestPriceSchema = mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
    },
    time: {
      type: Date,
    },
    close: {
      type: Number,
    },
    ltp: {
      type: Number,
    },
    ycp: {
      type: Number,
    },
    change: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const LatestPrice = mongoose.model("Latest_price", latestPriceSchema);

module.exports = LatestPrice;
