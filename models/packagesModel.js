const mongoose = require("mongoose");

const packageSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    product: {
      type: String,
    },
    originalPrice: {
      type: Number,
    },
    currentPrice: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    validityDays: {
      type: Number,
    },
    isActive: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
