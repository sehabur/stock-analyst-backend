const url = require("url");
const { DateTime } = require("luxon");
// const createError = require("http-errors");
const axios = require("axios");
const { JSDOM } = require("jsdom");

const MinutePrice = require("../models/minutePriceModel");
const Fundamental = require("../models/fundamentalModel");
const DailyPrice = require("../models/dailyPriceModel");
const DailySector = require("../models/dailySectorModel");
const LatestPrice = require("../models/latestPriceModel");
const News = require("../models/newsModel");
const BlockTr = require("../models/blockTranxModel");
const MinuteIndex = require("../models/minuteIndexModel");
// const DailyIndex = require("../models/dailyIndexModel");
const Setting = require("../models/settingModel");
const DayMinutePrice = require("../models/onedayMinutePriceModel");
const Ipo = require("../models/ipoModel");
const DayMinuteIndex = require("../models/onedayMinuteIndexModel");
const YesterdayPrice = require("../models/yesterdayPriceModel");
const HaltStatus = require("../models/haltStatusModel");

const {
  sectorList,
  circuitUpMoveRange,
  circuitDownMoveRange,
  // ds30Shares,
  dsexShares,
} = require("../data/dse");

const { marketStatusHelper } = require("../helper/price");

const {
  calculateSmaLastValue,
  calculateEmaLastValue,
  calculateRsiLastValue,
  calculateStochasticKLastValue,
  calculateAdxLastValue,
  calculateMacdLastValue,
  calculateWilliamsPercentRLastValue,
  calculateMoneyFlowIndexLastValue,
  calculatePivotPoints,
} = require("../helper/movingAverage");

/*
  @api:       GET /api/prices/getSymbolTvchart/
  @desc:      get all Symbol for TV chart
  @access:    public
*/
const getSymbolTvchart = async (req, res) => {
  const data = await Fundamental.find({ isActive: true, type: "stock" }).select(
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
          {
            code: "DS30",
            name: "DHAKA STOCK EXCHANGE 30",
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
  // try {
  let { symbol, symbolType, resolutionType, fromTime, toTime, limit } =
    url.parse(req.url, true).query;

  let dataTable;

  let latestPrice = [];

  if (resolutionType == "day" && symbolType != "sector") {
    dataTable = "daily_prices";

    if (symbolType == "index") {
      symbol = "00" + symbol;
    }

    const priorDayCount = 14;

    const prices = await DailyPrice.aggregate([
      {
        $match: {
          tradingCode: symbol,
          date: {
            $gte: new Date((fromTime - 86400 * priorDayCount) * 1000),
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
          open: { $cond: [{ $gt: ["$open", 0] }, "$open", "$ycp"] },
          high: { $cond: [{ $gt: ["$high", 0] }, "$high", "$ycp"] },
          low: { $cond: [{ $gt: ["$low", 0] }, "$low", "$ycp"] },
          close: { $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"] },
          ltp: { $cond: [{ $gt: ["$ltp", 0] }, "$ltp", "$ycp"] },
          ycp: 1,
          volume: 1,
        },
      },
      // {
      //   $project: {
      //     time: { $toLong: "$date" },
      //     open: 1,
      //     close: 1,
      //     high: 1,
      //     low: 1,
      //     ltp: 1,
      //     ycp: 1,
      //     volume: 1,
      //   },
      // },
    ]);

    if (new Date() < new Date(toTime * 1000)) {
      const { dailyPriceUpdateDate, dailyIndexUpdateDate } =
        await Setting.findOne().select(
          "dailyPriceUpdateDate dailyIndexUpdateDate"
        );
      todayPrices = [];
      if (symbolType == "stock") {
        todayPrices = await DayMinutePrice.aggregate([
          {
            $match: {
              tradingCode: symbol,
              date: {
                $gt: dailyPriceUpdateDate,
              },
              close: { $ne: 0 },
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
              close: { $last: "$close" },
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
      } else if (symbolType == "index") {
        todayPrices = await DayMinuteIndex.aggregate([
          {
            $match: {
              tradingCode: symbol,
              date: {
                $gt: dailyIndexUpdateDate,
              },
              index: { $ne: 0 },
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
              open: { $first: "$index" },
              high: { $max: "$index" },
              low: { $min: "$index" },
              close: { $last: "$index" },
              ltp: { $last: "$index" },
              // ycp: { $first: "$index" },
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
              // ycp: 1,
              volume: 1,
            },
          },
        ]);
      }

      latestPrice = [...prices, ...todayPrices];
    } else {
      latestPrice = prices;
    }
  } else if (resolutionType == "intraday" && symbolType == "stock") {
    dataTable = "minute_prices";

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
  } else if (resolutionType == "intraday" && symbolType == "index") {
    dataTable = "index_minute_values";

    let prices;

    if (symbol == "00DSEX") {
      prices = await MinuteIndex.aggregate([
        {
          $match: {
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
            open: "$dsex.index",
            ycp: "$dsex.index",
            close: "$dsex.index",
            ltp: "$dsex.index",
            high: "$dsex.index",
            low: "$dsex.index",
            volume: "$totalVolume",
          },
        },
      ]);
    } else if (symbol == "00DSES") {
      prices = await MinuteIndex.aggregate([
        {
          $match: {
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
            open: "$dses.index",
            ycp: "$dses.index",
            close: "$dses.index",
            ltp: "$dses.index",
            high: "$dses.index",
            low: "$dses.index",
            volume: "$totalVolume",
          },
        },
      ]);
    } else if (symbol == "00DS30") {
      prices = await MinuteIndex.aggregate([
        {
          $match: {
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
            open: "$dse30.index",
            ycp: "$dse30.index",
            close: "$dse30.index",
            ltp: "$dse30.index",
            high: "$dse30.index",
            low: "$dse30.index",
            volume: "$totalVolume",
          },
        },
      ]);
    }

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
  } else if (resolutionType == "day" && symbolType == "sector") {
    dataTable = "daily_sectors";

    console.log(symbol, new Date(fromTime * 1000), new Date(toTime * 1000));

    const sectorPrices = await DailySector.aggregate([
      {
        $match: {
          sector: symbol,
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
          date: 1,
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
      const { dailySectorUpdateDate, minuteDataUpdateDate } =
        await Setting.findOne().select(
          "dailySectorUpdateDate minuteDataUpdateDate"
        );

      const todayPrices = await LatestPrice.aggregate([
        {
          $match: {
            date: {
              $gt: dailySectorUpdateDate,
            },
          },
        },
        {
          $addFields: {
            close: {
              $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
            },
          },
        },
        {
          $unionWith: {
            coll: "inactive_stocks",
            pipeline: [
              {
                $addFields: {
                  date: minuteDataUpdateDate,
                  ltp: "$price",
                  high: "$price",
                  low: "$price",
                  close: "$price",
                  open: "$price",
                  ycp: "$price",
                  trade: 0,
                  value: 0,
                  volume: 0,
                },
              },
              {
                $match: {
                  date: {
                    $gt: dailySectorUpdateDate,
                  },
                },
              },
            ],
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
            "fundamentals.sector": symbol,
          },
        },
        {
          $group: {
            _id: null,
            date: { $first: "$date" },
            ltp: { $avg: "$ltp" },
            // ycp: { $avg: "$ycp" },
            high: { $avg: "$high" },
            low: { $avg: "$low" },
            open: { $avg: "$ycp" },
            close: { $avg: "$close" },
            // trade: { $sum: "$trade" },
            // value: { $sum: "$value" },
            volume: { $sum: "$volume" },
          },
        },
        {
          $project: {
            _id: 0,
            time: { $toLong: "$date" },
            ltp: { $round: ["$ltp", 2] },
            ycp: { $round: ["$ycp", 2] },
            high: { $round: ["$high", 2] },
            low: { $round: ["$low", 2] },
            close: { $round: ["$close", 2] },
            open: { $round: ["$open", 2] },
            // change: { $round: [{ $subtract: ["$ltp", "$ycp"] }, 2] },
            // percentChange: {
            //   $round: [
            //     {
            //       $multiply: [
            //         { $divide: [{ $subtract: ["$ltp", "$ycp"] }, "$ycp"] },
            //         100,
            //       ],
            //     },
            //     2,
            //   ],
            // },
            // trade: 1,
            // value: 1,
            volume: 1,
          },
        },
      ]);
      latestPrice = [...sectorPrices, ...todayPrices];
    } else {
      latestPrice = [...sectorPrices];
    }
  }

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
  @api:       GET /api/prices/getMarketOpenStatus
  @desc:      get latest open/close and time updates of market
  @access:    public
*/
const getMarketStatus = async (req, res, next) => {
  const {
    dataInsertionEnable,
    ipoUpdateTime,
    minuteDataUpdateTime,
    dailyBlockTrUpdateDate,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
    dataFetchStartHour,
    dataFetchStartMinute,
    dataFetchEndHour,
    dataFetchEndMinute,
    androidVersionCode,
    iosVersionCode,
  } = await Setting.findOne();

  const { statusText, isOpen } = await marketStatusHelper(
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute
  );

  res.status(200).json({
    statusText,
    isOpen,
    ipoUpdateTime,
    minuteDataUpdateTime,
    dailyBlockTrUpdateDate,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
    dataFetchStartHour,
    dataFetchStartMinute,
    dataFetchEndHour,
    dataFetchEndMinute,
    androidVersionCode,
    iosVersionCode,
  });
};

/*
  @api:       GET /api/prices/getStocksList
  @desc:      get all share tradingCode as an Array
  @access:    public
*/
const getStocksList = async (req, res, next) => {
  const allStocks = await Fundamental.find({
    isActive: true,
    type: "stock",
  }).select("tradingCode");
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
  const ipo = await Ipo.find({ isActive: true })
    .sort({ subscriptionEnd: -1 })
    .limit(20);
  res.status(200).json(ipo);
};

/*
  @api:       GET /api/prices/getIndexInfo
  @desc:      get Index Info
  @access:    public
*/
const getIndexInfo = async (req, res, next) => {
  const {
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
  } = await Setting.findOne();

  const marketOpenStatus = await marketStatusHelper(
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute
  );

  const index = await DayMinuteIndex.aggregate([
    {
      $match: {
        tradingCode: "00DSEX",
      },
    },
    {
      $sort: {
        time: -1,
      },
    },
    {
      $limit: 1,
    },
  ]);

  res.status(200).json({
    Status: "success",
    Data: {
      marketOpenStatus: marketOpenStatus.statusText,
      indexLatestData: index[0],
    },
  });
};

/*
  @api:       GET /api/prices/latestPrice/
  @desc:      get latest share prices for all shares
  @access:    public
*/
const latestPrice = async (req, res, next) => {
  const { dailyPriceUpdateDate, dailySectorUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select(
      "dailyPriceUpdateDate dailySectorUpdateDate minuteDataUpdateDate"
    );
  DayMinutePrice;

  const latestPrice = await DailyPrice.aggregate([
    {
      $match: {
        date: minuteDataUpdateDate,
      },
    },
    {
      $unionWith: {
        coll: "day_minute_prices",
        pipeline: [
          {
            $match: {
              date: {
                $gt: dailyPriceUpdateDate,
              },
            },
          },
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
            $project: {
              tradingCode: "$_id",
              _id: 0,
              open: 1,
              high: 1,
              low: 1,
              close: 1,
              ltp: 1,
              ycp: 1,
              change: 1,
              percentChange: 1,
              volume: 1,
              trade: 1,
              value: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        close: {
          $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
        },
      },
    },
    {
      $unionWith: {
        coll: "index_day_minute_values",
        pipeline: [
          {
            $match: {
              index: { $ne: 0 },
              date: {
                $gt: dailyPriceUpdateDate,
              },
            },
          },
          {
            $group: {
              _id: "$tradingCode",
              open: { $first: "$index" },
              high: { $max: "$index" },
              low: { $min: "$index" },
              close: { $last: "$index" },
              ltp: { $last: "$index" },
              ycp: { $first: "$index" },
              change: { $last: "$change" },
              percentChange: { $last: "$percentChange" },
              volume: { $last: "$volume" },
              trade: { $last: "$trade" },
              value: { $last: "$value" },
            },
          },
          {
            $project: {
              tradingCode: "$_id",
              _id: 0,
              open: { $round: ["$open", 2] },
              high: { $round: ["$high", 2] },
              low: { $round: ["$low", 2] },
              close: { $round: ["$close", 2] },
              ltp: { $round: ["$ltp", 2] },
              ycp: { $round: ["$ycp", 2] },
              change: { $round: ["$change", 2] },
              percentChange: { $round: ["$percentChange", 2] },
              value: 1,
              volume: 1,
              trade: 1,
            },
          },
        ],
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
    { $unwind: { path: "$fundamentals" } },
    {
      $lookup: {
        from: "halt_shares",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "halt_shares",
        pipeline: [
          {
            $match: {
              date: minuteDataUpdateDate,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$halt_shares", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        sector: "$fundamentals.sector",
        category: "$fundamentals.category",
        companyName: "$fundamentals.companyName",
        type: "$fundamentals.type",
        recordDate: "$fundamentals.recordDate",
        haltStatus: "$halt_shares.status",
      },
    },
    {
      $sort: { tradingCode: 1 },
    },
    {
      $project: { fundamentals: 0, halt_shares: 0, _id: 0 },
    },
  ]);

  const sectorPrice = await DailySector.aggregate([
    {
      $match: {
        date: minuteDataUpdateDate,
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
            $addFields: {
              close: {
                $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
              },
            },
          },
          {
            $unionWith: {
              coll: "inactive_stocks",
              pipeline: [
                {
                  $addFields: {
                    date: minuteDataUpdateDate,
                    ltp: "$price",
                    ycp: "$price",
                    high: "$price",
                    low: "$price",
                    close: "$price",
                    open: "$price",
                    change: 0,
                    percentChange: 0,
                    trade: 0,
                    value: 0,
                    volume: 0,
                  },
                },
                {
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
              ],
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
          {
            $unwind: "$fundamentals",
          },
          {
            $group: {
              _id: "$fundamentals.sector",
              date: { $first: "$date" },
              open: { $avg: "$ycp" },
              high: { $avg: "$high" },
              low: { $avg: "$low" },
              close: { $avg: "$close" },
              ltp: { $avg: "$ltp" },
              ycp: { $avg: "$ycp" },
              trade: { $sum: "$trade" },
              volume: { $sum: "$volume" },
              value: { $sum: "$value" },
            },
          },
          {
            $project: {
              _id: 0,
              sector: "$_id",
              date: 1,
              open: { $round: ["$open", 2] },
              high: { $round: ["$high", 2] },
              low: { $round: ["$low", 2] },
              close: { $round: ["$close", 2] },
              ycp: { $round: ["$ycp", 2] },
              ltp: { $round: ["$ltp", 2] },
              volume: { $round: ["$volume", 2] },
              value: { $round: ["$value", 2] },
              trade: { $round: ["$trade", 2] },
              change: { $round: [{ $subtract: ["$close", "$ycp"] }, 2] },
              percentChange: {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $subtract: ["$close", "$ycp"] }, "$ycp"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              volume: 1,
              trade: 1,
              value: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        companyName: "$sector",
        sectorTag: {
          $toLower: {
            $arrayElemAt: [{ $split: ["$sector", " "] }, 0],
          },
        },
        tradingCode: "$sector",
        type: "sector",
      },
    },
    {
      $match: {
        tradingCode: { $ne: null },
      },
    },
  ]);

  res.status(200).json([...sectorPrice, ...latestPrice]);
};

/*
  @api:       GET /api/prices/indexMover?type={all | top}&count={count}
  @desc:      get latest share prices for all shares
  @access:    public
*/
const indexMover = async (req, res, next) => {
  const { type, count } = url.parse(req.url, true).query;

  const latestPrice = await LatestPrice.aggregate([
    {
      $match: {
        close: { $ne: 0 },
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
      $project: {
        id: "$_id",
        _id: 0,
        tradingCode: 1,
        marketCap: "$fundamentals.marketCap",
        open: "$ycp",
        close: 1,
      },
    },
  ]);

  const { minuteDataUpdateDate } = await Setting.findOne();

  const index = await MinuteIndex.aggregate([
    {
      $match: {
        date: minuteDataUpdateDate,
      },
    },
    {
      $sort: {
        time: 1,
      },
    },
    {
      $limit: 1,
    },
  ]);

  const totalMarketCap = latestPrice
    .filter((stock) => dsexShares.includes(stock.tradingCode))
    .reduce((total, current) => {
      return total + current.marketCap;
    }, 0);

  const movers = latestPrice.map((stock) => ({
    ...stock,
    indexMove: Number(
      (
        ((stock.close - stock.open) * stock.marketCap * index[0].dsex.index) /
        (stock.open * totalMarketCap)
      ).toFixed(2)
    ),
  }));
  let finalRes;

  const loser = movers
    .filter((item) => item.indexMove < 0)
    .sort((a, b) => a.indexMove - b.indexMove);

  const gainer = movers
    .filter((item) => item.indexMove > 0)
    .sort((a, b) => b.indexMove - a.indexMove);

  if (type == "all") {
    finalRes = {
      gainer,
      loser,
    };
  } else if (type == "top") {
    finalRes = {
      gainer: gainer.slice(0, Number(count)),
      loser: loser.slice(0, Number(count)),
    };
  }

  res.status(200).json(finalRes);
};

/*
  @api:       GET /api/prices/allStockBeta?type={all | top}&count={count}
  @desc:      get latest share prices for all shares
  @access:    public
*/
const allStockBeta = async (req, res, next) => {
  const { type, count } = url.parse(req.url, true).query;

  const beta = await LatestPrice.aggregate([
    {
      $addFields: {
        close: {
          $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
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
      $project: {
        id: "$_id",
        _id: 0,
        tradingCode: 1,
        beta: "$fundamentals.technicals.beta",
        close: 1,
      },
    },
  ]);

  const loser = beta
    .filter((item) => item.beta < 0)
    .sort((a, b) => a.beta - b.beta);

  const gainer = beta
    .filter((item) => item.beta > 0)
    .sort((a, b) => b.beta - a.beta);

  if (type == "all") {
    finalRes = {
      gainer,
      loser,
    };
  } else if (type == "top") {
    finalRes = {
      gainer: gainer.slice(0, Number(count)),
      loser: loser.slice(0, Number(count)),
    };
  }

  res.status(200).json(finalRes);
};

/*
  @api:       GET /api/prices/sectorGainValueSummary
  @desc:      get latest share prices group by sector
  @access:    public
*/
const sectorGainValueSummary = async (req, res, next) => {
  const price = await LatestPrice.aggregate([
    {
      $unionWith: {
        coll: "inactive_stocks",
      },
    },
    {
      $lookup: {
        from: "fundamentals",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "fundamentals",
        pipeline: [
          {
            $project: {
              sector: 1,
              category: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$fundamentals" },
    {
      $group: {
        _id: "$fundamentals.sector",
        totalShare: { $sum: 1 },
        uptrend: {
          $sum: {
            $cond: [{ $gt: ["$change", 0] }, 1, 0],
          },
        },
        downtrend: {
          $sum: {
            $cond: [{ $lt: ["$change", 0] }, 1, 0],
          },
        },
        neutral: {
          $sum: {
            $cond: [{ $eq: ["$change", 0] }, 1, 0],
          },
        },
        valueCategoryA: {
          $sum: {
            $cond: {
              if: { $eq: ["$fundamentals.category", "A"] },
              then: "$value",
              else: 0,
            },
          },
        },
        valueCategoryB: {
          $sum: {
            $cond: {
              if: { $eq: ["$fundamentals.category", "B"] },
              then: "$value",
              else: 0,
            },
          },
        },
        valueCategoryN: {
          $sum: {
            $cond: {
              if: { $eq: ["$fundamentals.category", "N"] },
              then: "$value",
              else: 0,
            },
          },
        },
        valueCategoryZ: {
          $sum: {
            $cond: {
              if: { $eq: ["$fundamentals.category", "Z"] },
              then: "$value",
              else: 0,
            },
          },
        },
        valueTotal: {
          $sum: "$value",
        },
      },
    },
    {
      $sort: {
        uptrend: -1,
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        sector: "$_id",
        totalShare: 1,
        uptrend: 1,
        downtrend: 1,
        neutral: 1,
        valueCategoryA: { $round: ["$valueCategoryA", 2] },
        valueCategoryB: { $round: ["$valueCategoryB", 2] },
        valueCategoryN: { $round: ["$valueCategoryN", 2] },
        valueCategoryZ: { $round: ["$valueCategoryZ", 2] },
        valueTotal: 1,
      },
    },
  ]);

  res.status(200).json(price);
};

/*
  @api:       GET /api/prices/sectorLatestPrice
  @desc:      get latest share prices group by sector
  @access:    public
*/
const sectorLatestPrice = async (req, res, next) => {
  const price = await LatestPrice.aggregate([
    {
      $addFields: {
        close: {
          $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
        },
      },
    },
    {
      $unionWith: {
        coll: "inactive_stocks",
        pipeline: [
          {
            $addFields: {
              close: "$price",
            },
          },
        ],
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
      $group: {
        _id: "$fundamentals.sector",
        totalShare: { $sum: 1 },
        uptrend: {
          $sum: {
            $cond: [{ $gt: ["$change", 0] }, 1, 0],
          },
        },
        downtrend: {
          $sum: {
            $cond: [{ $lt: ["$change", 0] }, 1, 0],
          },
        },
        neutral: {
          $sum: {
            $cond: [{ $eq: ["$change", 0] }, 1, 0],
          },
        },
        uptrendItems: {
          $addToSet: {
            $cond: [{ $gt: ["$change", 0] }, "$tradingCode", 0],
          },
        },
        downtrendItems: {
          $addToSet: {
            $cond: [{ $lt: ["$change", 0] }, "$tradingCode", 0],
          },
        },
        neutralItems: {
          $addToSet: {
            $cond: [{ $eq: ["$change", 0] }, "$tradingCode", 0],
          },
        },
        close: { $avg: "$close" },
        ycp: { $avg: "$ycp" },
        valueTotal: { $sum: "$value" },
      },
    },
    {
      $sort: {
        uptrend: -1,
      },
    },
    {
      $project: {
        _id: 0,
        sector: "$_id",
        totalShare: 1,
        uptrend: 1,
        downtrend: 1,
        neutral: 1,
        uptrendItems: 1,
        downtrendItems: 1,
        neutralItems: 1,
        close: { $round: ["$close", 2] },
        change: { $round: [{ $subtract: ["$close", "$ycp"] }, 2] },
        percentChange: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $subtract: ["$close", "$ycp"] }, "$ycp"] },
                100,
              ],
            },
            2,
          ],
        },
        valueTotal: 1,
      },
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
        pipeline: [
          {
            $addFields: {
              close: {
                $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
              },
            },
          },
        ],
      },
    },
    { $unwind: "$minute_prices" },
    {
      $group: {
        _id: "$minute_prices.time",
        ltp: { $avg: "$minute_prices.ltp" },
        ycp: { $avg: "$minute_prices.ycp" },
        high: { $avg: "$minute_prices.high" },
        low: { $avg: "$minute_prices.low" },
        close: { $avg: "$minute_prices.close" },
        trade: { $sum: "$minute_prices.trade" },
        value: { $sum: "$minute_prices.value" },
        volume: { $sum: "$minute_prices.volume" },
      },
    },
    {
      $addFields: {
        change: { $subtract: ["$close", "$ycp"] },
        percentChange: {
          $multiply: [
            { $divide: [{ $subtract: ["$close", "$ycp"] }, "$ycp"] },
            100,
          ],
        },
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
        percentChange: { $round: ["$percentChange", 2] },
        trade: 1,
        value: 1,
        volume: 1,
      },
    },
  ]);

  const yesterdayPrice = await YesterdayPrice.findOne({
    tradingCode: sector,
    date: minuteDataUpdateDate,
  });

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
            $addFields: {
              close: {
                $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
              },
            },
          },
          {
            $unionWith: {
              coll: "inactive_stocks",
              pipeline: [
                {
                  $addFields: {
                    date: minuteDataUpdateDate,
                    ltp: "$price",
                    high: "$price",
                    low: "$price",
                    close: "$price",
                    open: "$price",
                    ycp: "$price",
                    trade: 0,
                    value: 0,
                    volume: 0,
                  },
                },
                {
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
              ],
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
              open: { $avg: "$ycp" },
              close: { $avg: "$close" },
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
              open: { $round: ["$open", 2] },
              change: { $round: [{ $subtract: ["$close", "$ycp"] }, 2] },
              percentChange: {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $subtract: ["$close", "$ycp"] }, "$ycp"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
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

  const latestSector = minuteSector[minuteSector.length - 1];

  res.status(200).json({
    latest: latestSector,
    lastDay: yesterdayPrice,
    minute: minuteSector,
    ...dailySector[0],
  });
};

/*
  @api:       GET /api/prices/technical/stock/:code
  @desc:      get stock technicals
  @access:    public
*/
const technicals = async (req, res, next) => {
  const tradingCode = req.params.code;

  const data = await Fundamental.findOne({ tradingCode }).select({
    technicals: 1,
  });

  const {
    sma10,
    sma20,
    sma30,
    sma50,
    sma100,
    sma200,
    ema10,
    ema20,
    ema30,
    ema50,
    ema100,
    ema200,
  } = data?.technicals?.movingAverages;

  const { rsi, stoch, adx, williamR, mfi, macd } =
    data?.technicals?.oscillators;

  res.status(200).json({
    sma10,
    sma20,
    sma30,
    sma50,
    sma100,
    sma200,
    ema10,
    ema20,
    ema30,
    ema50,
    ema100,
    ema200,
    rsi,
    stoch,
    adx,
    williamR,
    mfi,
    macd,
    pivots: data.technicals.pivots,
  });
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

  const queryLimit = period ? Number(period) : 750; // default to 3 year //

  const {
    dailyPriceUpdateDate,
    minuteDataUpdateDate,
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
  } = await Setting.findOne();

  let minutePrice = await DayMinutePrice.aggregate([
    {
      $match: {
        tradingCode,
      },
    },

    {
      $sort: {
        time: 1,
      },
    },
    {
      $project: {
        time: 1,
        ltp: 1,
        close: 1,
        volume: 1,
        value: 1,
        trade: 1,
      },
    },
  ]);

  const yesterdayPrice = await YesterdayPrice.findOne({
    tradingCode: tradingCode,
    date: minuteDataUpdateDate,
  });

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
      $addFields: {
        open: { $cond: [{ $gt: ["$open", 0] }, "$open", "$ycp"] },
        high: { $cond: [{ $gt: ["$high", 0] }, "$high", "$ycp"] },
        low: { $cond: [{ $gt: ["$low", 0] }, "$low", "$ycp"] },
        close: { $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"] },
        ltp: { $cond: [{ $gt: ["$ltp", 0] }, "$ltp", "$ycp"] },
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
              ltp: { $gt: 0 },
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
              close: { $last: "$close" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              change: { $last: "$change" },
              percentChange: { $last: "$percentChange" },
              volume: { $last: "$volume" },
              value: { $last: "$value" },
              trade: { $last: "$trade" },
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
              change: 1,
              percentChange: 1,
              volume: 1,
              value: 1,
              trade: 1,
            },
          },
        ],
        weekly: [
          {
            $match: {
              close: { $ne: 0 },
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
              close: { $last: "$close" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              volume: { $sum: "$volume" },
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
              close: { $ne: 0 },
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
              close: { $last: "$close" },
              ltp: { $last: "$ltp" },
              ycp: { $first: "$ycp" },
              volume: { $sum: "$volume" },
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

  const halt = await HaltStatus.findOne({
    tradingCode: tradingCode,
    date: minuteDataUpdateDate,
  });

  const haltStatus = halt?.status || "none";

  const fundamentalsBasic = await Fundamental.findOne({ tradingCode });

  const sector = fundamentalsBasic.sector;

  let latestPrice = {};

  const lastDailyValue = dailyPrice[0].daily.pop();

  const lastDailyValueUpdateTime = minutePrice[minutePrice.length - 1]["time"];

  if (lastDailyValue.ltp == 0) {
    const ycp = lastDailyValue.ycp;

    latestPrice = {
      ...lastDailyValue,
      time: lastDailyValueUpdateTime,
      open: ycp,
      ltp: ycp,
      high: ycp,
      low: ycp,
      close: ycp,
      isNullDataAtDse: "YES",
    };
  } else {
    latestPrice = {
      ...lastDailyValue,
      time: lastDailyValueUpdateTime,
      isNullDataAtDse: "NO",
    };
  }

  dailyPrice[0].daily.push(latestPrice);

  // if (minutePrice.length > 0) {
  //   latestPrice = minutePrice[0].latest;
  // } else {
  //   const price = await LatestPrice.aggregate([
  //     {
  //       $match: {
  //         tradingCode,
  //       },
  //     },
  //     {
  //       $addFields: {
  //         ltp: "$ycp",
  //         open: "$ycp",
  //         high: "$ycp",
  //         low: "$ycp",
  //         close: "$ycp",
  //         isNullDataAtDse: "YES",
  //       },
  //     },
  //   ]);
  //   latestPrice = price[0];

  //   minutePrice.push({
  //     latest: latestPrice,
  //     minute: [latestPrice],
  //   });
  // }

  const close = latestPrice.close;
  const ycp = latestPrice.ycp;

  const { circuitUp, circuitLow } = circuitUpDownLimits(ycp);

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
        close: {
          $cond: [
            { $gt: ["$latest_prices.close", 0] },
            "$latest_prices.close",
            "$latest_prices.ycp",
          ],
        },
        screenerBookValue: "$screener.bookValue.value",
      },
    },
    {
      $project: {
        tradingCode: 1,
        pe: {
          $round: [
            {
              $divide: [
                "$close",
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
                  $multiply: ["$close", "$totalShares"],
                },
                // "$screener.bookValue.value",
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
        _id: 0,
      },
    },
  ]);

  const formatRatioValues = (type, title, changeColorReverse = false) => {
    let value, period;
    if (type === "pe") {
      value = Number((close / fundamentalsBasic.epsCurrent).toFixed(2));
      period = "Current";
    }
    if (type === "pbv") {
      value = Number(
        (
          (close * fundamentalsBasic.totalShares) /
          fundamentalsBasic.screener.bookValue.value
        ).toFixed(2)
      );
      period = fundamentalsBasic.screener.bookValue.period;
    }
    if (type === "pcf") {
      value = Number(
        (close / fundamentalsBasic.screener.nocfpsQuarterly.value).toFixed(2)
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
      position,
      min: 1,
      max: totalItems,
      // min: sectorData[0].value,
      // max: sectorData[totalItems - 1].value,
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
      ? formatRatioValues("pbv", "P/Bv ratio", true)
      : null,
    pe: fundamentalsBasic.epsCurrent
      ? formatRatioValues("pe", "P/E ratio", true)
      : null,
    pcf: fundamentalsBasic.screener.nocfpsQuarterly
      ? formatRatioValues("pcf", "P/Cf ratio", true)
      : null,
  };

  const marketOpenStatus = await marketStatusHelper(
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute
  );

  res.status(200).json({
    latest: latestPrice,
    minute: minutePrice,
    lastDay: yesterdayPrice,
    ...dailyPrice[0],
    fundamentals: { ...fundamentalsBasic._doc, ...fundamentalsExtended },
    marketOpenStatus: marketOpenStatus.statusText,
    haltStatus,
  });
  // } catch (error) {
  //   const err = createError(500, "Error Occured");
  //   next(err);
  // }
};

/*
  @api:       GET /api/prices/index/:code?period={number}
  @desc:      get stock fundamentals, latest price, minute charts
  @access:    public
*/
const indexDetails = async (req, res, next) => {
  // try {
  const tradingCode = req.params.code;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 750; // default to 3 year //

  const {
    dailyIndexUpdateDate,
    minuteDataUpdateDate,
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
  } = await Setting.findOne();

  let minutePrice = await DayMinuteIndex.aggregate([
    {
      $match: {
        tradingCode,
      },
    },
    {
      $facet: {
        latest: [
          {
            $match: {
              index: { $gt: 0 },
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
              time: { $last: "$time" },
              open: { $first: "$index" },
              high: { $max: "$index" },
              low: { $min: "$index" },
              close: { $last: "$index" },
              ltp: { $last: "$index" },
              ycp: { $first: "$index" },
              change: { $last: "$change" },
              percentChange: { $last: "$percentChange" },
              trade: { $last: "$trade" },
              volume: { $last: "$volume" },
              value: { $last: "$value" },
            },
          },
          {
            $project: {
              time: 1,
              open: { $round: ["$open", 2] },
              high: { $round: ["$high", 2] },
              low: { $round: ["$low", 2] },
              close: { $round: ["$close", 2] },
              ltp: { $round: ["$ltp", 2] },
              ycp: { $round: ["$ycp", 2] },
              change: { $round: ["$change", 2] },
              percentChange: { $round: ["$percentChange", 2] },
              value: 1,
              volume: 1,
              trade: 1,
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
              ltp: { $round: ["$index", 2] },
              close: { $round: ["$index", 2] },
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

  const yesterdayPrice = await YesterdayPrice.findOne({
    tradingCode: tradingCode,
    date: minuteDataUpdateDate,
  });

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
        coll: "index_day_minute_values",
        pipeline: [
          {
            $match: {
              tradingCode: tradingCode,
              date: {
                $gt: dailyIndexUpdateDate,
              },
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
              open: { $first: "$index" },
              high: { $max: "$index" },
              low: { $min: "$index" },
              close: { $last: "$index" },
              ltp: { $last: "$index" },
              ycp: { $first: "$index" },
              volume: { $last: "$volume" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        open: { $round: ["$open", 2] },
        high: { $round: ["$high", 2] },
        low: { $round: ["$low", 2] },
        close: { $round: ["$close", 2] },
        ltp: { $round: ["$ltp", 2] },
      },
    },
    {
      $facet: {
        // lastDay: [
        //   {
        //     $match: {
        //       date: {
        //         $lt: minuteDataUpdateDate,
        //       },
        //     },
        //   },
        //   {
        //     $sort: {
        //       date: -1,
        //     },
        //   },
        //   {
        //     $limit: 1,
        //   },
        // ],
        daily: [],
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
              close: { $last: "$close" },
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
              close: { $last: "$close" },
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
    // {
    //   $unwind: "$lastDay",
    // },
  ]);

  const fundamentals = await Fundamental.findOne({ tradingCode }).select({
    _id: 0,
    tradingCode: 1,
    companyName: 1,
  });

  const marketOpenStatus = await marketStatusHelper(
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute
  );

  res.status(200).json({
    ...minutePrice[0],
    lastDay: yesterdayPrice,
    ...dailyPrice[0],
    fundamentals,
    marketOpenStatus: marketOpenStatus.statusText,
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
  const {
    minuteDataUpdateDate,
    dailyIndexUpdateDate,
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute,
  } = await Setting.findOne();

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

  const tradingCode = "00DSEX";
  const dailyIndex = await DailyPrice.aggregate([
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
      $limit: 320,
    },
    {
      $sort: {
        date: 1,
      },
    },
    {
      $unionWith: {
        coll: "index_day_minute_values",
        pipeline: [
          {
            $match: {
              tradingCode: tradingCode,
              date: {
                $gt: dailyIndexUpdateDate,
              },
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
              close: { $last: "$index" },
            },
          },
        ],
      },
    },
    {
      $project: {
        date: 1,
        close: 1,
      },
    },
  ]);

  const prices = dailyIndex.map((item) => item.close);

  const rsi = calculateRsiLastValue(prices);

  const marketOpenStatus = await marketStatusHelper(
    dataInsertionEnable,
    openHour,
    openMinute,
    closeHour,
    closeMinute,
    preCloseHour,
    preCloseMinute
  );

  res
    .status(200)
    .json({ ...index[0], rsi, marketOpenStatus: marketOpenStatus.statusText });
};

/*
  @api:       GET /api/prices/newsByStock/:code?limit={limit}
  @desc:      get latest news by tradingcode
  @access:    public
*/
const newsByStock = async (req, res, next) => {
  const tradingCode = req.params.code;

  const { limit } = url.parse(req.url, true).query;

  const queryLimit = limit ? Number(limit) : 50;

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
    blocktr = await BlockTr.find({ date: dailyBlockTrUpdateDate }).sort({
      quantity: -1,
    });
  } else {
    blocktr = await BlockTr.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }

  res.status(200).json(blocktr);
};

/*
  @api:       GET /api/prices/topGainerLoser                                                                                               
  @desc:      get gainer and losers data
  @access:    public
*/
const topGainerLoser = async (req, res, next) => {
  const setLimit = 10;

  const { minuteDataUpdateDate } = await Setting.findOne().select(
    "minuteDataUpdateDate"
  );

  const gainerLoser = await LatestPrice.aggregate([
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
      $lookup: {
        from: "halt_shares",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "halt_shares",
        pipeline: [
          {
            $match: {
              date: minuteDataUpdateDate,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$halt_shares", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        category: "$fundamentals.category",
        type: "$fundamentals.type",
        sector: "$fundamentals.sector",
        companyName: "$fundamentals.companyName",
        recordDate: "$fundamentals.recordDate",
        haltStatus: "$halt_shares.status",
      },
    },
    {
      $facet: {
        gainer: [
          {
            $sort: {
              percentChange: -1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        topVolume: [
          {
            $sort: {
              volume: -1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        topTrade: [
          {
            $sort: {
              trade: -1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        topValue: [
          {
            $sort: {
              value: -1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        loser: [
          {
            $sort: {
              percentChange: 1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        bottomVolume: [
          {
            $sort: {
              volume: 1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        bottomTrade: [
          {
            $sort: {
              trade: 1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
        bottomValue: [
          {
            $sort: {
              value: 1,
              tradingCode: 1,
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
              close: 1,
              volume: 1,
              value: 1,
              trade: 1,
              category: 1,
              type: 1,
              sector: 1,
              companyName: 1,
              haltStatus: 1,
              recordDate: 1,
            },
          },
        ],
      },
    },
  ]);
  res.status(200).json(gainerLoser[0]);
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
        from: "fundamentals",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "fundamentals",
      },
    },
    { $unwind: "$fundamentals" },
    {
      $lookup: {
        from: "yesterday_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "yesterday_price",
        pipeline: [
          {
            $match: {
              date: minuteDataUpdateDate,
            },
          },
        ],
      },
    },
    { $unwind: "$yesterday_price" },
    {
      $lookup: {
        from: "halt_shares",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "halt_shares",
        pipeline: [
          {
            $match: {
              date: minuteDataUpdateDate,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$halt_shares", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        close: {
          $cond: [{ $gt: ["$close", 0] }, "$close", "$ycp"],
        },
      },
    },
    {
      $addFields: {
        oneWeekChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneWeekBeforeData", 0] },
            {
              $round: [
                { $subtract: ["$close", "$yesterday_price.oneWeekBeforeData"] },
                2,
              ],
            },
            0,
          ],
        },
        oneMonthChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneMonthBeforeData", 0] },
            {
              $round: [
                {
                  $subtract: ["$close", "$yesterday_price.oneMonthBeforeData"],
                },
                2,
              ],
            },
            0,
          ],
        },
        sixMonthChange: {
          $cond: [
            { $gt: ["$yesterday_price.sixMonthBeforeData", 0] },
            {
              $round: [
                {
                  $subtract: ["$close", "$yesterday_price.sixMonthBeforeData"],
                },
                2,
              ],
            },
            0,
          ],
        },
        oneYearChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneYearBeforeData", 0] },
            {
              $round: [
                { $subtract: ["$close", "$yesterday_price.oneYearBeforeData"] },
                2,
              ],
            },
            0,
          ],
        },
        fiveYearChange: {
          $cond: [
            { $gt: ["$yesterday_price.fiveYearBeforeData", 0] },
            {
              $round: [
                {
                  $subtract: ["$close", "$yesterday_price.fiveYearBeforeData"],
                },
                2,
              ],
            },
            0,
          ],
        },
        oneWeekPercentChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneWeekBeforeData", 0] },
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            "$close",
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
            0,
          ],
        },
        oneMonthPercentChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneMonthBeforeData", 0] },
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            "$close",
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
            0,
          ],
        },
        sixMonthPercentChange: {
          $cond: [
            { $gt: ["$yesterday_price.sixMonthBeforeData", 0] },
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            "$close",
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
            0,
          ],
        },
        oneYearPercentChange: {
          $cond: [
            { $gt: ["$yesterday_price.oneYearBeforeData", 0] },
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            "$close",
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
            0,
          ],
        },
        fiveYearPercentChange: {
          $cond: [
            { $gt: ["$yesterday_price.fiveYearBeforeData", 0] },
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            "$close",
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
            0,
          ],
        },
        oneWeekTotalValue: {
          $round: [
            {
              $add: ["$yesterday_price.oneWeekTotalValue", "$value"],
            },
            2,
          ],
        },
        oneWeekTotalVolume: {
          $round: [
            {
              $add: ["$yesterday_price.oneWeekTotalVolume", "$volume"],
            },
            2,
          ],
        },
        oneWeekTotalTrade: {
          $round: [
            {
              $add: ["$yesterday_price.oneWeekTotalTrade", "$trade"],
            },
            2,
          ],
        },
        oneMonthTotalValue: {
          $round: [
            {
              $add: ["$yesterday_price.oneMonthTotalValue", "$value"],
            },
            2,
          ],
        },
        oneMonthTotalVolume: {
          $round: [
            {
              $add: ["$yesterday_price.oneMonthTotalVolume", "$volume"],
            },
            2,
          ],
        },
        oneMonthTotalTrade: {
          $round: [
            {
              $add: ["$yesterday_price.oneMonthTotalTrade", "$trade"],
            },
            2,
          ],
        },
        sixMonthTotalValue: {
          $round: [
            {
              $add: ["$yesterday_price.sixMonthTotalValue", "$value"],
            },
            2,
          ],
        },
        sixMonthTotalVolume: {
          $round: [
            {
              $add: ["$yesterday_price.sixMonthTotalVolume", "$volume"],
            },
            2,
          ],
        },
        sixMonthTotalTrade: {
          $round: [
            {
              $add: ["$yesterday_price.sixMonthTotalTrade", "$trade"],
            },
            2,
          ],
        },
        oneYearTotalValue: {
          $round: [
            {
              $add: ["$yesterday_price.oneYearTotalValue", "$value"],
            },
            2,
          ],
        },
        oneYearTotalVolume: {
          $round: [
            {
              $add: ["$yesterday_price.oneYearTotalVolume", "$volume"],
            },
            2,
          ],
        },
        oneYearTotalTrade: {
          $round: [
            {
              $add: ["$yesterday_price.oneYearTotalTrade", "$trade"],
            },
            2,
          ],
        },
        fiveYearTotalValue: {
          $round: [
            {
              $add: ["$yesterday_price.fiveYearTotalValue", "$value"],
            },
            2,
          ],
        },
        fiveYearTotalVolume: {
          $round: [
            {
              $add: ["$yesterday_price.fiveYearTotalVolume", "$volume"],
            },
            2,
          ],
        },
        fiveYearTotalTrade: {
          $round: [
            {
              $add: ["$yesterday_price.fiveYearTotalTrade", "$trade"],
            },
            2,
          ],
        },
        category: "$fundamentals.category",
        type: "$fundamentals.type",
        sector: "$fundamentals.sector",
        recordDate: "$fundamentals.recordDate",
        haltStatus: "$halt_shares.status",
        id: "$_id",
      },
    },
    {
      $project: {
        date: 1,
        time: 1,
        tradingCode: 1,
        close: 1,
        change: 1,
        percentChange: 1,
        category: 1,
        type: 1,
        sector: 1,
        recordDate: 1,
        haltStatus: 1,
        day: {
          change: "$change",
          percentChange: "$percentChange",
          value: "$value",
          volume: "$volume",
          trade: "$trade",
        },
        oneWeek: {
          change: "$oneWeekChange",
          percentChange: "$oneWeekPercentChange",
          value: "$oneWeekTotalValue",
          volume: "$oneWeekTotalVolume",
          trade: "$oneWeekTotalTrade",
        },
        oneMonth: {
          change: "$oneMonthChange",
          percentChange: "$oneMonthPercentChange",
          value: "$oneMonthTotalValue",
          volume: "$oneMonthTotalVolume",
          trade: "$oneMonthTotalTrade",
        },
        sixMonth: {
          change: "$sixMonthChange",
          percentChange: "$sixMonthPercentChange",
          value: "$sixMonthTotalValue",
          volume: "$sixMonthTotalVolume",
          trade: "$sixMonthTotalTrade",
        },
        oneYear: {
          change: "$oneYearChange",
          percentChange: "$oneYearPercentChange",
          value: "$oneYearTotalValue",
          volume: "$oneYearTotalVolume",
          trade: "$oneYearTotalTrade",
        },
        fiveYear: {
          change: "$fiveYearChange",
          percentChange: "$fiveYearPercentChange",
          value: "$fiveYearTotalValue",
          volume: "$fiveYearTotalVolume",
          trade: "$fiveYearTotalTrade",
        },
      },
    },
  ]);

  res.status(200).json(gainerLoser);
};

/*
  @api:       GET /api/prices/screener
  @desc:      get latest index data
  @access:    public
*/
const screener = async (req, res, next) => {
  const body = req.body;

  let filters = {};

  for (key in body) {
    const value = body[key].split(";");

    const minvalue = value[0];
    const maxvalue = value[1];
    const infoText = value[2];

    if (["sector", "category", "patterns", "candlestick"].includes(key)) {
      filters[key] = {};

      filters[key]["$eq"] = value[0].toString();
    } else if (
      ["sma20", "sma50", "sma200", "ema20", "ema50", "ema200"].includes(key)
    ) {
      if (!filters["$expr"]) {
        filters["$expr"] = {};
        filters["$expr"]["$and"] = [];
      }
      tempCond = {};
      const param = value[2];
      const datapoint1 = "$" + minvalue;
      const datapoint2 = "$" + maxvalue;

      if (param == "gt") {
        tempCond["$gt"] = [datapoint1, datapoint2];
      } else if (param == "lt") {
        tempCond["$lt"] = [datapoint1, datapoint2];
      } else if (param == "eq") {
        tempCond["$eq"] = [datapoint1, datapoint2];
      }
      filters["$expr"]["$and"].push(tempCond);
    } else {
      filters[key] = {};

      if (minvalue !== "null") filters[key]["$gte"] = Number(minvalue);
      if (maxvalue !== "null") filters[key]["$lte"] = Number(maxvalue);
    }
  }
  // console.log(filters);

  const { minuteDataUpdateDate } = await Setting.findOne().select(
    "minuteDataUpdateDate"
  );

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
      $lookup: {
        from: "yesterday_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "lastday_prices",
        pipeline: [
          {
            $match: {
              date: minuteDataUpdateDate,
            },
          },
        ],
      },
    },
    {
      $unwind: "$lastday_prices",
    },
    {
      $addFields: {
        close: {
          $cond: [
            { $gt: ["$latest_prices.close", 0] },
            "$latest_prices.close",
            "$latest_prices.ycp",
          ],
        },
        epsCurrent: {
          $cond: [{ $eq: ["$epsCurrent", 0] }, 0.000001, "$epsCurrent"],
        },
      },
    },
    {
      $addFields: {
        oneMonthBeforeLtp: {
          $cond: [
            { $gt: ["$lastday_prices.oneMonthBeforeData", 0] },
            "$lastday_prices.oneMonthBeforeData",
            "$close",
          ],
        },
        oneWeekBeforeLtp: {
          $cond: [
            { $gt: ["$lastday_prices.oneWeekBeforeData", 0] },
            "$lastday_prices.oneWeekBeforeData",
            "$close",
          ],
        },
        sixMonthBeforeLtp: {
          $cond: [
            { $gt: ["$lastday_prices.sixMonthBeforeData", 0] },
            "$lastday_prices.sixMonthBeforeData",
            "$close",
          ],
        },
        oneYearBeforeLtp: {
          $cond: [
            { $gt: ["$lastday_prices.oneYearBeforeData", 0] },
            "$lastday_prices.oneYearBeforeData",
            "$close",
          ],
        },
        fiveYearBeforeLtp: {
          $cond: [
            { $gt: ["$lastday_prices.fiveYearBeforeData", 0] },
            "$lastday_prices.fiveYearBeforeData",
            "$close",
          ],
        },
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        tradingCode: 1,
        sector: 1,
        close: 1,
        category: 1,
        epsCurrent: 1,
        volume: "$latest_prices.volume",
        pricePercentChange: "$latest_prices.percentChange",
        pricePercentChangeOneWeek: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$close", "$oneWeekBeforeLtp"] },
                    "$oneWeekBeforeLtp",
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
        pricePercentChangeOneMonth: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$close", "$oneMonthBeforeLtp"] },
                    "$oneMonthBeforeLtp",
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
        pricePercentChangeSixMonth: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$close", "$sixMonthBeforeLtp"] },
                    "$sixMonthBeforeLtp",
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
        pricePercentChangeOneYear: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$close", "$oneYearBeforeLtp"] },
                    "$oneYearBeforeLtp",
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
        pricePercentChangeFiveYear: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$close", "$fiveYearBeforeLtp"] },
                    "$fiveYearBeforeLtp",
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
        totalShares: {
          $round: [
            {
              $divide: ["$totalShares", 10000000],
            },
            2,
          ],
        },
        reserve: {
          $round: [
            {
              $divide: ["$screener.reserveSurplus.value", 10],
            },
            2,
          ],
        },
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
        authCap: {
          $cond: [
            { $eq: ["$authCap", 0] },
            "-",
            {
              $round: [
                {
                  $divide: ["$authCap", 10],
                },
                2,
              ],
            },
          ],
        },
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
        navCurrent: "$screener.navQuarterly.value",
        nocfpsCurrent: "$screener.nocfpsQuarterly.value",

        de: { $round: ["$screener.de.value", 2] },
        ps: { $round: ["$screener.ps.value", 2] },
        roe: { $round: ["$screener.roe.value", 2] },
        roa: { $round: ["$screener.roa.value", 2] },
        currentRatio: { $round: ["$screener.currentRatio.value", 2] },

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

        totalAssetGrowthOneYear: "$screener.totalAsset.percentChange",
        totalAssetGrowthFiveYear: "$screener.totalAsset.percentChangeFiveYear",

        netIncomeGrowthOneYear: "$screener.netIncome.percentChange",
        netIncomeGrowthFiveYear: "$screener.netIncome.percentChangeFiveYear",

        totalLiabilitiesGrowthOneYear:
          "$screener.totalLiabilities.percentChange",
        operatingProfitGrowthOneYear: "$screener.operatingProfit.percentChange",

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

        beta: "$technicals.beta",
        patterns: "$technicals.patterns",
        rsi: "$technicals.oscillators.rsi",
        adx: "$technicals.oscillators.adx",
        stoch: "$technicals.oscillators.stoch",
        macd: "$technicals.oscillators.macd",
        williamR: "$technicals.oscillators.williamR",
        mfi: "$technicals.oscillators.mfi",
        candlestick: "$technicals.candlestick.value",
        sma20: "$technicals.movingAverages.sma20",
        sma50: "$technicals.movingAverages.sma50",
        sma200: "$technicals.movingAverages.sma200",
        ema20: "$technicals.movingAverages.ema20",
        ema50: "$technicals.movingAverages.ema50",
        ema200: "$technicals.movingAverages.ema200",
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

  // console.log(data);

  res.status(200).json(data);
};

/*
  @api:       GET /api/prices/topFinancials?setlimit={linit}
  @desc:      get gainer and losers data
  @access:    public
*/
const topFinancials = async (req, res, next) => {
  const { setlimit } = url.parse(req.url, true).query;

  const limit = setlimit ? Number(setlimit) : 20;

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
        close: {
          $cond: [
            { $gt: ["$latest_prices.close", 0] },
            "$latest_prices.close",
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
        close: 1,
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
          $round: [{ $divide: ["$close", "$epsCurrent"] }, 2],
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
              percentChange: 1,
              value: "$reserveSurplus",
            },
          },
        ],
        roe: [
          {
            $match: {
              roe: {
                $lt: 10000,
              },
            },
          },
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
              close: 1,
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
  @api:       GET /api/prices/marketDepth?inst={inst}
  @desc:      get latest share prices for all shares
  @access:    public
*/
const marketDepth = async (req, res) => {
  try {
    const { inst } = url.parse(req.url, true).query;

    const output = await axios.request({
      method: "post",
      url: "https://www.dsebd.org/ajax/load-instrument.php",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8:",
        Host: "www.dsebd.org",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: {
        inst: inst,
      },
    });

    const dom = new JSDOM(output.data);

    const document = dom.window?.document;

    if (!document) {
      return res
        .status(500)
        .json({ tradingCode: inst, message: "Error occured" });
    }

    const table = document.querySelectorAll(`table[cellspacing="1"]`);

    const buyTds = table[0]?.querySelectorAll("td");
    const sellTds = table[1]?.querySelectorAll("td");

    const buy = buySellCounts(buyTds);
    const sell = buySellCounts(sellTds);

    let buyPercent;
    let initMarketDepthStatus = "none";

    if (buy && sell) {
      buyPercent =
        (buy.totalVolume / (buy.totalVolume + sell.totalVolume)) * 100;

      if (buy.totalVolume == 0 && sell.totalVolume > 0) {
        initMarketDepthStatus = "sell";
      } else if (buy.totalVolume > 0 && sell.totalVolume == 0) {
        initMarketDepthStatus = "buy";
      } else {
        initMarketDepthStatus = "none";
      }
    }

    const latestPrice = await LatestPrice.findOne({ tradingCode: inst });

    const price = latestPrice.close;
    const ycp = latestPrice.ycp;
    const change = latestPrice.change;

    const { circuitUp, circuitLow } = circuitUpDownLimits(ycp);

    const upperCircuitLimitReached =
      change > 0 && circuitUp == price ? true : false;
    const lowerCircuitLimitReached =
      change < 0 && circuitLow == price ? true : false;

    const status =
      (upperCircuitLimitReached && initMarketDepthStatus == "buy") ||
      (lowerCircuitLimitReached && initMarketDepthStatus == "sell")
        ? initMarketDepthStatus
        : "none";

    return res.status(200).json({
      tradingCode: inst,
      buy,
      sell,
      buyPercent,
      status,
      initMarketDepthStatus,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ tradingCode: inst, message: "Error occured" });
  }
};

/*
  @api:       GET /api/prices/marketDepthAllInst
  @desc:      get latest share prices for all shares
  @access:    public
*/
const marketDepthAllInst = async (req, res) => {
  const allStocks = await LatestPrice.find();

  // const allStocks = [{ tradingCode: "JUTESPINN" }];

  const result = [];

  for (let item of allStocks) {
    const inst = item.tradingCode;

    console.log(inst, " -> start");

    const output = await axios.request({
      method: "post",
      url: "https://www.dsebd.org/ajax/load-instrument.php",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8:",
        Host: "www.dsebd.org",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: {
        inst: inst,
      },
    });

    const dom = new JSDOM(output.data);

    const document = dom.window?.document;

    if (!document) {
      console.log(inst, " -> Error");
      continue;
    }

    const table = document.querySelectorAll(`table[cellspacing="1"]`);

    const buyTds = table[0]?.querySelectorAll("td");
    const sellTds = table[1]?.querySelectorAll("td");

    const buy = buySellCounts(buyTds);
    const sell = buySellCounts(sellTds);

    let initMarketDepthStatus = "none";

    if (buy && sell) {
      if (buy.totalVolume == 0 && sell.totalVolume > 0) {
        initMarketDepthStatus = "sell";
      } else if (buy.totalVolume > 0 && sell.totalVolume == 0) {
        initMarketDepthStatus = "buy";
      } else {
        initMarketDepthStatus = "none";
      }
    }

    const latestPrice = await LatestPrice.findOne({ tradingCode: inst });

    const price = latestPrice.close;
    const ycp = latestPrice.ycp;
    const change = latestPrice.change;

    // const circuitUpRange = circuitUpMoveRange.find(
    //   (item) => ycp >= item.min && ycp <= item.max
    // ).value;

    // const circuitDownRange = circuitDownMoveRange.find(
    //   (item) => ycp >= item.min && ycp <= item.max
    // ).value;

    // const circuitUpPrice = Number(
    //   (ycp + getNumWithFirstDecimalDigit((ycp * circuitUpRange) / 100)).toFixed(
    //     2
    //   )
    // );
    // const circuitDownPrice = Number(
    //   (
    //     ycp - getNumWithFirstDecimalDigit((ycp * circuitDownRange) / 100)
    //   ).toFixed(2)
    // );

    // const circuitUpPrice =
    //   Math.floor((ycp + (ycp * circuitUpRange) / 100) * 10) / 10;
    // const circuitDownPrice =
    //   Math.ceil((ycp - (ycp * circuitDownRange) / 100) * 10) / 10;

    const { circuitUp, circuitLow } = circuitUpDownLimits(ycp);

    const upperCircuitLimitReached =
      change > 0 && circuitUp == price ? true : false;
    const lowerCircuitLimitReached =
      change < 0 && circuitLow == price ? true : false;

    const status =
      (upperCircuitLimitReached && initMarketDepthStatus == "buy") ||
      (lowerCircuitLimitReached && initMarketDepthStatus == "sell")
        ? initMarketDepthStatus
        : "none";

    await HaltStatus.findOneAndUpdate(
      { tradingCode: inst },
      {
        $set: {
          date: DateTime.now()
            .setZone("Etc/GMT")
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toISO(),
          time: DateTime.now()
            .setZone("Etc/GMT")
            .set({ second: 0, millisecond: 0 })
            .toISO(),
          initMarketDepthStatus,
          upperCircuitLimitReached,
          lowerCircuitLimitReached,
          circuitLimitReached:
            upperCircuitLimitReached || lowerCircuitLimitReached,
          totalBuyVolume: buy?.totalVolume,
          totalSellVolume: sell?.totalVolume,
          status,
        },
      },
      { upsert: true }
    );

    console.log(inst, " : final status -> ", status);

    result.push(inst);
  }
  res.status(200).json({ response: "success", items: result });
};

/*
  Not in use
*/

/*
  @api:       GET /api/prices/technical/stock/:code
  @desc:      get stock technicals
  @access:    public
*/
const technicalsOldVersion = async (req, res, next) => {
  const tradingCode = req.params.code;

  const queryLimit = 500;

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
      $project: {
        date: 1,
        high: 1,
        low: 1,
        ltp: 1,
        ycp: 1,
        volume: 1,
      },
    },
  ]);

  // const prices = dailyPrice.map((item) => item.ltp);
  // const lows = dailyPrice.map((item) => item.low);
  // const highs = dailyPrice.map((item) => item.high);
  // const volumes = dailyPrice.map((item) => item.volume);

  let prices = [];
  let lows = [];
  let highs = [];
  let volumes = [];
  let ohlc = [];

  for (let item of dailyPrice) {
    prices.push(item.ltp !== 0 ? item.ltp : item.ycp);
    lows.push(item.low !== 0 ? item.low : item.ycp);
    highs.push(item.high !== 0 ? item.high : item.ycp);
    volumes.push(item.volume);
    ohlc.push({
      close: item.ltp !== 0 ? item.ltp : item.ycp,
      high: item.high !== 0 ? item.high : item.ycp,
      low: item.low !== 0 ? item.low : item.ycp,
    });
  }

  const sma10 = calculateSmaLastValue(prices, 10);
  const sma20 = calculateSmaLastValue(prices, 20);
  const sma30 = calculateSmaLastValue(prices, 30);
  const sma50 = calculateSmaLastValue(prices, 50);
  const sma100 = calculateSmaLastValue(prices, 100);
  const sma200 = calculateSmaLastValue(prices, 200);

  const ema10 = calculateEmaLastValue(prices, 10);
  const ema20 = calculateEmaLastValue(prices, 20);
  const ema30 = calculateEmaLastValue(prices, 30);
  const ema50 = calculateEmaLastValue(prices, 50);
  const ema100 = calculateEmaLastValue(prices, 100);
  const ema200 = calculateEmaLastValue(prices, 200);

  const rsi = calculateRsiLastValue(prices);
  const stoch = calculateStochasticKLastValue(ohlc);
  const adx = calculateAdxLastValue(highs, lows, prices);
  const williamR = calculateWilliamsPercentRLastValue(highs, lows, prices);
  const mfi = calculateMoneyFlowIndexLastValue(highs, lows, prices, volumes);
  const macd = calculateMacdLastValue(prices);

  const lastPrice = dailyPrice[dailyPrice.length - 1];

  const pivots = calculatePivotPoints(
    lastPrice.high,
    lastPrice.low,
    lastPrice.ltp
  );

  // console.log(prices, rsi, stoch, adx, williamR, mfi, macd, lastPrice, pivots);

  res.status(200).json({
    sma10,
    sma20,
    sma30,
    sma50,
    sma100,
    sma200,
    ema10,
    ema20,
    ema30,
    ema50,
    ema100,
    ema200,
    rsi,
    stoch,
    adx,
    williamR,
    mfi,
    macd,
    pivots,
  });
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
  Helper functions
*/

const getNumWithFirstDecimalDigit = (num) => {
  const intPart = Math.floor(num);
  const decimalPart = Math.abs(num) % 1;
  return intPart + Math.floor(decimalPart * 10) / 10;
};

const circuitUpDownLimits = (ycp) => {
  const circuitUpRange = circuitUpMoveRange.find(
    (item) => ycp > item.min && ycp <= item.max
  ).value;

  const circuitDownRange = circuitDownMoveRange.find(
    (item) => ycp > item.min && ycp <= item.max
  ).value;

  const circuitUp = Number(
    (ycp + getNumWithFirstDecimalDigit((ycp * circuitUpRange) / 100)).toFixed(2)
  );

  const circuitLow = Number(
    (ycp - getNumWithFirstDecimalDigit((ycp * circuitDownRange) / 100)).toFixed(
      2
    )
  );

  return {
    circuitUp,
    circuitLow,
  };
};

const buySellCounts = (tds) => {
  if (!tds) return null;

  const tdArray = Array.from(tds);

  const tdTexts = tdArray.slice(3).map((td) => Number(td.textContent));

  const tdData = [];
  for (let i = 0; i < tdTexts.length; i += 2) {
    tdData.push(tdTexts.slice(i, i + 2));
  }

  let totalVolume = 0,
    totalPrice = 0;

  for (let item of tdData) {
    totalVolume += item[1];
    totalPrice += item[0] * item[1];
  }

  const avgPrice = Number((totalPrice / totalVolume).toFixed(2));

  return {
    data: tdData,
    totalVolume,
    avgPrice,
  };
};

const formatCandleChartData = (data) => {
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
  getMarketStatus,
  getIpoList,
  latestPrice,
  indexMover,
  sectorGainValueSummary,
  sectorLatestPrice,
  dailySectorPrice,
  allStockBeta,
  technicals,
  stockDetails,
  indexDetails,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  allGainerLoser,
  topGainerLoser,
  screener,
  topFinancials,
  marketDepth,
  marketDepthAllInst,
  getIndexInfo,
};
