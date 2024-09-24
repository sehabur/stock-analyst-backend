function calculateSma(prices, period) {
  let sma = [];
  for (let i = 0; i <= prices.length - period; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i + j];
    }
    sma.push(sum / period);
  }
  return sma;
}

function calculateEma(prices, period) {
  const k = 2 / (period + 1);
  let emaArray = [];
  let sma = 0;

  for (let i = 0; i < period; i++) {
    sma += prices[i];
  }
  sma = sma / period;

  emaArray.push(sma);

  for (let i = period; i < prices.length; i++) {
    const ema = prices[i] * k + emaArray[emaArray.length - 1] * (1 - k);
    emaArray.push(ema);
  }

  return emaArray;
}

function calculateRsi(prices, period = 14) {
  if (prices.length < period) {
    return null;
  }

  let gains = [];
  let losses = [];

  for (let i = 1; i < prices.length; i++) {
    let change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  let rs = avgGain / avgLoss;

  let rsi = [100 - 100 / (1 + rs)];

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

function calculateStochasticK(data, period = 14, smoothK = 3, smoothD = 3) {
  if (data.length < period) {
    return null;
  }

  let stochK = [];
  for (let i = period - 1; i < data.length; i++) {
    let periodPrices = data.slice(i - period + 1, i + 1);
    let high = Math.max(...periodPrices.map((d) => d.high));
    let low = Math.min(...periodPrices.map((d) => d.low));

    let currentClose = data[i].close;
    let k = ((currentClose - low) / (high - low)) * 100;
    stochK.push(k);
  }

  let slowK = calculateSma(stochK, smoothK);
  let slowD = calculateSma(slowK, smoothD);

  return {
    stochK: stochK.slice(smoothK - 1),
    slowK: slowK,
    slowD: slowD,
  };
}

function calculateTrueRange(highs, lows, closes) {
  let trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }
  return trueRanges;
}

function calculateDirectionalMovement(highs, lows) {
  let plusDM = [];
  let minusDM = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  return { plusDM, minusDM };
}

function calculateSmoothedValues(values, period) {
  let smoothedValues = [];
  let sum = values.slice(0, period).reduce((acc, val) => acc + val, 0);
  smoothedValues.push(sum / period);
  for (let i = period; i < values.length; i++) {
    sum = smoothedValues[smoothedValues.length - 1] * (period - 1) + values[i];
    smoothedValues.push(sum / period);
  }
  return smoothedValues;
}

function calculateAdx(highs, lows, closes, period = 14) {
  const tr = calculateTrueRange(highs, lows, closes);
  const { plusDM, minusDM } = calculateDirectionalMovement(highs, lows);

  const smoothedTR = calculateSmoothedValues(tr, period);
  const smoothedPlusDM = calculateSmoothedValues(plusDM, period);
  const smoothedMinusDM = calculateSmoothedValues(minusDM, period);

  const plusDI = smoothedPlusDM.map(
    (val, index) => (val / smoothedTR[index]) * 100
  );
  const minusDI = smoothedMinusDM.map(
    (val, index) => (val / smoothedTR[index]) * 100
  );

  let dx = [];
  for (let i = 0; i < plusDI.length; i++) {
    const diDiff = Math.abs(plusDI[i] - minusDI[i]);
    const diSum = plusDI[i] + minusDI[i];
    dx.push((diDiff / diSum) * 100);
  }

  const adx = calculateSmoothedValues(dx, period);
  return adx;
}

function calculateMacd(
  prices,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) {
  const shortEMA = calculateEma(prices, shortPeriod);
  const longEMA = calculateEma(prices, longPeriod);

  const macdLine = shortEMA
    .slice(longPeriod - shortPeriod)
    .map((short, index) => short - longEMA[index]);

  const signalLine = calculateEma(macdLine, signalPeriod);

  const validMACDLine = macdLine.slice(signalPeriod - 1);

  return {
    macdLine: validMACDLine,
    signalLine: signalLine,
  };
}

function calculateWilliamsPercentR(highs, lows, closes, period = 14) {
  if (highs.length < period || lows.length < period || closes.length < period) {
    return null;
  }

  let williamsR = [];

  for (let i = period - 1; i < highs.length; i++) {
    let highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
    let lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
    let currentClose = closes[i];
    let percentR =
      ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    williamsR.push(percentR);
  }

  return williamsR;
}

function calculateTypicalPrice(highs, lows, closes) {
  return highs.map((high, i) => (high + lows[i] + closes[i]) / 3);
}

function calculateRawMoneyFlow(typicalPrices, volumes) {
  return typicalPrices.map((price, i) => price * volumes[i]);
}

function calculateMoneyFlowIndex(highs, lows, closes, volumes, period = 10) {
  if (
    highs.length < period ||
    lows.length < period ||
    closes.length < period ||
    volumes.length < period
  ) {
    return null;
  }

  let typicalPrices = calculateTypicalPrice(highs, lows, closes);
  let rawMoneyFlow = calculateRawMoneyFlow(typicalPrices, volumes);

  let positiveMoneyFlow = [];
  let negativeMoneyFlow = [];

  for (let i = 1; i < typicalPrices.length; i++) {
    if (typicalPrices[i] > typicalPrices[i - 1]) {
      positiveMoneyFlow.push(rawMoneyFlow[i]);
      negativeMoneyFlow.push(0);
    } else if (typicalPrices[i] < typicalPrices[i - 1]) {
      positiveMoneyFlow.push(0);
      negativeMoneyFlow.push(rawMoneyFlow[i]);
    } else {
      positiveMoneyFlow.push(0);
      negativeMoneyFlow.push(0);
    }
  }

  let mfi = [];

  for (let i = period - 1; i < positiveMoneyFlow.length; i++) {
    let positiveFlowSum = positiveMoneyFlow
      .slice(i - period + 1, i + 1)
      .reduce((acc, val) => acc + val, 0);
    let negativeFlowSum = negativeMoneyFlow
      .slice(i - period + 1, i + 1)
      .reduce((acc, val) => acc + val, 0);

    let moneyFlowRatio = positiveFlowSum / negativeFlowSum;
    let moneyFlowIndex = 100 - 100 / (1 + moneyFlowRatio);
    mfi.push(moneyFlowIndex);
  }

  return mfi;
}

function calculatePivotPoints(high, low, close) {
  const P = (high + low + close) / 3;

  const S1 = 2 * P - high;
  const R1 = 2 * P - low;
  const S2 = P - (high - low);
  const R2 = P + (high - low);
  const S3 = low - 2 * (high - P);
  const R3 = high + 2 * (P - low);

  return {
    P: Number(P.toFixed(2)),
    S1: Number(S1.toFixed(2)),
    S2: Number(S2.toFixed(2)),
    S3: Number(S3.toFixed(2)),
    R1: Number(R1.toFixed(2)),
    R2: Number(R2.toFixed(2)),
    R3: Number(R3.toFixed(2)),
  };
}

function calculateSmaLastValue(prices, period) {
  if (prices.length < period) return "-";

  const slicedPrices = prices.slice(-period);

  const sum = slicedPrices.reduce((total, current) => {
    return total + current;
  }, 0);

  const sma = Number((sum / period).toFixed(2));

  return sma;
}

function calculateEmaLastValue(prices, period) {
  if (prices.length < period) return "-";

  const k = 2 / (period + 1);
  let emaArray = [];
  let sma = 0;

  for (let i = 0; i < period; i++) {
    sma += prices[i];
  }
  sma = sma / period;

  emaArray.push(sma);

  for (let i = period; i < prices.length; i++) {
    const ema = prices[i] * k + emaArray[emaArray.length - 1] * (1 - k);
    emaArray.push(ema);
  }

  const emaLastValue = Number(emaArray[emaArray.length - 1].toFixed(2));

  return emaLastValue;
}

function calculateRsiLastValue(prices, period = 14) {
  if (prices.length < period) {
    return null;
  }

  let gains = [];
  let losses = [];

  for (let i = 1; i < prices.length; i++) {
    let change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let rs = avgGain / avgLoss;

  let rsi = [100 - 100 / (1 + rs)];

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  const rsiLastValue = Number(rsi[rsi.length - 1].toFixed(2));

  return rsiLastValue;
}

function calculateStochasticKLastValue(
  data,
  period = 14,
  smoothK = 3,
  smoothD = 3
) {
  if (data.length < period) {
    return null;
  }

  let stochK = [];
  for (let i = period - 1; i < data.length; i++) {
    let periodPrices = data.slice(i - period + 1, i + 1);
    let high = Math.max(...periodPrices.map((d) => d.high));
    let low = Math.min(...periodPrices.map((d) => d.low));

    let currentClose = data[i].close;
    let k = ((currentClose - low) / (high - low)) * 100;

    console.log(currentClose, high, low, k);

    stochK.push(k);
  }

  let slowK = calculateSma(stochK, smoothK);
  // let slowD = calculateSma(slowK, smoothD);

  return Number(slowK[slowK.length - 1].toFixed(2));
}

function calculateAdxLastValue(highs, lows, closes, period = 14) {
  const tr = calculateTrueRange(highs, lows, closes);

  const { plusDM, minusDM } = calculateDirectionalMovement(highs, lows);

  const smoothedTR = calculateSmoothedValues(tr, period);

  const smoothedPlusDM = calculateSmoothedValues(plusDM, period);
  const smoothedMinusDM = calculateSmoothedValues(minusDM, period);

  console.log(smoothedTR);

  const plusDI = smoothedPlusDM.map(
    (val, index) => (val / smoothedTR[index]) * 100
  );
  const minusDI = smoothedMinusDM.map(
    (val, index) => (val / smoothedTR[index]) * 100
  );

  let dx = [];
  for (let i = 0; i < plusDI.length; i++) {
    const diDiff = Math.abs(plusDI[i] - minusDI[i]);
    const diSum = plusDI[i] + minusDI[i];
    dx.push((diDiff / diSum) * 100);
  }

  const adx = calculateSmoothedValues(dx, period);

  const adxLastValue = Number(adx[adx.length - 1].toFixed(2));

  return adxLastValue;
}

function calculateMacdLastValue(
  prices,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) {
  const shortEMA = calculateEma(prices, shortPeriod);
  const longEMA = calculateEma(prices, longPeriod);

  const macdLine = shortEMA
    .slice(longPeriod - shortPeriod)
    .map((short, index) => short - longEMA[index]);

  const validMACDLine = macdLine.slice(signalPeriod - 1);

  const macdLastValue = Number(
    validMACDLine[validMACDLine.length - 1].toFixed(2)
  );

  return macdLastValue;
}

function calculateWilliamsPercentRLastValue(highs, lows, closes, period = 14) {
  if (highs.length < period || lows.length < period || closes.length < period) {
    return null;
  }

  let williamsR = [];

  for (let i = period - 1; i < highs.length; i++) {
    let highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
    let lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
    let currentClose = closes[i];
    let percentR =
      ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    williamsR.push(percentR);
  }

  const williamsRLastValue = Number(williamsR[williamsR.length - 1].toFixed(2));

  return williamsRLastValue;
}

function calculateMoneyFlowIndexLastValue(
  highs,
  lows,
  closes,
  volumes,
  period = 10
) {
  if (
    highs.length < period ||
    lows.length < period ||
    closes.length < period ||
    volumes.length < period
  ) {
    return null;
  }

  let typicalPrices = calculateTypicalPrice(highs, lows, closes);
  let rawMoneyFlow = calculateRawMoneyFlow(typicalPrices, volumes);

  let positiveMoneyFlow = [];
  let negativeMoneyFlow = [];

  for (let i = 1; i < typicalPrices.length; i++) {
    if (typicalPrices[i] > typicalPrices[i - 1]) {
      positiveMoneyFlow.push(rawMoneyFlow[i]);
      negativeMoneyFlow.push(0);
    } else if (typicalPrices[i] < typicalPrices[i - 1]) {
      positiveMoneyFlow.push(0);
      negativeMoneyFlow.push(rawMoneyFlow[i]);
    } else {
      positiveMoneyFlow.push(0);
      negativeMoneyFlow.push(0);
    }
  }

  let mfi = [];

  for (let i = period - 1; i < positiveMoneyFlow.length; i++) {
    let positiveFlowSum = positiveMoneyFlow
      .slice(i - period + 1, i + 1)
      .reduce((acc, val) => acc + val, 0);
    let negativeFlowSum = negativeMoneyFlow
      .slice(i - period + 1, i + 1)
      .reduce((acc, val) => acc + val, 0);

    let moneyFlowRatio = positiveFlowSum / negativeFlowSum;
    let moneyFlowIndex = 100 - 100 / (1 + moneyFlowRatio);
    mfi.push(moneyFlowIndex);
  }

  const mfiLastValue = Number(mfi[mfi.length - 1].toFixed(2));

  return mfiLastValue;
}

module.exports = {
  calculateSma,
  calculateEma,
  calculateRsi,
  calculateStochasticK,
  calculateAdx,
  calculateMacd,
  calculateWilliamsPercentR,
  calculateMoneyFlowIndex,
  calculatePivotPoints,
  calculateSmaLastValue,
  calculateEmaLastValue,
  calculateRsiLastValue,
  calculateStochasticKLastValue,
  calculateAdxLastValue,
  calculateMacdLastValue,
  calculateWilliamsPercentRLastValue,
  calculateMoneyFlowIndexLastValue,
};
