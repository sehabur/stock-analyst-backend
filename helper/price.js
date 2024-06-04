const {
  MARKET_CLOSE_HOUR,
  MARKET_CLOSE_MINUTE,
  MARKET_PRE_CLOSE_MINUTE,
} = require("../data/constants");

const Setting = require("../models/settingModel");

const getMarketOpenStatus = async () => {
  const { dataInsertionEnable } = await Setting.findOne().select(
    "dataInsertionEnable"
  );

  const nowdate = new Date();
  let nowhour = nowdate.getUTCHours();
  let nowminute = nowdate.getUTCMinutes();

  let marketOpenStatus = "Closed";

  if (dataInsertionEnable === 0) {
    marketOpenStatus = "Closed";
  } else {
    if (nowhour > MARKET_CLOSE_HOUR) {
      marketOpenStatus = "Closed";
    } else if (nowhour == MARKET_CLOSE_HOUR) {
      if (nowminute > MARKET_CLOSE_MINUTE) {
        marketOpenStatus = "Closed";
      } else if (
        nowminute < MARKET_CLOSE_MINUTE &&
        nowminute > MARKET_PRE_CLOSE_MINUTE
      ) {
        marketOpenStatus = "Post close";
      } else {
        marketOpenStatus = "Open";
      }
    } else {
      marketOpenStatus = "Open";
    }
  }
  return marketOpenStatus;
};

function calculateReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(dailyReturn);
  }
  return returns;
}

function calculateSlope(x, y) {
  const n = x.length;
  const meanX = x.reduce((sum, value) => sum + value, 0) / n;
  const meanY = y.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) * (x[i] - meanX);
  }

  return numerator / denominator;
}

function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key];

    if (!result[groupKey]) {
      result.push({
        tradingCode: groupKey,
        data: [],
      });
    }

    const index = result.findIndex((item) => item.tradingCode == groupKey);

    result[index].data.push({
      date: currentValue.date,
      ltp: currentValue.ltp,
    });

    return result;
  }, []);
}

function calculateBeta(stockData, marketData) {
  const marketPrices = marketData.map((entry) => entry.ltp);
  const marketReturns = calculateReturns(marketPrices);

  const groupedData = groupBy(stockData, "tradingCode");

  console.log(groupedData.length);

  let betaList = [];
  for (stock of groupedData) {
    const stockPrices = stock.data.map((entry) => entry.ltp);

    const stockReturns = calculateReturns(stockPrices);

    const beta = calculateSlope(marketReturns, stockReturns);

    betaList.push({
      tradingCode: stock.tradingCode,
      beta,
    });
  }

  return betaList;
}

module.exports = {
  getMarketOpenStatus,
  calculateBeta,
};
