const mongoose = require('mongoose');

const dailyPriceSchema = mongoose.Schema(
  {
    date: {
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

const Dp = mongoose.model('Dp', dailyPriceSchema);

module.exports = Dp;
