const mongoose = require('mongoose');

const blockTrSchema = mongoose.Schema(
  {
    date: {
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

const BlockTr = mongoose.model('Block_transection', blockTrSchema);

module.exports = BlockTr;
