const mongoose = require('mongoose');

const dailySectorSchema = mongoose.Schema(
  {
    date: {
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

const DailySector = mongoose.model('Daily_sector', dailySectorSchema);

module.exports = DailySector;
