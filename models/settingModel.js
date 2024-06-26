const mongoose = require("mongoose");

const settingSchema = mongoose.Schema(
  {
    dataInsertionEnable: {
      type: Number,
      required: true,
    },
    minuteDataUpdateDate: {
      type: Date,
      required: true,
    },
    dailyIndexUpdateDate: {
      type: Date,
      required: true,
    },
    dailyPriceUpdateDate: {
      type: Date,
      required: true,
    },
    dailySectorUpdateDate: {
      type: Date,
      required: true,
    },
    dailyBlockTrUpdateDate: {
      type: Date,
      required: true,
    },
    lastVolume: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
