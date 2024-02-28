const url = require("url");
const { DateTime } = require("luxon");
const createError = require("http-errors");

const MinutePrice = require("../models/minutePriceModel");
const Fundamental = require("../models/fundamentalModel");
const DailyPrice = require("../models/dailyPriceModel");
const DailySector = require("../models/dailySectorModel");
const LatestPrice = require("../models/latestPriceModel");
const News = require("../models/newsModel");
const BlockTr = require("../models/BlockTrModel");
const MinuteIndex = require("../models/minuteIndexModel");
const DailyIndex = require("../models/dailyIndexModel");
const Setting = require("../models/settingModel");
const {
  sectorList,
  stocksListDetails,
  circuitMoveRange,
} = require("../data/dse");
const DayMinutePrice = require("../models/onedayMinutePriceModel");

/*
  @api:       GET /api/prices/getSymbolTvchart/
  @desc:      get all Symbol for TV chart
  @access:    public
*/
const getSymbolTvchart = async (req, res) => {
  const data = await Fundamental.find().select("tradingCode companyName");
  res.status(200).json({
    Data: {
      DSE: {
        stocks: data,
      },
    },
  });
};

/*
  @api:       GET /api/prices/getBarsTvchart/
  @desc:      get all bars for a specific Symbol in TV chart
  @access:    public
*/
const getBarsTvchart = async (req, res) => {
  const { exchange, symbol, resolutionType, fromTime, toTime, limit } =
    url.parse(req.url, true).query;

  if (["DSEX", "DSES", "DSE30"].includes(symbol)) {
    let index;
    if (resolutionType === "intraday") {
      index = await MinuteIndex.aggregate([
        {
          $match: {
            time: {
              $gte: new Date(fromTime * 1000),
              $lte: new Date(toTime * 1000),
            },
          },
        },
        {
          $sort: {
            time: 1,
          },
        },
        {
          $project: {
            time: { $toLong: "$time" },
            ycp: "$dsex.index",
            close: "$dsex.index",
            high: "$dsex.index",
            low: "$dsex.index",
            volume: "$totalVolume",
          },
        },
      ]);
    } else {
      index = await DailyIndex.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(fromTime * 1000),
              $lte: new Date(toTime * 1000),
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
        {
          $project: {
            date: { $toLong: "$date" },
            ycp: "$dsex.index",
            close: "$dsex.index",
            high: "$dsex.index",
            low: "$dsex.index",
            volume: "$totalVolume",
          },
        },
      ]);
    }
    let indexdata = {
      Response: "Success",
      Data: index,
    };
    res.status(200).json(indexdata);
  }

  let latestPrice;

  if (resolutionType === "intraday") {
    latestPrice = await MinutePrice.aggregate([
      {
        $match: {
          tradingCode: symbol,
          time: {
            $gte: new Date(fromTime * 1000),
            $lte: new Date(toTime * 1000),
          },
        },
      },
      {
        $sort: {
          time: 1,
        },
      },
      {
        $project: {
          time: { $toLong: "$time" },
          ycp: 1,
          close: "$ltp",
          high: 1,
          low: 1,
          volume: 1,
        },
      },
    ]);
  } else {
    latestPrice = await DailyPrice.aggregate([
      {
        $match: {
          tradingCode: symbol,
          date: {
            $gte: new Date(fromTime * 1000),
            $lte: new Date(toTime * 1000),
          },
        },
      },
      {
        $sort: {
          date: 1,
        },
      },

      {
        $project: {
          time: { $toLong: "$date" },
          open: "$ycp",
          close: "$ltp",
          high: 1,
          low: 1,
          volume: 1,
        },
      },
    ]);
  }

  let data = {
    Response: "Success",
    Data: latestPrice,
  };
  res.status(200).json(data);
};

/*
  @api:       GET /api/prices/getAllStocks
  @desc:      get all share details
*/
const getAllStocks = async (req, res, next) => {
  const allStocks = await Fundamental.find().select(
    "tradingCode companyName sector category yearEnd"
  );

  res.status(200).json(allStocks);
};

/*
  @api:       GET /api/prices/latestPrice/
  @desc:      get latest share prices for all shares
  @access:    public
*/
const latestPrice = async (req, res, next) => {
  const latestPrice = await LatestPrice.aggregate([
    {
      $lookup: {
        from: "fundamentals",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "fundamentals",
      },
    },
    { $unwind: "$fundamentals" },
    {
      $addFields: {
        sector: "$fundamentals.sector",
        category: "$fundamentals.category",
        companyName: "$fundamentals.companyName",
      },
    },
    {
      $project: { fundamentals: 0 },
    },
    {
      $sort: { tradingCode: 1 },
    },
  ]);
  res.status(200).json(latestPrice);
};

/*
  @api:       GET /api/prices/latestPricesBySearch?search={search}
  @desc:      get latest share prices for all shares
  @access:    public
*/
const latestPricesBySearch = async (req, res, next) => {
  const { search } = url.parse(req.url, true).query;

  const latestPrice = await LatestPrice.aggregate([
    {
      $lookup: {
        from: "fundamentals",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "fundamentals",
      },
    },
    { $unwind: "$fundamentals" },
    {
      $addFields: {
        sector: "$fundamentals.sector",
        category: "$fundamentals.category",
        companyName: "$fundamentals.companyName",
      },
    },
    {
      $project: { fundamentals: 0 },
    },
    {
      $match: {
        $or: [
          { tradingCode: { $regex: new RegExp(search, "i") } },
          { companyName: { $regex: new RegExp(search, "i") } },
        ],
      },
    },
    {
      $sort: { tradingCode: 1 },
    },
  ]);
  res.status(200).json(latestPrice);
};

/*
  @api:       GET /api/prices/sectorWiseLatestPrice
  @desc:      get latest share prices group by sector
  @access:    public
*/
const sectorWiseLatestPrice = async (req, res, next) => {
  const price = await Fundamental.aggregate([
    {
      $lookup: {
        from: "latest_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "latest_price",
      },
    },
    { $unwind: "$latest_price" },
    {
      $group: {
        _id: "$sector",
        totalShare: { $sum: 1 },
        uptrendItems: {
          $addToSet: {
            $cond: [{ $gt: ["$latest_price.change", 0] }, "$tradingCode", 0],
          },
        },
        downtrendItems: {
          $addToSet: {
            $cond: [{ $lt: ["$latest_price.change", 0] }, "$tradingCode", 0],
          },
        },
        neutralItems: {
          $addToSet: {
            $cond: [{ $eq: ["$latest_price.change", 0] }, "$tradingCode", 0],
          },
        },
        uptrend: {
          $sum: {
            $cond: [{ $gt: ["$latest_price.change", 0] }, 1, 0],
          },
        },
        downtrend: {
          $sum: {
            $cond: [{ $lt: ["$latest_price.change", 0] }, 1, 0],
          },
        },
        neutral: {
          $sum: {
            $cond: [{ $eq: ["$latest_price.change", 0] }, 1, 0],
          },
        },
        ltp: {
          $avg: {
            $cond: [
              { $gt: ["$latest_price.ltp", 0] },
              "$latest_price.ltp",
              "$latest_price.ycp",
            ],
          },
        },
        ycp: { $avg: "$latest_price.ycp" },
        // high: { $avg: '$latest_price.high' },
        // low: { $avg: '$latest_price.low' },
        // close: { $avg: '$latest_price.close' },
        change: { $avg: "$latest_price.change" },
        value: { $sum: "$latest_price.value" },
        // volume: { $sum: '$latest_price.volume' },
        // trade: { $sum: '$latest_price.trade' },
        valueCategoryA: {
          $sum: {
            $cond: {
              if: { $eq: ["$category", "A"] },
              then: "$latest_price.value",
              else: 0,
            },
          },
        },
        valueCategoryB: {
          $sum: {
            $cond: {
              if: { $eq: ["$category", "B"] },
              then: "$latest_price.value",
              else: 0,
            },
          },
        },
        valueCategoryN: {
          $sum: {
            $cond: {
              if: { $eq: ["$category", "N"] },
              then: "$latest_price.value",
              else: 0,
            },
          },
        },
        valueCategoryZ: {
          $sum: {
            $cond: {
              if: { $eq: ["$category", "Z"] },
              then: "$latest_price.value",
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        sector: "$_id",
        pp: 1,
        uptrend: 1,
        downtrend: 1,
        neutral: 1,
        uptrendItems: 1,
        downtrendItems: 1,
        neutralItems: 1,
        ltp: { $round: ["$ltp", 2] },
        ycp: { $round: ["$ycp", 2] },
        // high: { $round: ['$high', 2] },
        // low: { $round: ['$low', 2] },
        // close: { $round: ['$close', 2] },
        change: { $round: ["$change", 2] },
        percentChange: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $subtract: ["$ltp", "$ycp"] }, "$ycp"] },
                100,
              ],
            },
            2,
          ],
        },
        valueTotal: { $round: ["$value", 2] },
        // volume: { $round: ['$volume', 2] },
        // trade: { $round: ['$trade', 2] },
        valueCategoryA: { $round: ["$valueCategoryA", 2] },
        valueCategoryB: { $round: ["$valueCategoryB", 2] },
        valueCategoryN: { $round: ["$valueCategoryN", 2] },
        valueCategoryZ: { $round: ["$valueCategoryZ", 2] },
      },
    },
    {
      $sort: { uptrend: -1 },
    },
  ]);

  res.status(200).json(price);
};

/*
  @api:       GET /api/prices/dailySectorPrice/:sectorTag?period={number}
  @desc:      get sector wise daily/weekly/monthly prices
  @access:    public
*/
const dailySectorPrice = async (req, res, next) => {
  const sectorTag = req.params.sectorTag;

  const sector = sectorList.find((item) => item.tag === sectorTag).name;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 260; // default to 1 year //

  // const today = DateTime.now().setZone('Asia/Dhaka');

  // const queryDate = today
  //   .set({
  //     hour: 0,
  //     minute: 0,
  //     second: 0,
  //     millisecond: 0,
  //   })
  //   .setZone('UTC', { keepLocalTime: true });

  // const queryTime = queryDate.toUnixInteger();

  // const lastDailySectorUpdateTime =
  //   new Date(dailySectorUpdateDate).getTime() / 1000;

  const { dailySectorUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select(
      "dailySectorUpdateDate minuteDataUpdateDate"
    );

  const minuteSector = await Fundamental.aggregate([
    {
      $match: {
        sector: sector,
      },
    },
    {
      $lookup: {
        from: "minute_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "minute_prices",
        pipeline: [{ $match: { date: minuteDataUpdateDate } }],
      },
    },
    { $unwind: "$minute_prices" },
    {
      $sort: {
        "minute_prices.time": 1,
      },
    },
    {
      $project: {
        date: "$minute_prices.date",
        time: "$minute_prices.time",
        tradingCode: "$minute_prices.tradingCode",
        ltp: "$minute_prices.ltp",
        high: "$minute_prices.high",
        low: "$minute_prices.low",
        close: "$minute_prices.close",
        ycp: "$minute_prices.ycp",
        change: "$minute_prices.change",
        percentChange: "$minute_prices.percentChange",
        trade: "$minute_prices.trade",
        value: "$minute_prices.value",
        volume: "$minute_prices.volume",
        sector: 1,
      },
    },
  ]);

  const dailySector = await DailySector.aggregate([
    {
      $facet: {
        daily: [
          {
            $match: {
              sector,
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
          {
            $limit: queryLimit,
          },
          {
            $sort: {
              date: 1,
            },
          },
          {
            $unionWith: {
              coll: "latest_prices",
              pipeline: [
                {
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
                {
                  $lookup: {
                    from: "fundamentals",
                    localField: "tradingCode",
                    foreignField: "tradingCode",
                    as: "fundamentals",
                  },
                },
                { $unwind: "$fundamentals" },
                {
                  $match: {
                    "fundamentals.sector": sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: "$date" },
                    ltp: { $avg: "$ltp" },
                    ycp: { $avg: "$ycp" },
                    high: { $avg: "$high" },
                    low: { $avg: "$low" },
                    close: { $avg: "$ltp" },
                    change: { $avg: "$change" },
                    trade: { $sum: "$trade" },
                    value: { $sum: "$value" },
                    volume: { $sum: "$volume" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ["$ltp", 2] },
                    ycp: { $round: ["$ycp", 2] },
                    high: { $round: ["$high", 2] },
                    low: { $round: ["$low", 2] },
                    close: { $round: ["$close", 2] },
                    change: { $round: ["$change", 2] },
                    trade: 1,
                    value: 1,
                    volume: 1,
                  },
                },
              ],
            },
          },
        ],
        weekly: [
          {
            $match: {
              sector,
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
          {
            $limit: queryLimit,
          },
          {
            $sort: {
              date: 1,
            },
          },
          {
            $unionWith: {
              coll: "latest_prices",
              pipeline: [
                {
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
                {
                  $lookup: {
                    from: "fundamentals",
                    localField: "tradingCode",
                    foreignField: "tradingCode",
                    as: "fundamentals",
                  },
                },
                { $unwind: "$fundamentals" },
                {
                  $match: {
                    "fundamentals.sector": sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: "$date" },
                    ltp: { $avg: "$ltp" },
                    ycp: { $avg: "$ycp" },
                    high: { $avg: "$high" },
                    low: { $avg: "$low" },
                    close: { $avg: "$ltp" },
                    change: { $avg: "$change" },
                    trade: { $sum: "$trade" },
                    value: { $sum: "$value" },
                    volume: { $sum: "$volume" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ["$ltp", 2] },
                    ycp: { $round: ["$ycp", 2] },
                    high: { $round: ["$high", 2] },
                    low: { $round: ["$low", 2] },
                    close: { $round: ["$close", 2] },
                    change: { $round: ["$change", 2] },
                    trade: 1,
                    value: 1,
                    volume: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              startOfWeek: {
                $toDate: {
                  $subtract: [
                    "$date",
                    {
                      $multiply: [
                        {
                          $subtract: [
                            {
                              $dayOfWeek: "$date",
                            },
                            1,
                          ],
                        },
                        24 * 60 * 60 * 1000,
                      ],
                    },
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: "$startOfWeek",
              open: { $first: "$ycp" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$close" },
              trade: { $sum: "$trade" },
              volume: { $sum: "$volume" },
              value: { $sum: "$value" },
            },
          },
          {
            $addFields: {
              date: "$_id",
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],
        monthly: [
          {
            $match: {
              sector,
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
          {
            $limit: queryLimit,
          },
          {
            $sort: {
              date: 1,
            },
          },
          {
            $unionWith: {
              coll: "latest_prices",
              pipeline: [
                {
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
                {
                  $lookup: {
                    from: "fundamentals",
                    localField: "tradingCode",
                    foreignField: "tradingCode",
                    as: "fundamentals",
                  },
                },
                { $unwind: "$fundamentals" },
                {
                  $match: {
                    "fundamentals.sector": sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: "$date" },
                    ltp: { $avg: "$ltp" },
                    ycp: { $avg: "$ycp" },
                    high: { $avg: "$high" },
                    low: { $avg: "$low" },
                    close: { $avg: "$ltp" },
                    change: { $avg: "$change" },
                    trade: { $sum: "$trade" },
                    value: { $sum: "$value" },
                    volume: { $sum: "$volume" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ["$ltp", 2] },
                    ycp: { $round: ["$ycp", 2] },
                    high: { $round: ["$high", 2] },
                    low: { $round: ["$low", 2] },
                    close: { $round: ["$close", 2] },
                    change: { $round: ["$change", 2] },
                    trade: 1,
                    value: 1,
                    volume: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              startOfMonth: {
                $dateFromParts: {
                  year: {
                    $year: { date: "$date", timezone: "Asia/Dhaka" },
                  },
                  month: {
                    $month: { date: "$date", timezone: "Asia/Dhaka" },
                  },
                  day: 1,
                },
              },
            },
          },
          {
            $group: {
              _id: "$startOfMonth",
              open: { $first: "$ycp" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$close" },
              trade: { $sum: "$trade" },
              volume: { $sum: "$volume" },
              value: { $sum: "$value" },
            },
          },
          {
            $addFields: {
              date: "$_id",
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  // if (queryTime > lastDailySectorUpdateTime) {
  //   const latestDaily = await LatestPrice.aggregate([
  //     {
  //       $lookup: {
  //         from: 'fundamentals',
  //         localField: 'tradingCode',
  //         foreignField: 'tradingCode',
  //         as: 'fundamentals',
  //       },
  //     },
  //     { $unwind: '$fundamentals' },
  //     {
  //       $match: {
  //         'fundamentals.sector': sector,
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: null,
  //         date: { $first: '$date' },
  //         ltp: { $avg: '$ltp' },
  //         ycp: { $avg: '$ycp' },
  //         high: { $avg: '$high' },
  //         low: { $avg: '$low' },
  //         close: { $avg: '$ltp' },
  //         change: { $avg: '$change' },
  //         trade: { $sum: '$trade' },
  //         volume: { $sum: '$volume' },
  //         value: { $sum: '$value' },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         date: 1,
  //         sector: sector,
  //         ltp: { $round: ['$ltp', 2] },
  //         ycp: { $round: ['$ycp', 2] },
  //         high: { $round: ['$high', 2] },
  //         low: { $round: ['$low', 2] },
  //         close: { $round: ['$close', 2] },
  //         change: { $round: ['$change', 2] },
  //         trade: 1,
  //         value: 1,
  //         volume: 1,
  //       },
  //     },
  //   ]);

  //   dailySector[0].daily.push(latestDaily[0]);
  // }

  res.status(200).json({ minute: minuteSector, ...dailySector[0] });
};

/*
  @api:       GET /api/prices/stock/:code?period={number}
  @desc:      get stock fundamentals, latest price, minute charts
  @access:    public
*/
const stockDetails = async (req, res, next) => {
  // try {
  const tradingCode = req.params.code;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 260; // default to 1 year //

  const sector = stocksListDetails.find(
    (stock) => stock.tradingCode === tradingCode
  ).sector;

  const { dailyPriceUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select("dailyPriceUpdateDate minuteDataUpdateDate");

  const minutePrice = await DayMinutePrice.aggregate([
    {
      $match: {
        tradingCode,
      },
    },
    {
      $facet: {
        latest: [
          {
            $sort: {
              time: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        minute: [
          {
            $sort: {
              time: 1,
            },
          },
          {
            $project: {
              time: 1,
              close: 1,
              ltp: 1,
              ycp: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$latest",
    },
  ]);

  const dailyPrice = await DailyPrice.aggregate([
    {
      $match: {
        tradingCode,
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
    {
      $limit: queryLimit,
    },
    {
      $sort: {
        date: 1,
      },
    },
    {
      $unionWith: {
        coll: "latest_prices",
        pipeline: [
          {
            $match: {
              tradingCode: tradingCode,
              date: {
                $gt: dailyPriceUpdateDate,
              },
            },
          },
        ],
      },
    },
    {
      $facet: {
        lastDay: [
          {
            $match: {
              date: {
                $lt: minuteDataUpdateDate,
              },
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        daily: [
          {
            $project: {
              date: 1,
              open: "$ycp",
              high: 1,
              low: 1,
              close: 1,
              volume: 1,
            },
          },
        ],
        weekly: [
          {
            $addFields: {
              startOfWeek: {
                $toDate: {
                  $subtract: [
                    "$date",
                    {
                      $multiply: [
                        {
                          $subtract: [
                            {
                              $dayOfWeek: "$date",
                            },
                            1,
                          ],
                        },
                        24 * 60 * 60 * 1000,
                      ],
                    },
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: "$startOfWeek",
              open: { $first: "$ycp" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$close" },
              trade: { $sum: "$trade" },
              volume: { $sum: "$volume" },
              value: { $sum: "$value" },
            },
          },
          {
            $addFields: {
              date: "$_id",
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],
        monthly: [
          {
            $addFields: {
              startOfMonth: {
                $dateFromParts: {
                  year: {
                    $year: { date: "$date", timezone: "Asia/Dhaka" },
                  },
                  month: {
                    $month: { date: "$date", timezone: "Asia/Dhaka" },
                  },
                  day: 1,
                },
              },
            },
          },
          {
            $group: {
              _id: "$startOfMonth",
              open: { $first: "$ycp" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$close" },
              trade: { $sum: "$trade" },
              volume: { $sum: "$volume" },
              value: { $sum: "$value" },
            },
          },
          {
            $addFields: {
              date: "$_id",
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$lastDay",
    },
  ]);

  const fundamentalsBasic = await Fundamental.findOne({ tradingCode });

  const latestPrice = minutePrice[0].latest;

  const ltp = latestPrice.ltp > 0 ? latestPrice.ltp : latestPrice.ycp;

  const ycp = latestPrice.ycp;

  const circuitRange = circuitMoveRange.find(
    (item) => ycp > item.min && ycp < item.max
  ).value;

  const circuitUp = Math.floor((ycp + (ycp * circuitRange) / 100) * 10) / 10;
  const circuitLow = Math.ceil((ycp - (ycp * circuitRange) / 100) * 10) / 10;

  const sectorRatio = await Fundamental.aggregate([
    {
      $match: {
        sector,
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
        ltp: {
          $cond: [
            { $gt: ["$latest_prices.ltp", 0] },
            "$latest_prices.ltp",
            "$latest_prices.ycp",
          ],
        },
      },
    },
    {
      $project: {
        tradingCode: 1,
        pe: {
          $round: [
            {
              $divide: [
                "$ltp",
                {
                  $cond: [{ $eq: ["$epsCurrent", 0] }, 0.000001, "$epsCurrent"],
                },
              ],
            },
            2,
          ],
        },
        pbv: {
          $round: [
            {
              $divide: [
                {
                  $multiply: ["$ltp", "$totalShares"],
                },
                "$screener.bookValue.value",
              ],
            },
            2,
          ],
        },
        pcf: {
          $round: [
            {
              $divide: [
                "$ltp",
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
        _id: 0,
      },
    },
  ]);

  const formatRatioValues = (type, title, changeColorReverse = false) => {
    let value, period;
    if (type === "pe") {
      value = Number((ltp / fundamentalsBasic.epsCurrent).toFixed(2));
      period = "Current";
    }
    if (type === "pbv") {
      value = Number(
        (
          (ltp * fundamentalsBasic.totalShares) /
          fundamentalsBasic.screener.bookValue.value
        ).toFixed(2)
      );
      period = fundamentalsBasic.screener.bookValue.period;
    }
    if (type === "pcf") {
      value = Number(
        (ltp / fundamentalsBasic.screener.nocfpsQuarterly.value).toFixed(2)
      );
      period = fundamentalsBasic.screener.nocfpsQuarterly.period;
    }

    const sectorInitialData = sectorRatio.map((item) => ({
      tradingCode: item.tradingCode,
      value: item[type],
    }));

    let positiveValues = [];
    let negativeValues = [];
    let zeroValues = [];

    for (let item of sectorInitialData) {
      if (item.value > 0) {
        positiveValues.push(item);
      } else if (item.value < 0) {
        negativeValues.push(item);
      } else {
        zeroValues.push(item);
      }
    }
    const sectorData = [
      ...positiveValues.sort((a, b) => a.value - b.value),
      ...zeroValues,
      ...negativeValues.sort((a, b) => b.value - a.value),
    ];
    // console.log(sectorData);
    const position =
      sectorData.findIndex((item) => item.tradingCode === tradingCode) + 1;

    const totalItems = sectorData.length;
    const median = Math.floor(totalItems / 2);

    let textColor;
    if (changeColorReverse) {
      textColor =
        position === median
          ? "primary.main"
          : position > median
          ? "error.main"
          : "success.main";
    } else {
      textColor =
        position === median
          ? "primary.main"
          : position < median
          ? "error.main"
          : "success.main";
    }

    let positionText = "";
    if (position === 1) {
      positionText = "1st";
    } else if (position === 2) {
      positionText = "2nd";
    } else if (position === 3) {
      positionText = "3rd";
    } else if (position > 3) {
      positionText = position.toString() + "th";
    }
    return {
      value,
      period,
      min: sectorData[0].value,
      max: sectorData[totalItems - 1].value,
      comment: positionText + " in sector(out of " + totalItems + ")",
      overview:
        title +
        " of " +
        tradingCode +
        " is at " +
        positionText +
        " position in sector where total number of stocks in sector is " +
        totalItems,
      color: textColor,
    };
  };

  const fundamentalsExtended = {
    circuitUp,
    circuitLow,
    pbv: fundamentalsBasic.screener.bookValue
      ? formatRatioValues("pbv", "P/BV ratio")
      : null,
    pe: fundamentalsBasic.epsCurrent
      ? formatRatioValues("pe", "P/E ratio", true)
      : null,
    pcf: fundamentalsBasic.screener.nocfpsQuarterly
      ? formatRatioValues("pcf", "P/CF ratio", true)
      : null,
  };

  res.status(200).json({
    ...minutePrice[0],
    ...dailyPrice[0],
    fundamentals: { ...fundamentalsBasic._doc, ...fundamentalsExtended },
  });
  // } catch (error) {
  //   const err = createError(500, "Error Occured");
  //   next(err);
  // }
};

/*
  @api:       GET /api/prices/indexMinuteData
  @desc:      get latest index data
  @access:    public
*/
const indexMinuteData = async (req, res, next) => {
  const { minuteDataUpdateDate } = await Setting.findOne();

  const index = await MinuteIndex.aggregate([
    {
      $match: {
        date: minuteDataUpdateDate,
      },
    },
    {
      $facet: {
        latest: [
          {
            $sort: {
              time: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        minute: [
          {
            $sort: {
              time: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$latest",
    },
  ]);
  res.status(200).json(index[0]);
};

/*
  @api:       GET /api/prices/newsByStock/:code?limit={limit}
  @desc:      get latest news by tradingcode
  @access:    public
*/
const newsByStock = async (req, res, next) => {
  const tradingCode = req.params.code;

  const { limit } = url.parse(req.url, true).query;

  const queryLimit = limit ? Number(limit) : 25;

  let news;
  if (tradingCode === "all") {
    news = await News.find().sort({ date: -1 }).limit(queryLimit);
  } else {
    news = await News.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }

  let mergedNewsList = [];

  for (let newsItem of news) {
    const dateIndex = mergedNewsList.findIndex((item) => {
      const itemDate = new Date(item.date);
      const newsItemDate = new Date(newsItem.date);
      return itemDate.getTime() == newsItemDate.getTime();
    });
    if (dateIndex !== -1) {
      mergedNewsList[dateIndex]?.news.push(newsItem);
    } else {
      mergedNewsList.push({
        date: newsItem.date,
        news: [newsItem],
      });
    }
  }

  let finalNewsList = [];

  for (let newslist of mergedNewsList) {
    let tempNewsList = [];
    for (let news of newslist.news) {
      const titleIndex = tempNewsList.findIndex(
        (item) => item.title === news.title
      );
      if (titleIndex !== -1) {
        tempNewsList[titleIndex]["description"] =
          tempNewsList[titleIndex]["description"] + " " + news.description;
      } else {
        tempNewsList.push(news);
      }
    }
    finalNewsList.push(...tempNewsList);
  }

  // for (let newsItem of news) {
  // }

  // for (let newsItem of news) {
  //   const titleIndex = mergedNewsList.findIndex(
  //     (item) => item.title === newsItem.title
  //   );

  //   if (titleIndex !== -1 && dateIndex !== -1 && titleIndex === dateIndex) {
  //     mergedNewsList[titleIndex]['description'] =
  //       mergedNewsList[titleIndex]['description'] + newsItem.description;
  //   } else {
  //     mergedNewsList.push(newsItem);
  //   }
  // }
  res.status(200).json(finalNewsList);
};

/*
  @api:       GET /api/prices/blockTr/:code?limit={limit}
  @desc:      get latest news by tradingcode
  @access:    public
*/
const blocktrByStock = async (req, res, next) => {
  const tradingCode = req.params.code;

  const { limit } = url.parse(req.url, true).query;

  const queryLimit = limit ? Number(limit) : 100;

  let blocktr;

  if (tradingCode === "all") {
    blocktr = await BlockTr.find().sort({ date: -1 }).limit(queryLimit);
  } else {
    blocktr = await BlockTr.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }

  res.status(200).json(blocktr);
};

/*
  @api:       GET /api/prices/allGainerLoser
  @desc:      get gainer and losers data
  @access:    public
*/
const allGainerLoser = async (req, res, next) => {
  const { minuteDataUpdateDate } = await Setting.findOne().select(
    "minuteDataUpdateDate"
  );

  const gainerLoser = await LatestPrice.aggregate([
    {
      $lookup: {
        from: "daily_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "yesterday_price",
        pipeline: [
          {
            $match: {
              date: {
                $lt: minuteDataUpdateDate,
              },
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
      },
    },
    { $unwind: "$yesterday_price" },
    {
      $lookup: {
        from: "fundamentals",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "fundamentals",
      },
    },
    { $unwind: "$fundamentals" },
    {
      $facet: {
        gainerDaily: [
          {
            $match: {
              change: {
                $gt: 0,
              },
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserDaily: [
          {
            $match: {
              change: {
                $lt: 0,
              },
            },
          },
          {
            $sort: {
              percentChange: 1,
            },
          },
          { $limit: 10 },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        gainerOneWeek: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneWeekBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneWeekPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneWeekBeforeData",
                            ],
                          },
                          "$yesterday_price.oneWeekBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneWeekPercentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneWeekPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        gainerOneMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneMonthBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneMonthPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneMonthBeforeData",
                            ],
                          },
                          "$yesterday_price.oneMonthBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneMonthPercentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        gainerSixMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.sixMonthBeforeData"],
              },
            },
          },
          {
            $addFields: {
              sixMonthPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.sixMonthBeforeData",
                            ],
                          },
                          "$yesterday_price.sixMonthBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              sixMonthPercentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        gainerOneYear: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneYearBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneYearPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneYearBeforeData",
                            ],
                          },
                          "$yesterday_price.oneYearBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneYearPercentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        gainerFiveYear: [
          {
            $match: {
              "yesterday_price.fiveYearBeforeData": {
                $ne: "-",
              },
              $expr: {
                $gt: ["$ltp", "$yesterday_price.fiveYearBeforeData"],
              },
            },
          },
          {
            $addFields: {
              fiveYearPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.fiveYearBeforeData",
                            ],
                          },
                          "$yesterday_price.fiveYearBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              fiveYearPercentChange: -1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: 1,
              ltp: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserOneWeek: [
          {
            $match: {
              "yesterday_price.oneWeekBeforeData": {
                $ne: "-",
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ["$ltp", "$yesterday_price.oneWeekBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneWeekPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneWeekBeforeData",
                            ],
                          },
                          "$yesterday_price.oneWeekBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneWeekPercentChange: 1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneWeekPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserOneMonth: [
          {
            $match: {
              "yesterday_price.oneMonthBeforeData": {
                $ne: "-",
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ["$ltp", "$yesterday_price.oneMonthBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneMonthPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneMonthBeforeData",
                            ],
                          },
                          "$yesterday_price.oneMonthBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneMonthPercentChange: 1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneMonthPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserSixMonth: [
          {
            $match: {
              "yesterday_price.sixMonthBeforeData": {
                $ne: "-",
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ["$ltp", "$yesterday_price.sixMonthBeforeData"],
              },
            },
          },
          {
            $addFields: {
              sixMonthPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.sixMonthBeforeData",
                            ],
                          },
                          "$yesterday_price.sixMonthBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              sixMonthPercentChange: 1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              sixMonthPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserOneYear: [
          {
            $match: {
              "yesterday_price.oneYearBeforeData": {
                $ne: "-",
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ["$ltp", "$yesterday_price.oneYearBeforeData"],
              },
            },
          },
          {
            $addFields: {
              oneYearPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.oneYearBeforeData",
                            ],
                          },
                          "$yesterday_price.oneYearBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              oneYearPercentChange: 1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneYearPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        loserFiveYear: [
          {
            $match: {
              "yesterday_price.fiveYearBeforeData": {
                $ne: "-",
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ["$ltp", "$yesterday_price.fiveYearBeforeData"],
              },
            },
          },
          {
            $addFields: {
              fiveYearPercentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$ltp",
                              "$yesterday_price.fiveYearBeforeData",
                            ],
                          },
                          "$yesterday_price.fiveYearBeforeData",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $sort: {
              fiveYearPercentChange: 1,
            },
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              fiveYearPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json(gainerLoser[0]);
};

/*
  @api:       GET /api/prices/screener
  @desc:      get latest index data
  @access:    public
*/
const screener = async (req, res, next) => {
  const body = req.body;

  filters = {};

  for (key in body) {
    filters[key] = {};

    const value = body[key].split(";");

    const minvalue = value[0];
    const maxvalue = value[1];

    if (["sector", "category"].includes(key)) {
      filters[key]["$eq"] = value[0].toString();
    } else {
      if (minvalue !== "null") filters[key]["$gte"] = Number(minvalue);
      if (maxvalue !== "null") filters[key]["$lte"] = Number(maxvalue);
    }
  }

  const data = await Fundamental.aggregate([
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
        ltp: {
          $cond: [
            { $gt: ["$latest_prices.ltp", 0] },
            "$latest_prices.ltp",
            "$latest_prices.ycp",
          ],
        },
        epsCurrent: {
          $cond: [{ $eq: ["$epsCurrent", 0] }, 0.000001, "$epsCurrent"],
        },
      },
    },
    {
      $project: {
        id: "$_id",
        tradingCode: 1,
        sector: 1,
        ltp: 1,
        volume: "$latest_prices.volume",
        pricePercentChange: "$latest_prices.percentChange",
        category: 1,
        totalShares: 1,
        reserve: "$reserveSurplusWithoutOci",
        marketCap: {
          $divide: ["$marketCap", 10],
        },
        paidUpCap: {
          $divide: ["$paidUpCap", 10],
        },
        pe: {
          $round: [{ $divide: ["$ltp", "$epsCurrent"] }, 2],
        },
        de: "$screener.de.value",
        ps: "$screener.ps.value",
        roe: "$screener.roe.value",
        roa: "$screener.roa.value",
        currentRatio: "$screener.currentRatio.value",

        dividendYield: "$screener.dividendYield.value",
        cashDividend: "$screener.dividend.cash",
        stockDividend: "$screener.dividend.stock",

        revenueGrowthOneYear: "$screener.revenue.percentChange",
        revenueGrowthFiveYear: "$screener.revenue.percentChangeFiveYear",

        epsGrowthOneYear: "$screener.epsYearly.percentChange",
        epsGrowthFiveYear: "$screener.epsYearly.percentChangeFiveYear",
        epsGrowthQuarter: "$screener.epsQuarterly.percentChange",

        navGrowthOneYear: "$screener.navYearly.percentChange",
        navGrowthQuarter: "$screener.navQuarterly.percentChange",

        nocfpsGrowthOneYear: "$screener.nocfpsYearly.percentChange",
        nocfpsGrowthQuarter: "$screener.nocfpsQuarterly.percentChange",

        revenueGrowthOneYear: "$screener.revenue.percentChange",
        revenueGrowthFiveYear: "$screener.revenue.percentChangeFiveYear",
        revenueGrowthOneYear: "$screener.revenue.percentChange",
        revenueGrowthFiveYear: "$screener.revenue.percentChangeFiveYear",

        directorShareHolding: "$screener.shareholding.current.director",
        govtShareHolding: "$screener.shareholding.current.govt",
        instituteShareHolding: "$screener.shareholding.current.institute",
        publicShareHolding: "$screener.shareholding.current.public",
        foreignShareHolding: "$screener.shareholding.current.foreign",

        directorShareHoldingChange:
          "$screener.shareholding.percentChange.director",
        instituteShareHoldingChange:
          "$screener.shareholding.percentChange.institute",

        freeFloatShare: {
          $add: [
            "$screener.shareholding.current.institute",
            "$screener.shareholding.current.public",
            "$screener.shareholding.current.foreign",
          ],
        },
      },
    },
    {
      $match: {
        ...filters,
      },
    },
    {
      $sort: {
        tradingCode: 1,
      },
    },
  ]);

  res.json(data);
};

/*
  test function
*/
const pytest = async (req, res, next) => {
  const dailySector = await DailyPrice.aggregate([
    {
      $match: {
        tradingCode: "APEXFOOT",
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
    {
      $facet: {
        rawData: [],
        alltimeHigh: [
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
        "5yearHigh": [
          {
            $limit: 1250,
          },
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
        "1yearHigh": [
          {
            $limit: 250,
          },
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
        "6monthHigh": [
          {
            $limit: 130,
          },
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
        "1monthHigh": [
          {
            $limit: 22,
          },
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
        "1weekHigh": [
          {
            $limit: 5,
          },
          {
            $group: {
              _id: null,
              value: { $max: "$high" },
            },
          },
        ],
      },
    },
  ]);
  res.json(dailySector[0].rawData[5].ltp);
};

const newtest = async (req, res) => {
  const fundamentals = await Fundamental.aggregate([
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
      $project: {
        tradingCode: 1,
        cashDividend: 1,
        epsCurrent: 1,
        ltp: "$latest_prices.close",
      },
    },
  ]);

  const result = fundamentals.map((item) => {
    let data = item.cashDividend
      ? item.cashDividend.sort((a, b) => b.year - a.year)
      : [];
    data = data.length > 0 ? data[0].value : null;
    console.log(item.tradingCode, item.ltp, item.epsCurrent, data);
    return {
      code: item.tradingCode,
      cashDividend: data,
      epsCurrent: item.epsCurrent,
      ltp: item.ltp,
    };
  });

  res.send(result);
};

module.exports = {
  getSymbolTvchart,
  getBarsTvchart,
  getAllStocks,
  latestPrice,
  latestPricesBySearch,
  sectorWiseLatestPrice,
  dailySectorPrice,
  stockDetails,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  allGainerLoser,
  screener,
  pytest,
  newtest,
};
