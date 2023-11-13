const mongoose = require('mongoose');

const minuteIndexSchema = mongoose.Schema(
  {
    time: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MinuteIndex = mongoose.model('Index_minute_value', minuteIndexSchema);

module.exports = MinuteIndex;
