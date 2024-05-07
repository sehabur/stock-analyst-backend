const mongoose = require("mongoose");

const newsSchema = mongoose.Schema(
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
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const News = mongoose.model("New", newsSchema);

module.exports = News;
