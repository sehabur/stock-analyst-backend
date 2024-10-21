const mongoose = require("mongoose");

const settingSchema = mongoose.Schema(
  {
    dataInsertionEnable: {
      type: Number,
    },
    minuteDataUpdateDate: {
      type: Date,
    },
    ipoUpdateTime: {
      type: Date,
    },
    dailyIndexUpdateDate: {
      type: Date,
    },
    dailyPriceUpdateDate: {
      type: Date,
    },
    dailySectorUpdateDate: {
      type: Date,
    },
    dailyBlockTrUpdateDate: {
      type: Date,
    },
    lastVolume: {
      type: Number,
    },
    ipoUpdateTime: {
      type: Date,
    },
    openHour: {
      type: Number,
    },
    openMinute: {
      type: Number,
    },
    closeHour: {
      type: Number,
    },
    closeMinute: {
      type: Number,
    },
    preCloseHour: {
      type: Number,
    },
    preCloseMinute: {
      type: Number,
    },
    dataFetchStartHour: {
      type: Number,
    },
    dataFetchStartMinute: {
      type: Number,
    },
    dataFetchEndHour: {
      type: Number,
    },
    dataFetchEndMinute: {
      type: Number,
    },
    androidVersionCode: {
      type: Number,
    },
    iosVersionCode: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
