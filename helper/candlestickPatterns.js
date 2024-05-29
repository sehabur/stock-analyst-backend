function detectCandlestickPattern(open, high, low, close) {
  const bodyLength = Math.abs(close - open);
  const upperShadowLength = high - Math.max(open, close);
  const lowerShadowLength = Math.min(open, close) - low;

  // Hammer
  if (
    bodyLength < upperShadowLength * 2 &&
    lowerShadowLength < bodyLength &&
    lowerShadowLength < upperShadowLength
  ) {
    return "Hammer";
  }
  // Inverted Hammer
  if (
    bodyLength < upperShadowLength * 2 &&
    upperShadowLength < bodyLength &&
    lowerShadowLength < bodyLength
  ) {
    return "Inverted Hammer";
  }
  // Bullish Harami
  if (
    close[1] > open[1] &&
    close < open &&
    close > open[1] &&
    open < close[1] &&
    close < open[2] &&
    open < close[2]
  ) {
    return "Bullish Harami";
  }
  // Bearish Harami
  if (
    close[1] < open[1] &&
    close > open &&
    close < open[1] &&
    open > close[1] &&
    close > open[2] &&
    open > close[2]
  ) {
    return "Bearish Harami";
  }
  // Bullish Engulfing
  if (
    close[1] < open[1] &&
    close > open &&
    close > open[1] &&
    open < close[1]
  ) {
    return "Bullish Engulfing";
  }
  // Bearish Engulfing
  if (
    close[1] > open[1] &&
    close < open &&
    close < open[1] &&
    open > close[1]
  ) {
    return "Bearish Engulfing";
  }
  // Bullish Pin Bar
  if (
    bodyLength < upperShadowLength &&
    lowerShadowLength * 2 < bodyLength &&
    close > open &&
    open - low > bodyLength
  ) {
    return "Bullish Pin Bar";
  }
  // Bearish Pin Bar
  if (
    bodyLength < upperShadowLength &&
    lowerShadowLength * 2 < bodyLength &&
    close < open &&
    high - close > bodyLength
  ) {
    return "Bearish Pin Bar";
  }
  // Morning Star
  if (
    close[2] < open[2] &&
    close[1] > open[1] &&
    close > open &&
    open < close[2] &&
    close < open[2] &&
    close > (open[1] + close[1]) / 2 &&
    close[1] > open[2] &&
    open[1] < close[2]
  ) {
    return "Morning Star";
  }
  // Evening Star
  if (
    close[2] > open[2] &&
    close[1] < open[1] &&
    close < open &&
    open < close[1] &&
    open < open[2] &&
    close[1] < open[2] &&
    close > open[2]
  ) {
    return "Evening Star";
  }
  // Shooting Star
  if (
    bodyLength < upperShadowLength &&
    lowerShadowLength * 2 < bodyLength &&
    close < open &&
    high - close > bodyLength
  ) {
    return "Shooting Star";
  }
  // Three White Soldiers
  if (
    close[2] < open[2] &&
    close[1] < open[1] &&
    close < open &&
    open < close[1] &&
    open < close[2]
  ) {
    return "Three White Soldiers";
  }
  // Three Black Crows
  if (
    close[2] > open[2] &&
    close[1] > open[1] &&
    close > open &&
    open > close[1] &&
    open > close[2]
  ) {
    return "Three Black Crows";
  }
  // Three Inside Down
  if (
    close[2] > open[2] &&
    close[1] > open[1] &&
    close < open &&
    close > open[1] &&
    open < close[1] &&
    close < open[2] &&
    close > close[1] &&
    open > open[1]
  ) {
    return "Three Inside Down";
  }
  // Three Outside Up
  if (
    close[2] < open[2] &&
    close[1] < open[1] &&
    close < open &&
    close < open[1] &&
    open > close[1] &&
    close > open[2] &&
    close < close[1] &&
    open < open[1]
  ) {
    return "Three Outside Up";
  }
  // Tweezer Top
  if (
    close[1] > open[1] &&
    close < open &&
    close[1] < open[1] &&
    low[1] == low[2]
  ) {
    return "Tweezer Top";
  }
  // Tweezer Bottom
  if (
    close[1] < open[1] &&
    close > open &&
    open[1] < close[1] &&
    high[1] == high[2]
  ) {
    return "Tweezer Bottom";
  }
  // Bullish Marubozu
  if (close > open && close - open > 0.8 * (high - low)) {
    return "Bullish Marubozu";
  }
  // Bearish Marubozu
  if (open > close && open - close > 0.8 * (high - low)) {
    return "Bearish Marubozu";
  }
  // Dragonfly Doji
  if (open == close && high - open > 2 * (open - low)) {
    return "Dragonfly Doji";
  }
  // Gravestone Doji
  if (open == close && high - open > 2 * (high - low)) {
    return "Gravestone Doji";
  }
  // Dark Cloud Cover
  if (
    close[1] > open[1] &&
    close < open &&
    close > close[1] &&
    open > open[1] &&
    close - open > 0.8 * (high[1] - low[1]) &&
    close < open[1]
  ) {
    return "Dark Cloud Cover";
  }
  // Hanging Man
  if (
    bodyLength < upperShadowLength * 2 &&
    lowerShadowLength > bodyLength &&
    upperShadowLength < lowerShadowLength &&
    close < open &&
    open - low > bodyLength
  ) {
    return "Hanging Man";
  }
  // Mat Hold
  if (
    close[3] > open[3] &&
    close[1] > open[1] &&
    close[3] < open[3] &&
    close < open &&
    close > open[1] &&
    close < close[1] &&
    close[1] < open[1] &&
    close[2] < close[1] &&
    open[2] < close[2] &&
    open > close[1] &&
    open > close[2] &&
    close[2] < open[3]
  ) {
    return "Mat Hold";
  }
  // Spinning Top
  if (
    bodyLength < 0.1 * (high - low) &&
    upperShadowLength > 2 * bodyLength &&
    lowerShadowLength > 2 * bodyLength
  ) {
    return "Spinning Top";
  }
  // Falling Three Methods
  if (
    close[3] < open[3] &&
    close > open &&
    open > close[1] &&
    close < open[1] &&
    open > close[2] &&
    close < open[2]
  ) {
    return "Falling Three Methods";
  }
  // Piercing Line
  if (
    close[1] < open[1] &&
    close > open &&
    close > (open + close[1]) / 2 &&
    open > close[1]
  ) {
    return "Piercing Line";
  }
  // Dark Cloud Cover
  if (
    close[1] > open[1] &&
    close < open &&
    close > close[1] &&
    open > open[1] &&
    close - open > 0.8 * (high[1] - low[1]) &&
    close < open[1]
  ) {
    return "Dark Cloud Cover";
  }

  // No pattern detected
  return "No Pattern";
}

// Example usage:
const open = [10, 12, 15, 14, 13];
const high = [14, 16, 16, 15, 15];
const low = [9, 10, 14, 12, 11];
const close = [13, 14, 15, 13, 14];

const pattern = detectCandlestickPattern(open, high, low, close);
console.log("Candlestick Pattern:", pattern);
