const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    status: {
      type: String,
    },
    tranId: {
      type: String,
    },
    valId: {
      type: String,
    },
    bankTranId: {
      type: String,
    },
    amount: {
      type: String,
    },
    storeAmount: {
      type: String,
    },
    cardType: {
      type: String,
    },
    tranDate: {
      type: Date,
    },
    product: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
