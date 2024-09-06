const mongoose = require("mongoose");

const priceAlertSchema = mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["above", "below"],
      required: true,
    },
    details: {
      type: String,
    },
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

const PriceAlert = mongoose.model("Price_alert", priceAlertSchema);

module.exports = PriceAlert;
