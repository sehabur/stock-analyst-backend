const mongoose = require('mongoose');

const minutePriceSchema = mongoose.Schema(
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

const MinutePrice = mongoose.model('Minute_price', minutePriceSchema);

module.exports = MinutePrice;
