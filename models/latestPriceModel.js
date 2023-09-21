const mongoose = require('mongoose');

const latestPriceSchema = mongoose.Schema(
  {
    time: {
      type: Date,
      required: true,
    },
    tradingCode: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const LatestPrice = mongoose.model('Latest_price', latestPriceSchema);

module.exports = LatestPrice;
