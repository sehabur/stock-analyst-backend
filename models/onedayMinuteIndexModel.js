const mongoose = require("mongoose");

const dayMinuteIndexSchema = mongoose.Schema(
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

const DayMinuteIndex = mongoose.model(
  "Index_day_minute_value",
  dayMinuteIndexSchema
);

module.exports = DayMinuteIndex;
