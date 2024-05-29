const mongoose = require("mongoose");

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
    open: {
      type: Number,
    },
    high: {
      type: Number,
    },
    low: {
      type: Number,
    },
    close: {
      type: Number,
    },
    ltp: {
      type: Number,
    },
    volume: {
      type: Number,
    },
  }
  // {
  //   timestamps: true,
  // }
);

const DailyPrice = mongoose.model("Daily_price", dailyPriceSchema);

module.exports = DailyPrice;
