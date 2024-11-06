const OpenAI = require("openai");
const AiContent = require("../models/aiContentModel");
const { AI_CONTENT_CUTOFF_HOUR } = require("../data/constants");
const Fundamental = require("../models/fundamentalModel");

const getDataToFeed = async (tradingCode) => {
  const stock = await Fundamental.aggregate([
    {
      $match: {
        tradingCode,
      },
    },
    {
      $lookup: {
        from: "latest_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "latest_prices",
      },
    },
    {
      $unwind: "$latest_prices",
    },
    {
      $addFields: {
        close: "$latest_prices.close",
      },
    },
    {
      $addFields: {
        pe: {
          $round: [{ $divide: ["$close", "$epsCurrent"] }, 2],
        },
        pbv: {
          $round: [
            {
              $divide: [
                {
                  $multiply: ["$close", "$totalShares"],
                },
                {
                  $cond: [
                    { $eq: ["$screener.bookValue.value", 0] },
                    0.000001,
                    "$screener.bookValue.value",
                  ],
                },
              ],
            },
            2,
          ],
        },
        pcf: {
          $round: [
            {
              $divide: [
                "$close",
                {
                  $cond: [
                    { $eq: ["$screener.nocfpsQuarterly.value", 0] },
                    0.000001,
                    "$screener.nocfpsQuarterly.value",
                  ],
                },
              ],
            },
            2,
          ],
        },
      },
    },
    {
      $project: {
        epsCurrent: 1,
        totalShares: 1,
        cashDividend: 1,
        screener: 1,
        technicals: 1,
        close: 1,
        pe: 1,
        pbv: 1,
        pcf: 1,
      },
    },
  ]);

  const {
    technicals,
    cashDividend,
    pe,
    pbv,
    pcf,
    epsCurrent,
    screener,
    close,
  } = stock[0];

  const data = {
    technical: {
      betaOneYear: technicals.beta,
      movingAverages: technicals.movingAverages,
      oscillators: technicals.oscillators,
      candlestick: technicals.candlestick,
    },
    fundamentalRatio: {
      priceToEarningRatio: pe?.toFixed(2),
      priceToBookValueRatio: pbv?.toFixed(2),
      earningsPerShare: epsCurrent.toFixed(2),
      priceToSalesRatio: screener.ps?.value.toFixed(2),
      debtToEquityRatio: screener.de?.value.toFixed(2),
      returnOfEquity: screener.roe?.value.toFixed(2),
      returnOfAssets: screener.roa?.value.toFixed(2),
      dividendYield: screener.dividendYield?.value.toFixed(2),
      currentRatio: screener.currentRatio?.value.toFixed(2),
      netIncomeRatio: screener.netIncomeRatio?.value.toFixed(2),
      NetOperatingCashFlowPerShare: screener.nocfpsQuarterly?.value.toFixed(2),
      NetAssetValue: screener.navQuarterly?.value.toFixed(2),
    },
    financial: {
      reserveAndSurplus: screener.reserveSurplus?.value * 1000000,
      bookValue: screener.bookValue?.value,
      totalLiabilities: screener.totalLiabilities?.value,
      netIncome: screener.netIncome?.value,
      totalAsset: screener.totalAsset?.value,
      revenue: screener.revenue?.value,
      earningBeforeInterestAndTaxes: screener.ebit?.value,
      operatingProfit: screener.operatingProfit?.value,
    },
    fairValue: {
      priceToCashFlowRatio: pcf?.toFixed(2),
      NetOperatingCashFlowPerShare: screener.nocfpsQuarterly?.value.toFixed(2),
      dividendInPercentage: cashDividend,
      currentPrice: close,
      currency: "BDT",
    },
  };

  return data;
};

/*
  @api:       GET /api/admin/..
  @desc:      admin logs
  @access:    public
*/
const getInsight = async (req, res, next) => {
  const {
    tradingCode,
    queryType,
    dataTitle,
    dataField,
    language,
    isDataFeed,
    data,
  } = req.body;

  // console.log(
  //   tradingCode,
  //   queryType,
  //   dataTitle,
  //   dataField,
  //   language,
  //   isDataFeed,
  //   data
  // );

  const contentFromDB = await AiContent.findOne({ tradingCode });

  const insight = contentFromDB && contentFromDB[dataField];

  if (
    insight &&
    new Date(insight.date).getTime() === new Date(getAdjustedDate()).getTime()
  ) {
    return res.status(200).json({ status: "success", content: insight.text });
  }

  let initialText = "";

  switch (queryType) {
    case "fairValue":
      initialText = `Here is some fundamental data of a stock in JSON format. Please analyze it and provide the fair value of this stock. Use both Dividend Discount Model (DDM) and Discounted Cash Flow (DCF) Analysis. Display the output in format: 1. Fair value according to DDM and DCF analysis, 2. Summary explanation. No need to show calculation.`;
      break;
    case "strength":
      initialText = `Here is some fundamental data of a stock in JSON format. Please analyze it and provide 3 to 5 strength of this stock. Make it within maximum 1500 characters.`;
      break;
    case "weakness":
      initialText = `Here is some fundamental data of a stock in JSON format. Please analyze it and provide 3 to 5 weakness of this stock. Make it within maximum 1500 characters.`;
      break;
    case "technical":
      initialText = `Here is some technical data of a stock in JSON format. Please analyze it and provide key insights that are important for investment decision. Make it within maximum 1500 characters.`;
      break;
    case "financial":
      initialText = `Here is some financial data of a stock in JSON format. Please analyze it and provide key insights that are important for investment decision. Make it within maximum 1500 characters.`;
      break;
    default:
      initialText = `Here is some data of a stock in JSON format. Please analyze it and provide key insights that are important for investment decision. Make it within maximum 1500 characters.`;
  }

  if (language == "Bn") {
    initialText += " Give the insight in bangla language.";
  }

  initialText += "\n" + `JSON data for stock ${tradingCode}: `;

  let dataToFeed = {};
  if (isDataFeed) {
    dataToFeed = data;
  } else {
    const dataFromDbQuery = await getDataToFeed(tradingCode);
    dataToFeed = dataFromDbQuery[dataTitle];
  }

  const userContent = initialText + JSON.stringify(dataToFeed);

  // console.log(userContent);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Replace with your OpenAI API key
  });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert financial analyst. Provide key insights and analysis based on stock data",
      },
      { role: "user", content: userContent },
    ],
    max_tokens: 500,
    // temperature: 0.7,
  });

  const contentFromModel = completion.choices[0].message.content;

  // const contentFromModel =
  //   "Based on the provided technical data, here are key insights for investment decisions:\n\n1. **Beta (0.25)**: This low beta indicates that the stock is less volatile than the market, suggesting it may be a stable investment. Investors seeking lower risk may find this appealing.\n\n2. **Moving Averages**: \n   - The stock is currently trading below all significant moving averages (50, 100, and 200 days), indicating a potential bearish trend. However, the shorter-term averages (10 and 20 days) are above the longer-term averages, which may suggest a short-term upward movement.\n   - The SMA and EMA values reflect a gradual decline in price momentum, particularly as the stock trades below the 200-day SMA (88.84).\n\n3. **Oscillators**:\n   - **RSI (54.87)**: This value suggests the stock is neither overbought nor oversold, indicating a neutral position.\n   - **Stochastic (84.12)**: A high value indicates the stock may be overbought in the short term, which could lead to a pullback.\n   - **MACD (-1.62)**: This negative value suggests a bearish momentum, which may indicate potential selling pressure.\n\n4. **Pivots**: The pivot point (P) at 81.73, with resistance levels (R1 at 83.47 and R2 at 84.73), indicates potential upward targets. Support levels (S1 at 80.47 and S2 at 78.73) may provide downside protection.\n\n5. **MFI (46.18)**: This value indicates that the stock is not currently experiencing strong buying or selling pressure, reinforcing the neutral sentiment.\n\nIn conclusion, while the stock shows some signs of short-term bullishness with its moving averages, the overall bearish momentum indicated by the MACD and the high stochastic suggests caution. Investors should closely monitor resistance and support levels for potential entry or exit points.";

  await AiContent.findOneAndUpdate(
    { tradingCode },
    {
      $set: {
        [dataField]: { text: contentFromModel, date: getAdjustedDate() },
      },
    },
    { upsert: true }
  );

  return res.status(200).json({ status: "success", content: contentFromModel });
};

// helpers //

const getAdjustedDate = () => {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();

  // Check if the current UTC hour is before 11:00 UTC
  if (currentUTCHour < AI_CONTENT_CUTOFF_HOUR) {
    now.setUTCDate(now.getUTCDate() - 1);
  }
  now.setUTCHours(0, 0, 0, 0);

  return now;
};

const getCurrentUtcDate = () => {
  const now = new Date();
  return now.setUTCHours(0, 0, 0, 0);
};

module.exports = {
  getInsight,
};
