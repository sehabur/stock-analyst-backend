const mongoose = require('mongoose');

const dayMinutePriceSchema = mongoose.Schema(
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

const DayMinutePrice = mongoose.model('Day_minute_price', dayMinutePriceSchema);

module.exports = DayMinutePrice;
