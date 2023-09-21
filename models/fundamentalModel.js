const mongoose = require('mongoose');

const fundamentalSchema = mongoose.Schema(
  {
    time: {
      type: Date,
      required: true,
    },
    tradingCode: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Fundamental = mongoose.model('Fundamental', fundamentalSchema);

module.exports = Fundamental;
