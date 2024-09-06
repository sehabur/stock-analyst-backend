const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      // required: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumExpireDate: {
      type: Date,
    },
    isFreeTrialUsed: {
      type: Boolean,
      default: false,
    },
    lastOtp: {
      type: Number,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    favorites: [
      {
        type: String,
      },
    ],
    favorites: [
      {
        type: String,
      },
    ],
    priceAlerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Price_alert",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
