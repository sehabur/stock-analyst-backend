const mongoose = require("mongoose");

const ipoSchema = mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    subscriptionStart: {
      type: Date,
    },
    subscriptionEnd: {
      type: Date,
    },
    subscriptionAmount: {
      type: Number,
    },
    investmentCutoffDate: {
      type: Date,
    },
    minInvestment: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Ipo = mongoose.model("Ipo", ipoSchema);

module.exports = Ipo;
