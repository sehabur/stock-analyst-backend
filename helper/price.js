const { MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE } = require("../data/constants");

const Setting = require("../models/settingModel");

const getMarketOpenStatus = async () => {
  const { dataInsertionEnable } = await Setting.findOne().select(
    "dataInsertionEnable"
  );

  const nowdate = new Date();
  let nowhour = nowdate.getHours();
  let nowminute = nowdate.getMinutes();

  let isMarketOpen = true;

  if (dataInsertionEnable === 0) {
    isMarketOpen = false;
  } else {
    if (nowhour > MARKET_CLOSE_HOUR && nowminute > MARKET_CLOSE_MINUTE) {
      isMarketOpen = false;
    }
  }
  return isMarketOpen;
};

module.exports = {
  getMarketOpenStatus,
};
