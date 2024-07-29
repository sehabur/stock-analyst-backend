const mongoose = require("mongoose");

const yesterdayPriceSchema = mongoose.Schema(
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

const YesterdayPrice = mongoose.model("Yesterday_price", yesterdayPriceSchema);

module.exports = YesterdayPrice;
