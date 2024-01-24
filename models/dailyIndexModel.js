const mongoose = require('mongoose');

const dailyIndexSchema = mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const DailyIndex = mongoose.model('Index_daily_value', dailyIndexSchema);

module.exports = DailyIndex;
