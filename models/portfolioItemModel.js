const mongoose = require("mongoose");

const portfolioItemSchema = mongoose.Schema(
  {
    tradingCode: {
      type: String,
    },
    quantity: {
      type: Number,
    },
    price: {
      type: Number,
    },
    totalPrice: {
      type: Number,
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Portfolio",
    },
  },
  {
    timestamps: true,
  }
);

const PortfolioItem = mongoose.model("Portfolio_item", portfolioItemSchema);

module.exports = PortfolioItem;
