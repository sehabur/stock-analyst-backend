const url = require("url");
const { DateTime } = require("luxon");
const createError = require("http-errors");
const MinutePrice = require("../models/minutePriceModel");
const Fundamental = require("../models/fundamentalModel");
const DailyPrice = require("../models/dailyPriceModel");
const DailySector = require("../models/dailySectorModel");
const LatestPrice = require("../models/latestPriceModel");
const News = require("../models/newsModel");
const BlockTr = require("../models/blockTranxModel");
const MinuteIndex = require("../models/minuteIndexModel");
const DailyIndex = require("../models/dailyIndexModel");
const Setting = require("../models/settingModel");
const DayMinutePrice = require("../models/onedayMinutePriceModel");
const Ipo = require("../models/ipoModel");

const { sectorList, circuitMoveRange } = require("../data/dse");

const { getMarketOpenStatus } = require("../helper/price");

/*
  @api:       GET /api/prices/getSymbolTvchart/
  @desc:      get all Symbol for TV chart
  @access:    public
*/
const getSymbolTvchart = async (req, res) => {
  const data = await Fundamental.find({ isActive: true }).select(
    "tradingCode companyName"
  );

  res.status(200).json({
    Data: {
      DSE: {
        stocks: data,
        index: [
          {
            code: "DSEX",
            name: "DHAKA STOCK EXCHANGE INDEX",
          },
          {
            code: "DSES",
            name: "DHAKA STOCK EXCHANGE SHARIAH INDEX",
          },
        ],
        sectors: sectorList.map((item) => ({
          name: item.name,
        })),
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

  // try {
  if (["DSEX", "DSES", "DSE30"].includes(symbol)) {
    let index;
    if (resolutionType === "intraday") {
      index = await MinuteIndex.aggregate([
        {
          $match: {
            time: {
              $gte: new Date(fromTime * 1000),
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
    return res.status(200).json(indexdata);
  }

  let latestPrice = [];

  if (resolutionType === "intraday") {
    const prices = await MinutePrice.aggregate([
      {
        $match: {
          tradingCode: symbol,
          time: {
            $lte: new Date(toTime * 1000),
          },
        },
      },
      {
        $sort: {
          time: -1,
        },
      },
      {
        $limit: Number(limit),
      },
      {
        $sort: {
          time: 1,
        },
      },
      {
        $project: {
          time: { $toLong: "$time" },
          open: 1,
          close: 1,
          high: 1,
          low: 1,
          ltp: 1,
          ycp: 1,
          volume: 1,
        },
      },
    ]);

    let volume;
    for (let i = 1; i < prices.length; i++) {
      const currentTime = new Date(prices[i].time);
      const prevTime = new Date(prices[i - 1].time);

      let currentday = currentTime.getDate();
      let prevday = prevTime.getDate();

      if (currentday == prevday) {
        volume = prices[i].volume - prices[i - 1].volume;
      } else {
        volume = prices[i].volume;
      }
      latestPrice.push({
        ...prices[i],
        volume: volume,
      });
    }
  } else {
    const prices = await DailyPrice.aggregate([
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
          open: 1,
          close: 1,
          high: 1,
          low: 1,
          ltp: 1,
          ycp: 1,
          volume: 1,
        },
      },
    ]);

    if (new Date() < new Date(toTime * 1000)) {
      console.log("first");
      const { dailyPriceUpdateDate } = await Setting.findOne().select(
        "dailyPriceUpdateDate"
      );

      const todayPrices = await DayMinutePrice.aggregate([
        {
          $match: {
            tradingCode: symbol,
            date: {
              $gt: dailyPriceUpdateDate,
            },
            ltp: { $ne: 0 },
          },
        },
        {
          $sort: {
            time: 1,
          },
        },
        {
          $group: {
            _id: null,
            date: { $first: "$date" },
            open: { $first: "$ltp" },
            high: { $last: "$high" },
            low: { $last: "$low" },
            close: { $last: "$ltp" },
            ltp: { $last: "$ltp" },
            ycp: { $first: "$ycp" },
            volume: { $last: "$volume" },
          },
        },
        {
          $project: {
            _id: 0,
            time: { $toLong: "$date" },
            open: 1,
            close: 1,
            high: 1,
            low: 1,
            ltp: 1,
            ycp: 1,
            volume: 1,
          },
        },
      ]);

      console.log(todayPrices);
      latestPrice = formatCandleChartData([...prices, ...todayPrices]);
    } else {
      latestPrice = formatCandleChartData(prices);
    }
  }

  console.log(new Date(fromTime * 1000), new Date(toTime * 1000), new Date());

  let data = {
    Response: "Success",
    Data: latestPrice,
  };
  res.status(200).json(data);
  // } catch (error) {
  //   let data = {
  //     Response: "Error",
  //     Data: [],
  //   };
  //   res.status(400).json(data);
  // }
};

/*
  @api:       GET /api/prices/getStocksList
  @desc:      get all share tradingCode as an Array
  @access:    public
*/
const getStocksList = async (req, res, next) => {
  const allStocks = await Fundamental.find({ isActive: true }).select(
    "tradingCode"
  );
  const stocks = allStocks.map((item) => item.tradingCode);
  res.status(200).json(stocks);
};

/*
  @api:       GET /api/prices/getAllStocks
  @desc:      get all share details as object
  @access:    public
*/
const getAllStocks = async (req, res, next) => {
  const allStocks = await Fundamental.find({ isActive: true }).select(
    "tradingCode companyName sector category yearEnd"
  );
  res.status(200).json(allStocks);
};

/*
  @api:       GET /api/prices/getStocksList
  @desc:      get all share tradingCode as an Array
  @access:    public
*/
const getIpoList = async (req, res, next) => {
  const today = new Date();
  // today.setMinutes(0);
  // today.setSeconds(0);
  // today.setHours(0);
  // today.setMilliseconds(0);
  // console.log(today);

  const ipo = await Ipo.find({
    subscriptionEnd: {
      $gte: today,
    },
    isActive: true,
  });

  res.status(200).json(ipo);
};

/*
  @api:       GET /api/prices/latestPrice/
  @desc:      get latest share prices for all shares
  @access:    public
*/
const latestPrice = async (req, res, next) => {
  const latestPrice = await DayMinutePrice.aggregate([
    {
      $sort: {
        time: 1,
      },
    },
    {
      $group: {
        _id: "$tradingCode",
        open: { $first: "$ltp" },
        high: { $last: "$high" },
        low: { $last: "$low" },
        close: { $last: "$close" },
        ltp: { $last: "$ltp" },
        ycp: { $first: "$ycp" },
        change: { $last: "$change" },
        percentChange: { $last: "$percentChange" },
        trade: { $last: "$trade" },
        volume: { $last: "$volume" },
        value: { $last: "$value" },
      },
    },
    {
      $lookup: {
        from: "fundamentals",
        localField: "_id",
        foreignField: "tradingCode",
        as: "fundamentals",
      },
    },
    { $unwind: "$fundamentals" },
    {
      $addFields: {
        tradingCode: "$_id",
        sector: "$fundamentals.sector",
        category: "$fundamentals.category",
        companyName: "$fundamentals.companyName",
      },
    },
    {
      $project: { fundamentals: 0, _id: 0 },
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
        from: "day_minute_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "minute_prices",
      },
    },
    { $unwind: "$minute_prices" },
    {
      $group: {
        _id: "$minute_prices.time",
        // date: { $first: "$date" },
        ltp: { $avg: "$minute_prices.ltp" },
        ycp: { $avg: "$minute_prices.ycp" },
        high: { $avg: "$minute_prices.high" },
        low: { $avg: "$minute_prices.low" },
        close: { $avg: "$minute_prices.ltp" },
        change: { $avg: "$minute_prices.change" },
        trade: { $sum: "$minute_prices.trade" },
        value: { $sum: "$minute_prices.value" },
        volume: { $sum: "$minute_prices.volume" },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        time: "$_id",
        _id: 0,
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
  ]);

  const dailySector = await DailySector.aggregate([
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
              _id: "$fundamentals.sector",
              date: { $first: "$date" },
              ltp: { $avg: "$ltp" },
              ycp: { $avg: "$ycp" },
              high: { $avg: "$high" },
              low: { $avg: "$low" },
              open: { $avg: "$open" },
              close: { $avg: "$close" },
              change: { $avg: "$change" },
              trade: { $sum: "$trade" },
              value: { $sum: "$value" },
              volume: { $sum: "$volume" },
            },
          },
          {
            $project: {
              sector: "$_id",
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
      $facet: {
        daily: [],
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
              ltp: { $last: "$ltp" },
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
              ltp: { $avg: "$ltp" },
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

  const { dailyPriceUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select("dailyPriceUpdateDate minuteDataUpdateDate");

  let minutePrice = await DayMinutePrice.aggregate([
    {
      $match: {
        tradingCode,
        ltp: { $ne: 0 },
      },
    },
    {
      $facet: {
        latest: [
          {
            $sort: {
              time: 1,
            },
          },
          {
            $group: {
              _id: null,
              open: { $first: "$ltp" },
              high: { $last: "$high" },
              low: { $last: "$low" },
              close: { $last: "$close" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              change: { $last: "$change" },
              percentChange: { $last: "$percentChange" },
              trade: { $last: "$trade" },
              volume: { $last: "$volume" },
              value: { $last: "$value" },
            },
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
              value: 1,
              volume: 1,
              trade: 1,
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
        coll: "day_minute_prices",
        pipeline: [
          {
            $match: {
              tradingCode: tradingCode,
              date: {
                $gt: dailyPriceUpdateDate,
              },
              ltp: { $ne: 0 },
            },
          },
          {
            $sort: {
              time: 1,
            },
          },
          {
            $group: {
              _id: null,
              date: { $first: "$date" },
              open: { $first: "$ltp" },
              high: { $last: "$high" },
              low: { $last: "$low" },
              close: { $last: "$ltp" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              // change: { $last: "$change" },
              // percentChange: { $last: "$percentChange" },
              // trade: { $last: "$trade" },
              // value: { $last: "$value" },
              volume: { $last: "$volume" },
            },
          },
          {
            $project: { _id: 0 },
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
              open: 1,
              high: 1,
              low: 1,
              close: 1,
              ltp: 1,
              ycp: 1,
              volume: 1,
            },
          },
        ],
        weekly: [
          {
            $match: {
              ltp: { $ne: 0 },
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
              open: { $first: "$open" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$ltp" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              volume: { $sum: "$volume" },
              // trade: { $sum: "$trade" },
              // value: { $sum: "$value" },
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
              ltp: { $ne: 0 },
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
              open: { $first: "$open" },
              high: { $max: "$high" },
              low: { $min: "$low" },
              close: { $last: "$ltp" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              volume: { $sum: "$volume" },
              // trade: { $sum: "$trade" },
              // value: { $sum: "$value" },
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

  const sector = fundamentalsBasic.sector;

  let latestPrice;

  if (minutePrice.length > 0) {
    latestPrice = minutePrice[0].latest;
  } else {
    const price = await LatestPrice.aggregate([
      {
        $match: {
          tradingCode,
        },
      },
      {
        $addFields: {
          ltp: "$ycp",
          open: "$ycp",
          high: "$ycp",
          low: "$ycp",
          close: "$ycp",
          isNullDataAtDse: "YES",
        },
      },
    ]);
    latestPrice = price[0];

    minutePrice.push({
      latest: latestPrice,
      minute: [latestPrice],
    });
  }

  // const ltp = latestPrice.ltp > 0 ? latestPrice.ltp : latestPrice.ycp;
  const ltp = latestPrice.ltp;
  const ycp = latestPrice.ycp;

  // return res.json(latestPrice);

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

  const isMarketOpen = await getMarketOpenStatus();

  res.status(200).json({
    ...minutePrice[0],
    ...dailyPrice[0],
    fundamentals: { ...fundamentalsBasic._doc, ...fundamentalsExtended },
    isMarketOpen,
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
  const { minuteDataUpdateDate, dataInsertionEnable } = await Setting.findOne();

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

  const isMarketOpen = await getMarketOpenStatus();

  res.status(200).json({ ...index[0], isMarketOpen });
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
  } else if (tradingCode === "lastday") {
    const { dailyBlockTrUpdateDate } = await Setting.findOne().select(
      "dailyBlockTrUpdateDate"
    );
    blocktr = await BlockTr.find({ date: dailyBlockTrUpdateDate })
      .sort({ value: -1 })
      .limit(queryLimit);
  } else {
    blocktr = await BlockTr.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }

  res.status(200).json(blocktr);
};

/*
  @api:       GET /api/prices/allGainerLoser?limit=10
  @desc:      get gainer and losers data
  @access:    public
*/
const allGainerLoser = async (req, res, next) => {
  const { limit } = url.parse(req.url, true).query;

  const setLimit = limit ? Number(limit) : 500;

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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              change: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
              companyName: "$fundamentals.companyName",
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
          {
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              change: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
              companyName: "$fundamentals.companyName",
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
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
            $limit: setLimit,
          },
          {
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              fiveYearPercentChange: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
        ],
        valueDaily: [
          {
            $match: {
              $expr: {
                $gt: ["$value", "$yesterday_price.value"],
              },
            },
          },
          {
            $addFields: {
              yesterdayDataPoint: {
                $cond: [
                  { $gt: ["$yesterday_price.value", 0] },
                  "$yesterday_price.value",
                  0.000001,
                ],
              },
            },
          },
          {
            $addFields: {
              percentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: ["$value", "$yesterdayDataPoint"],
                          },
                          "$yesterdayDataPoint",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: {
                $cond: [
                  { $gte: ["$percentChange", 10000] },
                  100,
                  "$percentChange",
                ],
              },
              change: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
              companyName: "$fundamentals.companyName",
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        valueOneWeek: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneWeekBeforeValue"],
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
                              "$yesterday_price.oneWeekBeforeValue",
                            ],
                          },
                          "$yesterday_price.oneWeekBeforeValue",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              oneWeekPercentChange: {
                $cond: [
                  { $gte: ["$oneWeekPercentChange", 10000] },
                  100,
                  "$oneWeekPercentChange",
                ],
              },
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneWeekPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        valueOneMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneMonthBeforeValue"],
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
                              "$yesterday_price.oneMonthBeforeValue",
                            ],
                          },
                          "$yesterday_price.oneMonthBeforeValue",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: {
                $cond: [
                  { $gte: ["$oneMonthPercentChange", 10000] },
                  100,
                  "$oneMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        valueSixMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.sixMonthBeforeValue"],
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
                              "$yesterday_price.sixMonthBeforeValue",
                            ],
                          },
                          "$yesterday_price.sixMonthBeforeValue",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: {
                $cond: [
                  { $gte: ["$sixMonthPercentChange", 10000] },
                  100,
                  "$sixMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              sixMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        valueOneYear: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneYearBeforeValue"],
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
                              "$yesterday_price.oneYearBeforeValue",
                            ],
                          },
                          "$yesterday_price.oneYearBeforeValue",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: {
                $cond: [
                  { $gte: ["$oneYearPercentChange", 10000] },
                  100,
                  "$oneYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        valueFiveYear: [
          {
            $match: {
              "yesterday_price.fiveYearBeforeValue": {
                $ne: "-",
              },
              $expr: {
                $gt: ["$ltp", "$yesterday_price.fiveYearBeforeValue"],
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
                              "$yesterday_price.fiveYearBeforeValue",
                            ],
                          },
                          "$yesterday_price.fiveYearBeforeValue",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: {
                $cond: [
                  { $gte: ["$fiveYearPercentChange", 10000] },
                  100,
                  "$fiveYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              fiveYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeDaily: [
          {
            $match: {
              $expr: {
                $gt: ["$volume", "$yesterday_price.volume"],
              },
            },
          },
          {
            $addFields: {
              yesterdayDataPoint: {
                $cond: [
                  { $gt: ["$yesterday_price.volume", 0] },
                  "$yesterday_price.volume",
                  0.000001,
                ],
              },
            },
          },
          {
            $addFields: {
              percentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: ["$volume", "$yesterdayDataPoint"],
                          },
                          "$yesterdayDataPoint",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: {
                $cond: [
                  { $gte: ["$percentChange", 10000] },
                  100,
                  "$percentChange",
                ],
              },
              change: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
              companyName: "$fundamentals.companyName",
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeOneWeek: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneWeekBeforeVolume"],
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
                              "$yesterday_price.oneWeekBeforeVolume",
                            ],
                          },
                          "$yesterday_price.oneWeekBeforeVolume",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              oneWeekPercentChange: {
                $cond: [
                  { $gte: ["$oneWeekPercentChange", 10000] },
                  100,
                  "$oneWeekPercentChange",
                ],
              },
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneWeekPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeOneMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneMonthBeforeVolume"],
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
                              "$yesterday_price.oneMonthBeforeVolume",
                            ],
                          },
                          "$yesterday_price.oneMonthBeforeVolume",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: {
                $cond: [
                  { $gte: ["$oneMonthPercentChange", 10000] },
                  100,
                  "$oneMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeSixMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.sixMonthBeforeVolume"],
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
                              "$yesterday_price.sixMonthBeforeVolume",
                            ],
                          },
                          "$yesterday_price.sixMonthBeforeVolume",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: {
                $cond: [
                  { $gte: ["$sixMonthPercentChange", 10000] },
                  100,
                  "$sixMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              sixMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeOneYear: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneYearBeforeVolume"],
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
                              "$yesterday_price.oneYearBeforeVolume",
                            ],
                          },
                          "$yesterday_price.oneYearBeforeVolume",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: {
                $cond: [
                  { $gte: ["$oneYearPercentChange", 10000] },
                  100,
                  "$oneYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        volumeFiveYear: [
          {
            $match: {
              "yesterday_price.fiveYearBeforeVolume": {
                $ne: "-",
              },
              $expr: {
                $gt: ["$ltp", "$yesterday_price.fiveYearBeforeVolume"],
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
                              "$yesterday_price.fiveYearBeforeVolume",
                            ],
                          },
                          "$yesterday_price.fiveYearBeforeVolume",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: {
                $cond: [
                  { $gte: ["$fiveYearPercentChange", 10000] },
                  100,
                  "$fiveYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              fiveYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeDaily: [
          {
            $match: {
              $expr: {
                $gt: ["$trade", "$yesterday_price.trade"],
              },
            },
          },
          {
            $addFields: {
              yesterdayDataPoint: {
                $cond: [
                  { $gt: ["$yesterday_price.trade", 0] },
                  "$yesterday_price.trade",
                  0.000001,
                ],
              },
            },
          },
          {
            $addFields: {
              percentChange: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: ["$trade", "$yesterdayDataPoint"],
                          },
                          "$yesterdayDataPoint",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: {
                $cond: [
                  { $gte: ["$percentChange", 10000] },
                  100,
                  "$percentChange",
                ],
              },
              change: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
              companyName: "$fundamentals.companyName",
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeOneWeek: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneWeekBeforeTrade"],
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
                              "$yesterday_price.oneWeekBeforeTrade",
                            ],
                          },
                          "$yesterday_price.oneWeekBeforeTrade",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              oneWeekPercentChange: {
                $cond: [
                  { $gte: ["$oneWeekPercentChange", 10000] },
                  100,
                  "$oneWeekPercentChange",
                ],
              },
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneWeekPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeOneMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneMonthBeforeTrade"],
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
                              "$yesterday_price.oneMonthBeforeTrade",
                            ],
                          },
                          "$yesterday_price.oneMonthBeforeTrade",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: {
                $cond: [
                  { $gte: ["$oneMonthPercentChange", 10000] },
                  100,
                  "$oneMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeSixMonth: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.sixMonthBeforeTrade"],
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
                              "$yesterday_price.sixMonthBeforeTrade",
                            ],
                          },
                          "$yesterday_price.sixMonthBeforeTrade",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: {
                $cond: [
                  { $gte: ["$sixMonthPercentChange", 10000] },
                  100,
                  "$sixMonthPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              sixMonthPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeOneYear: [
          {
            $match: {
              $expr: {
                $gt: ["$ltp", "$yesterday_price.oneYearBeforeTrade"],
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
                              "$trade",
                              "$yesterday_price.oneYearBeforeTrade",
                            ],
                          },
                          "$yesterday_price.oneYearBeforeTrade",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: {
                $cond: [
                  { $gte: ["$oneYearPercentChange", 10000] },
                  100,
                  "$oneYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              oneYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
          },
        ],
        tradeFiveYear: [
          {
            $match: {
              "yesterday_price.fiveYearBeforeTrade": {
                $ne: "-",
              },
              $expr: {
                $gt: ["$ltp", "$yesterday_price.fiveYearBeforeTrade"],
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
                              "$yesterday_price.fiveYearBeforeTrade",
                            ],
                          },
                          "$yesterday_price.fiveYearBeforeTrade",
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
            $project: {
              id: "$_id",
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: {
                $cond: [
                  { $gte: ["$fiveYearPercentChange", 10000] },
                  100,
                  "$fiveYearPercentChange",
                ],
              },
              ltp: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: "$fundamentals.category",
              sector: "$fundamentals.sector",
            },
          },
          {
            $sort: {
              fiveYearPercentChange: -1,
            },
          },
          {
            $limit: setLimit,
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
      $match: {
        isActive: true,
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
        totalShares: {
          $round: [
            {
              $divide: ["$totalShares", 10000000],
            },
            2,
          ],
        },
        reserve: "$reserveSurplusWithoutOci",
        marketCap: {
          $round: [
            {
              $divide: ["$marketCap", 10],
            },
            2,
          ],
        },
        paidUpCap: {
          $round: [
            {
              $divide: ["$paidUpCap", 10],
            },
            2,
          ],
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
          $round: [
            {
              $add: [
                "$screener.shareholding.current.institute",
                "$screener.shareholding.current.public",
                "$screener.shareholding.current.foreign",
              ],
            },
            2,
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

  res.status(200).json(data);
};

/*
  @api:       GET /api/prices/topFinancials?setlimit={linit}
  @desc:      get gainer and losers data
  @access:    public
*/
const topFinancials = async (req, res, next) => {
  const { setlimit } = url.parse(req.url, true).query;

  const limit = setlimit ? Number(setlimit) : 8;

  const data = await Fundamental.aggregate([
    {
      $match: {
        isActive: true,
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
        epsCurrent: {
          $cond: [{ $eq: ["$epsCurrent", 0] }, 0.000001, "$epsCurrent"],
        },
      },
    },
    {
      $project: {
        id: "$_id",
        tradingCode: 1,
        ltp: 1,
        epsCurrent: 1,
        percentChange: "$latest_prices.percentChange",
        marketCap: {
          $round: [
            {
              $divide: ["$marketCap", 10],
            },
            2,
          ],
        },
        pe: {
          $round: [{ $divide: ["$ltp", "$epsCurrent"] }, 2],
        },
        reserveSurplus: "$screener.reserveSurplus.value",
        roe: "$screener.roe.value",
        roa: "$screener.roa.value",
        currentRatio: "$screener.currentRatio.value",
        cashDividend: "$screener.dividend.cash",
        revenue: {
          $round: [
            {
              $divide: ["$screener.revenue.value", 10000000],
            },
            2,
          ],
        },
        totalAsset: {
          $round: [
            {
              $divide: ["$screener.totalAsset.value", 10000000],
            },
            2,
          ],
        },
        navYearly: "$screener.navYearly.value",
        nocfpsYearly: "$screener.nocfpsYearly.value",
      },
    },
    {
      $facet: {
        pe: [
          {
            $match: {
              pe: {
                $gt: 0,
              },
            },
          },
          {
            $sort: {
              pe: 1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$pe",
            },
          },
        ],
        eps: [
          {
            $sort: {
              epsCurrent: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$epsCurrent",
            },
          },
        ],
        marketCap: [
          {
            $sort: {
              marketCap: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$marketCap",
            },
          },
        ],
        reserve: [
          {
            $sort: {
              reserveSurplus: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$reserveSurplus",
            },
          },
        ],
        roe: [
          {
            $sort: {
              roe: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$roe",
            },
          },
        ],
        roa: [
          {
            $sort: {
              roa: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$roa",
            },
          },
        ],
        currentRatio: [
          {
            $sort: {
              currentRatio: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$currentRatio",
            },
          },
        ],
        dividend: [
          {
            $sort: {
              cashDividend: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$cashDividend",
            },
          },
        ],
        revenue: [
          {
            $sort: {
              revenue: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$revenue",
            },
          },
        ],
        nav: [
          {
            $sort: {
              navYearly: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$navYearly",
            },
          },
        ],
        nocfps: [
          {
            $sort: {
              nocfpsYearly: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$nocfpsYearly",
            },
          },
        ],
        totalAsset: [
          {
            $sort: {
              totalAsset: -1,
            },
          },
          {
            $limit: limit,
          },
          {
            $project: {
              tradingCode: 1,
              ltp: 1,
              percentChange: 1,
              value: "$totalAsset",
            },
          },
        ],
      },
    },
  ]);
  res.status(200).json(data[0]);
};

/*
  Not in use
*/

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

    return {
      code: item.tradingCode,
      cashDividend: data,
      epsCurrent: item.epsCurrent,
      ltp: item.ltp,
    };
  });

  res.send(result);
};

/*
  Helper functions
*/
const formatCandleChartData = (data) => {
  // console.log(data);
  let candle = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    const open = item.open !== 0 ? item.open : item.ycp;
    const close = item.ltp;

    if (close === 0) {
      candle.push({
        time: item.time,
        open: open,
        high: item.ycp,
        low: item.ycp,
        close: item.ycp,
        volume: item.volume,
      });
    } else {
      candle.push({
        time: item.time,
        open: open,
        high: item.high,
        low: item.low,
        close: close,
        volume: item.volume,
      });
    }
  }
  return candle;
};

module.exports = {
  getSymbolTvchart,
  getBarsTvchart,
  getAllStocks,
  getStocksList,
  getIpoList,
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
  topFinancials,
  pytest,
  newtest,
};
