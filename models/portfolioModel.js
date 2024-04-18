const mongoose = require("mongoose");

const portfolioSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    commission: {
      type: Number,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Portfolio_item",
      },
    ],
    itemList: [
      {
        type: String,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Portfolio = mongoose.model("Portfolio", portfolioSchema);

module.exports = Portfolio;
