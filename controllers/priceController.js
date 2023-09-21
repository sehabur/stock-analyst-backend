const url = require('url');
const { DateTime } = require('luxon');

const MinutePrice = require('../models/minutePriceModel');
const Fundamental = require('../models/fundamentalModel');
const DailyPrice = require('../models/dailyPriceModel');
const DailySector = require('../models/dailySectorModel');
const LatestPrice = require('../models/latestPriceModel');

const Dp = require('../models/testDailyPriceModel');

const { sectorList } = require('../data/dse');

/*
  @api:       GET /api/prices/latestPrice/
  @desc:      get latest share prices for all shares
  @access:    public
*/
const latestPrice = async (req, res, next) => {
  const latestPrice = await LatestPrice.aggregate([
    {
      $lookup: {
        from: 'fundamentals',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'fundamentals',
      },
    },
    { $unwind: '$fundamentals' },
    {
      $addFields: {
        sector: '$fundamentals.sector',
        category: '$fundamentals.category',
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
  @api:       GET /api/prices/sectorWiseLatestPrice/
  @desc:      get latest share prices group by sector
  @access:    public
*/
const sectorWiseLatestPrice = async (req, res, next) => {
  const price = await Fundamental.aggregate([
    {
      $lookup: {
        from: 'latest_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'latest_price',
      },
    },
    { $unwind: '$latest_price' },
    {
      $group: {
        _id: '$sector',
        totalShare: { $sum: 1 },
        uptrend: {
          $sum: {
            $cond: [{ $gt: ['$latest_price.change', 0] }, 1, 0],
          },
        },
        downtrend: {
          $sum: {
            $cond: [{ $lt: ['$latest_price.change', 0] }, 1, 0],
          },
        },
        neutral: {
          $sum: {
            $cond: [{ $eq: ['$latest_price.change', 0] }, 1, 0],
          },
        },
        ltp: { $avg: '$latest_price.ltp' },
        ycp: { $avg: '$latest_price.ycp' },
        high: { $avg: '$latest_price.high' },
        low: { $avg: '$latest_price.low' },
        close: { $avg: '$latest_price.close' },
        change: { $avg: '$latest_price.change' },
      },
    },
    {
      $addFields: {
        ltp: { $round: ['$ltp', 2] },
        ycp: { $round: ['$ycp', 2] },
        high: { $round: ['$high', 2] },
        low: { $round: ['$low', 2] },
        close: { $round: ['$close', 2] },
        change: { $round: ['$change', 2] },
      },
    },
    {
      $sort: { change: -1 },
    },
  ]);

  res.status(200).json(price);
};

/*
  @api:       GET /api/prices/dailySectorPrice/:sectorTag?period={number}
  @desc:      get sector wise dailyt prices
  @access:    public
*/
const dailySectorPrice = async (req, res, next) => {
  const sectorTag = req.params.sectorTag;

  const sector = sectorList.find((item) => item.tag === sectorTag).name;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 260; // default to 1 year //

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
              coll: 'latest_prices',
              pipeline: [
                {
                  $lookup: {
                    from: 'fundamentals',
                    localField: 'tradingCode',
                    foreignField: 'tradingCode',
                    as: 'fundamentals',
                  },
                },
                { $unwind: '$fundamentals' },
                {
                  $group: {
                    _id: '$fundamentals.sector',
                    ltp: { $avg: 'ltp' },
                    ycp: { $avg: 'ycp' },
                    high: { $avg: 'high' },
                    low: { $avg: 'low' },
                    close: { $avg: 'close' },
                    change: { $avg: 'change' },
                  },
                },
                {
                  $addFields: {
                    ltp: { $round: ['$ltp', 2] },
                    ycp: { $round: ['$ycp', 2] },
                    high: { $round: ['$high', 2] },
                    low: { $round: ['$low', 2] },
                    close: { $round: ['$close', 2] },
                    change: { $round: ['$change', 2] },
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
                    '$date',
                    {
                      $multiply: [
                        {
                          $subtract: [
                            {
                              $dayOfWeek: '$date',
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
              _id: '$startOfWeek',
              open: { $first: '$ycp' },
              high: { $max: '$high' },
              low: { $min: '$low' },
              close: { $last: '$close' },
              trade: { $sum: '$trade' },
              volume: { $sum: '$volume' },
              value: { $sum: '$value' },
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
              coll: 'latest_prices',
              pipeline: [
                {
                  $lookup: {
                    from: 'fundamentals',
                    localField: 'tradingCode',
                    foreignField: 'tradingCode',
                    as: 'fundamentals',
                  },
                },
                { $unwind: '$fundamentals' },
                {
                  $group: {
                    _id: '$fundamentals.sector',
                    ltp: { $avg: 'ltp' },
                    ycp: { $avg: 'ycp' },
                    high: { $avg: 'high' },
                    low: { $avg: 'low' },
                    close: { $avg: 'close' },
                    change: { $avg: 'change' },
                  },
                },
                {
                  $addFields: {
                    ltp: { $round: ['$ltp', 2] },
                    ycp: { $round: ['$ycp', 2] },
                    high: { $round: ['$high', 2] },
                    low: { $round: ['$low', 2] },
                    close: { $round: ['$close', 2] },
                    change: { $round: ['$change', 2] },
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
                    $year: { date: '$date', timezone: 'Asia/Dhaka' },
                  },
                  month: {
                    $month: { date: '$date', timezone: 'Asia/Dhaka' },
                  },
                  day: 1,
                },
              },
            },
          },
          {
            $group: {
              _id: '$startOfMonth',
              open: { $first: '$ycp' },
              high: { $max: '$high' },
              low: { $min: '$low' },
              close: { $last: '$close' },
              trade: { $sum: '$trade' },
              volume: { $sum: '$volume' },
              value: { $sum: '$value' },
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

  res.status(200).json(dailySector);
};

/*
  @api:       GET /api/prices/stock/:code?period={number}
  @desc:      get stock fundamentals, latest price, minute charts
  @access:    public
*/
const stockDetails = async (req, res, next) => {
  const tradingCode = req.params.code;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 260; // default to 1 year //

  const today = DateTime.now().setZone('Asia/Dhaka');

  const queryDate = today
    .set({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    })
    .setZone('UTC', { keepLocalTime: true });

  // later LatestPrice //
  const latestPrice = await Dp.findOne({ tradingCode, date: queryDate });

  const minutePrice = await MinutePrice.find({
    tradingCode,
    date: queryDate,
  }).sort({ date: 1 });

  const dailyPrice = await DailyPrice.aggregate([
    {
      $facet: {
        daily: [
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
        ],
        weekly: [
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
              coll: 'latest_prices',
              pipeline: [{ $match: { tradingCode } }],
            },
          },
          {
            $addFields: {
              startOfWeek: {
                $toDate: {
                  $subtract: [
                    '$date',
                    {
                      $multiply: [
                        {
                          $subtract: [
                            {
                              $dayOfWeek: '$date',
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
              _id: '$startOfWeek',
              open: { $first: '$ycp' },
              high: { $max: '$high' },
              low: { $min: '$low' },
              close: { $last: '$close' },
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
              coll: 'latest_prices',
              pipeline: [{ $match: { tradingCode } }],
            },
          },
          {
            $addFields: {
              startOfMonth: {
                $dateFromParts: {
                  year: {
                    $year: { date: '$date', timezone: 'Asia/Dhaka' },
                  },
                  month: {
                    $month: { date: '$date', timezone: 'Asia/Dhaka' },
                  },
                  day: 1,
                },
              },
            },
          },
          {
            $group: {
              _id: '$startOfMonth',
              open: { $first: '$ycp' },
              high: { $max: '$high' },
              low: { $min: '$low' },
              close: { $last: '$close' },
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

  const fundamentals = await Fundamental.findOne({ tradingCode });

  // res.status(200).json({ latestPrice, minutePrice, dailyPrice, fundamentals });
  res.status(200).json(dailyPrice);
};

/*
  @api:       GET /api/prices/topGainerLooser
  @desc:      get daily yearly and all time gainer and loosers
  @access:    public
*/
const topGainerLooser = async (req, res, next) => {
  const today = DateTime.now().setZone('Asia/Dhaka');

  const queryDate = today
    .set({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    })
    .setZone('UTC', { keepLocalTime: true });

  const yesterday = queryDate.minus({ days: 1 });

  // res.json({ today, queryDate, yesterday });

  const daily = await MinutePrice.aggregate([
    {
      $facet: {
        gainer: [
          {
            $sort: {
              change: -1,
            },
          },
          { $limit: 10 },
        ],
        looser: [
          {
            $sort: {
              change: 1,
            },
          },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const yearly = await DailyPrice.aggregate([
    {
      $match: {
        date: yesterday,
      },
    },
    {
      $lookup: {
        from: 'latest_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'latest_price',
      },
    },
    { $unwind: '$latest_price' },
    { $addFields: { latest_price: '$latest_price' } },
    {
      $facet: {
        gainerYearly: [
          {
            $match: {
              '$latest_price.high': {
                $gt: '$yearlyHigh',
              },
            },
          },
          {
            $sort: {
              '$latest_price.change': -1,
            },
          },
        ],
        gainerAlltime: [
          {
            $match: {
              '$latest_price.high': {
                $gt: '$alltimeHigh',
              },
            },
          },
          {
            $sort: {
              '$latest_price.change': -1,
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json(daily[0]);
  // res.status(200).json({ d, pd });
};

// Helper function //
const getStartOfWeek = (date) => {
  const daysToSubtract = date.weekday % 7;
  const startOfWeek = date.minus({ days: daysToSubtract });
  return startOfWeek;
};

module.exports = {
  latestPrice,
  sectorWiseLatestPrice,
  dailySectorPrice,
  stockDetails,
  topGainerLooser,
};
