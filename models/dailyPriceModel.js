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

const DailyPrice = mongoose.model('Daily_price', dailyPriceSchema);

module.exports = DailyPrice;
