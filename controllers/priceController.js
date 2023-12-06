const url = require('url');
const { DateTime } = require('luxon');
const MinutePrice = require('../models/minutePriceModel');
const Fundamental = require('../models/fundamentalModel');
const DailyPrice = require('../models/dailyPriceModel');
const DailySector = require('../models/dailySectorModel');
const LatestPrice = require('../models/latestPriceModel');
const News = require('../models/newsModel');
const BlockTr = require('../models/BlockTrModel');
const MinuteIndex = require('../models/minuteIndexModel');
const Setting = require('../models/settingModel');
const {
  sectorList,
  stocksListDetails,
  circuitMoveRange,
} = require('../data/dse');
const { assert } = require('console');

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
        companyName: '$fundamentals.companyName',
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
        companyName: '$fundamentals.companyName',
      },
    },
    {
      $project: { fundamentals: 0 },
    },
    {
      $match: {
        $or: [
          { tradingCode: { $regex: new RegExp(search, 'i') } },
          { companyName: { $regex: new RegExp(search, 'i') } },
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
        value: { $sum: '$latest_price.value' },
        volume: { $sum: '$latest_price.volume' },
        trade: { $sum: '$latest_price.trade' },
        valueCategoryA: {
          $sum: {
            $cond: {
              if: { $eq: ['$category', 'A'] },
              then: '$latest_price.value',
              else: 0,
            },
          },
        },
        valueCategoryB: {
          $sum: {
            $cond: {
              if: { $eq: ['$category', 'B'] },
              then: '$latest_price.value',
              else: 0,
            },
          },
        },
        valueCategoryN: {
          $sum: {
            $cond: {
              if: { $eq: ['$category', 'N'] },
              then: '$latest_price.value',
              else: 0,
            },
          },
        },
        valueCategoryZ: {
          $sum: {
            $cond: {
              if: { $eq: ['$category', 'Z'] },
              then: '$latest_price.value',
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        sector: '$_id',
        uptrend: 1,
        downtrend: 1,
        neutral: 1,
        ltp: { $round: ['$ltp', 2] },
        ycp: { $round: ['$ycp', 2] },
        high: { $round: ['$high', 2] },
        low: { $round: ['$low', 2] },
        close: { $round: ['$close', 2] },
        change: { $round: ['$change', 2] },
        valueTotal: { $round: ['$value', 2] },
        volume: { $round: ['$volume', 2] },
        trade: { $round: ['$trade', 2] },
        valueCategoryA: { $round: ['$valueCategoryA', 2] },
        valueCategoryB: { $round: ['$valueCategoryB', 2] },
        valueCategoryN: { $round: ['$valueCategoryN', 2] },
        valueCategoryZ: { $round: ['$valueCategoryZ', 2] },
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
      'dailySectorUpdateDate minuteDataUpdateDate'
    );

  const minuteSector = await Fundamental.aggregate([
    {
      $match: {
        sector: sector,
      },
    },
    {
      $lookup: {
        from: 'minute_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'minute_prices',
        pipeline: [{ $match: { date: minuteDataUpdateDate } }],
      },
    },
    { $unwind: '$minute_prices' },
    {
      $sort: {
        'minute_prices.time': 1,
      },
    },
    {
      $project: {
        date: '$minute_prices.date',
        time: '$minute_prices.time',
        tradingCode: '$minute_prices.tradingCode',
        ltp: '$minute_prices.ltp',
        high: '$minute_prices.high',
        low: '$minute_prices.low',
        close: '$minute_prices.close',
        ycp: '$minute_prices.ycp',
        change: '$minute_prices.change',
        percentChange: '$minute_prices.percentChange',
        trade: '$minute_prices.trade',
        value: '$minute_prices.value',
        volume: '$minute_prices.volume',
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
              coll: 'latest_prices',
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
                    from: 'fundamentals',
                    localField: 'tradingCode',
                    foreignField: 'tradingCode',
                    as: 'fundamentals',
                  },
                },
                { $unwind: '$fundamentals' },
                {
                  $match: {
                    'fundamentals.sector': sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: '$date' },
                    ltp: { $avg: '$ltp' },
                    ycp: { $avg: '$ycp' },
                    high: { $avg: '$high' },
                    low: { $avg: '$low' },
                    close: { $avg: '$ltp' },
                    change: { $avg: '$change' },
                    trade: { $sum: '$trade' },
                    value: { $sum: '$value' },
                    volume: { $sum: '$volume' },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ['$ltp', 2] },
                    ycp: { $round: ['$ycp', 2] },
                    high: { $round: ['$high', 2] },
                    low: { $round: ['$low', 2] },
                    close: { $round: ['$close', 2] },
                    change: { $round: ['$change', 2] },
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
              coll: 'latest_prices',
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
                    from: 'fundamentals',
                    localField: 'tradingCode',
                    foreignField: 'tradingCode',
                    as: 'fundamentals',
                  },
                },
                { $unwind: '$fundamentals' },
                {
                  $match: {
                    'fundamentals.sector': sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: '$date' },
                    ltp: { $avg: '$ltp' },
                    ycp: { $avg: '$ycp' },
                    high: { $avg: '$high' },
                    low: { $avg: '$low' },
                    close: { $avg: '$ltp' },
                    change: { $avg: '$change' },
                    trade: { $sum: '$trade' },
                    value: { $sum: '$value' },
                    volume: { $sum: '$volume' },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ['$ltp', 2] },
                    ycp: { $round: ['$ycp', 2] },
                    high: { $round: ['$high', 2] },
                    low: { $round: ['$low', 2] },
                    close: { $round: ['$close', 2] },
                    change: { $round: ['$change', 2] },
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
            $addFields: {
              date: '$_id',
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
                  $match: {
                    date: {
                      $gt: dailySectorUpdateDate,
                    },
                  },
                },
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
                  $match: {
                    'fundamentals.sector': sector,
                  },
                },
                {
                  $group: {
                    _id: null,
                    date: { $first: '$date' },
                    ltp: { $avg: '$ltp' },
                    ycp: { $avg: '$ycp' },
                    high: { $avg: '$high' },
                    low: { $avg: '$low' },
                    close: { $avg: '$ltp' },
                    change: { $avg: '$change' },
                    trade: { $sum: '$trade' },
                    value: { $sum: '$value' },
                    volume: { $sum: '$volume' },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    sector: sector,
                    ltp: { $round: ['$ltp', 2] },
                    ycp: { $round: ['$ycp', 2] },
                    high: { $round: ['$high', 2] },
                    low: { $round: ['$low', 2] },
                    close: { $round: ['$close', 2] },
                    change: { $round: ['$change', 2] },
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
            $addFields: {
              date: '$_id',
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
  const tradingCode = req.params.code;

  const { period } = url.parse(req.url, true).query;

  const queryLimit = period ? Number(period) : 260; // default to 1 year //

  const sector = stocksListDetails.find(
    (stock) => stock.tradingCode === tradingCode
  ).sector;

  const { dailyPriceUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select('dailyIndexUpdateDate minuteDataUpdateDate');

  const minutePrice = await MinutePrice.aggregate([
    {
      $facet: {
        latest: [
          {
            $match: {
              tradingCode,
              date: minuteDataUpdateDate,
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
        ],
        minute: [
          {
            $match: {
              tradingCode,
              date: minuteDataUpdateDate,
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
          {
            $sort: {
              time: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: '$latest',
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
        coll: 'latest_prices',
        pipeline: [
          {
            $match: {
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
              open: '$ycp',
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
            $addFields: {
              date: '$_id',
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
            $addFields: {
              date: '$_id',
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
      $unwind: '$lastDay',
    },
  ]);

  const fundamentalsBasic = await Fundamental.findOne({ tradingCode });

  const sectorRatio = await Fundamental.aggregate([
    {
      $match: {
        sector,
      },
    },
    {
      $lookup: {
        from: 'latest_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'latest_prices',
      },
    },
    {
      $unwind: '$latest_prices',
    },
    {
      $project: {
        // code: '$tradingCode',
        // ltp: {
        //   $cond: [
        //     { $gt: ['$latest_prices.ltp', 0] },
        //     '$latest_prices.ltp',
        //     '$latest_prices.ycp',
        //   ],
        // },
        // ycp: '$latest_prices.ycp',
        // eps: '$epsCurrent',
        // a: { $last: '$totalAsset.value' },
        // b: { $last: '$totalCurrentLiabilities.value' },
        // c: { $last: '$totalNonCurrentLiabilities.value' },
        pe: {
          $round: [
            {
              $divide: [
                {
                  $cond: [
                    { $gt: ['$latest_prices.ltp', 0] },
                    '$latest_prices.ltp',
                    '$latest_prices.ycp',
                  ],
                },
                '$epsCurrent',
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
                  $multiply: [
                    {
                      $cond: [
                        { $gt: ['$latest_prices.ltp', 0] },
                        '$latest_prices.ltp',
                        '$latest_prices.ycp',
                      ],
                    },
                    '$totalShares',
                  ],
                },
                {
                  $subtract: [
                    { $last: '$totalAsset.value' },
                    {
                      $add: [
                        { $last: '$totalCurrentLiabilities.value' },
                        { $last: '$totalNonCurrentLiabilities.value' },
                      ],
                    },
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

  const peValues = sectorRatio.map((item) => item.pe).sort((a, b) => a - b);

  const pbvValues = sectorRatio.map((item) => item.pbv).sort((a, b) => a - b);

  const dataLength = fundamentalsBasic.totalAsset.length;

  const latestPrice = minutePrice[0].latest;

  const ltp = latestPrice.ltp > 0 ? latestPrice.ltp : latestPrice.ycp;

  const circuitRange = circuitMoveRange.find(
    (item) => ltp > item.min && ltp < item.max
  ).value;

  const circuitUp = Number(
    Math.floor(ltp + (ltp * circuitRange) / 100).toFixed(1)
  );
  const circuitLow = Number((ltp - (ltp * circuitRange) / 100).toFixed(1));

  const getMedian = (values) => {
    const half = Math.floor(values.length / 2);
    return Number(
      (values.length % 2
        ? values[half]
        : (values[half - 1] + values[half]) / 2
      ).toFixed(2)
    );
  };

  let roe = [];
  let roce = [];
  let de = [];
  let profitMargin = [];
  let divPayoutRatio = [];

  for (let i = 0; i < dataLength; i++) {
    const year = fundamentalsBasic.totalAsset[i].year;

    const profit =
      fundamentalsBasic.profitYearly.find((item) => item.year === year)?.value *
      1000000; // from mn to taka //
    const asset = fundamentalsBasic.totalAsset.find(
      (item) => item.year === year
    ).value;
    const totalCurrentLiabilities =
      fundamentalsBasic.totalCurrentLiabilities.find(
        (item) => item.year === year
      ).value;
    const totalNonCurrentLiabilities =
      fundamentalsBasic.totalNonCurrentLiabilities.find(
        (item) => item.year === year
      ).value;
    const shareholderEquity = fundamentalsBasic.shareholderEquity.find(
      (item) => item.year === year
    ).value;
    const ebit = fundamentalsBasic.ebit.find(
      (item) => item.year === year
    ).value;
    const revenue = fundamentalsBasic.revenue.find(
      (item) => item.year === year
    ).value;
    const cashDividend = fundamentalsBasic.cashDividend.find(
      (item) => item.year === year
    )?.value;
    const epsYearly = fundamentalsBasic.epsYearly.find(
      (item) => item.year === year
    )?.value;

    if (profit) {
      roe.push({
        year: year,
        value: Number((profit / shareholderEquity).toFixed(3)),
      });
      profitMargin.push({
        year: year,
        value: Number((revenue / profit).toFixed(3)),
      });
    }
    roce.push({
      year: year,
      value: Number((ebit / (asset - totalCurrentLiabilities)).toFixed(3)),
    });
    de.push({
      year: year,
      value: Number(
        (
          (totalCurrentLiabilities + totalNonCurrentLiabilities) /
          shareholderEquity
        ).toFixed(3)
      ),
    });

    if (cashDividend && epsYearly) {
      divPayoutRatio.push({
        year: year,
        value: Number(
          (
            (cashDividend * 100) /
            (fundamentalsBasic.faceValue * epsYearly)
          ).toFixed(3)
        ),
      });
    }
  }

  const fundamentalsExtended = {
    circuitUp,
    circuitLow,
    roe,
    de,
    roce,
    profitMargin,
    divPayoutRatio,
    pe: Number((ltp / fundamentalsBasic.epsCurrent).toFixed(2)),
    marketCap: Number(
      ((ltp * fundamentalsBasic.totalShares) / 10000000).toFixed(3)
    ),
    priceToBookValueRatio: Number(
      (
        (ltp * fundamentalsBasic.totalShares) /
        (fundamentalsBasic.totalAsset[dataLength - 1].value -
          fundamentalsBasic.totalCurrentLiabilities[dataLength - 1].value -
          fundamentalsBasic.totalNonCurrentLiabilities[dataLength - 1].value)
      ).toFixed(2)
    ),
    sectorPeRatio: {
      min: peValues[0],
      median: getMedian(peValues),
      max: peValues[peValues.length - 1],
    },
    sectorPbvRatio: {
      min: pbvValues[0],
      median: getMedian(pbvValues),
      max: pbvValues[pbvValues.length - 1],
    },
  };

  res.status(200).json({
    fundamentals: { ...fundamentalsBasic._doc, ...fundamentalsExtended },
    ...minutePrice[0],
    ...dailyPrice[0],
  });
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
      $unwind: '$latest',
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

  const queryLimit = limit ? Number(limit) : 20;

  let news;

  if (tradingCode === 'all') {
    news = await News.find().sort({ date: -1 }).limit(queryLimit);
  } else {
    news = await News.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }
  res.status(200).json(news);
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

  if (tradingCode === 'all') {
    blocktr = await BlockTr.find().sort({ date: -1 }).limit(queryLimit);
  } else {
    blocktr = await BlockTr.find({ tradingCode })
      .sort({ date: -1 })
      .limit(queryLimit);
  }

  res.status(200).json(blocktr);
};

/*
  @api:       GET /api/prices/topGainerLoser
  @desc:      get daily yearly and all time gainer and losers
  @access:    public
*/
const topGainerLoser = async (req, res, next) => {
  // const today = DateTime.now().setZone('Asia/Dhaka');
  // const queryDate = today
  //   .set({
  //     hour: 0,
  //     minute: 0,
  //     second: 0,
  //     millisecond: 0,
  //   })
  //   .setZone('UTC', { keepLocalTime: true });
  // const yesterday = queryDate.minus({ days: 1 });

  const { dailyPriceUpdateDate, minuteDataUpdateDate } =
    await Setting.findOne().select('dailyIndexUpdateDate minuteDataUpdateDate');

  const gainerLoser = await LatestPrice.aggregate([
    {
      $lookup: {
        from: 'daily_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'yesterday_price',
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
    { $unwind: '$yesterday_price' },
    {
      $facet: {
        gainerDaily: [
          {
            $sort: {
              percentChange: -1,
            },
          },
          { $limit: 10 },
          {
            $project: {
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
        loserDaily: [
          {
            $match: {
              ltp: {
                $gt: 0,
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
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
        gainerOneYear: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.oneYearHigh'],
              },
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          { $limit: 10 },
          {
            $project: {
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
        gainerAlltime: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.alltimeHigh'],
              },
            },
          },
          {
            $sort: {
              percentChange: -1,
            },
          },
          { $limit: 10 },
          {
            $project: {
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
        loserOneYear: [
          {
            $match: {
              ltp: {
                $ne: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.oneYearLow'],
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
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
        loserAlltime: [
          {
            $match: {
              ltp: {
                $ne: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.alltimeLow'],
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
              date: 1,
              tradingCode: 1,
              percentChange: 1,
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json(gainerLoser[0]);
};

const allGainerLoser = async (req, res, next) => {
  const { minuteDataUpdateDate } = await Setting.findOne().select(
    'minuteDataUpdateDate'
  );

  const gainerLoser = await LatestPrice.aggregate([
    {
      $lookup: {
        from: 'daily_prices',
        localField: 'tradingCode',
        foreignField: 'tradingCode',
        as: 'yesterday_price',
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
    { $unwind: '$yesterday_price' },
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        gainerOneWeek: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.oneWeekBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneWeekBeforeData',
                            ],
                          },
                          '$yesterday_price.oneWeekBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneWeekPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        gainerOneMonth: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.oneMonthBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneMonthBeforeData',
                            ],
                          },
                          '$yesterday_price.oneMonthBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneMonthPercentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        gainerSixMonth: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.sixMonthBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.sixMonthBeforeData',
                            ],
                          },
                          '$yesterday_price.sixMonthBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              sixMonthPercentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        gainerOneYear: [
          {
            $match: {
              $expr: {
                $gt: ['$ltp', '$yesterday_price.oneYearBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneYearBeforeData',
                            ],
                          },
                          '$yesterday_price.oneYearBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              oneYearPercentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        gainerFiveYear: [
          {
            $match: {
              'yesterday_price.fiveYearBeforeData': {
                $ne: '-',
              },
              $expr: {
                $gt: ['$ltp', '$yesterday_price.fiveYearBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.fiveYearBeforeData',
                            ],
                          },
                          '$yesterday_price.fiveYearBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              fiveYearPercentChange: 1,
              ltp: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        loserOneWeek: [
          {
            $match: {
              'yesterday_price.oneWeekBeforeData': {
                $ne: '-',
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.oneWeekBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneWeekBeforeData',
                            ],
                          },
                          '$yesterday_price.oneWeekBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneWeekPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        loserOneMonth: [
          {
            $match: {
              'yesterday_price.oneMonthBeforeData': {
                $ne: '-',
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.oneMonthBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneMonthBeforeData',
                            ],
                          },
                          '$yesterday_price.oneMonthBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneMonthPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        loserSixMonth: [
          {
            $match: {
              'yesterday_price.sixMonthBeforeData': {
                $ne: '-',
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.sixMonthBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.sixMonthBeforeData',
                            ],
                          },
                          '$yesterday_price.sixMonthBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              sixMonthPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        loserOneYear: [
          {
            $match: {
              'yesterday_price.oneYearBeforeData': {
                $ne: '-',
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.oneYearBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.oneYearBeforeData',
                            ],
                          },
                          '$yesterday_price.oneYearBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              oneYearPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
        loserFiveYear: [
          {
            $match: {
              'yesterday_price.fiveYearBeforeData': {
                $ne: '-',
              },
              ltp: {
                $gt: 0,
              },
              $expr: {
                $lt: ['$ltp', '$yesterday_price.fiveYearBeforeData'],
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
                              '$ltp',
                              '$yesterday_price.fiveYearBeforeData',
                            ],
                          },
                          '$yesterday_price.fiveYearBeforeData',
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
              id: '$_id',
              _id: 0,
              tradingCode: 1,
              percentChange: 1,
              ltp: 1,
              fiveYearPercentChange: 1,
              category: '$fundamentals.category',
              sector: '$fundamentals.sector',
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json(gainerLoser[0]);
};

const pytest = async (req, res, next) => {
  const dailySector = await DailyPrice.aggregate([
    {
      $match: {
        tradingCode: 'APEXFOOT',
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
              value: { $max: '$high' },
            },
          },
        ],
        '5yearHigh': [
          {
            $limit: 1250,
          },
          {
            $group: {
              _id: null,
              value: { $max: '$high' },
            },
          },
        ],
        '1yearHigh': [
          {
            $limit: 250,
          },
          {
            $group: {
              _id: null,
              value: { $max: '$high' },
            },
          },
        ],
        '6monthHigh': [
          {
            $limit: 130,
          },
          {
            $group: {
              _id: null,
              value: { $max: '$high' },
            },
          },
        ],
        '1monthHigh': [
          {
            $limit: 22,
          },
          {
            $group: {
              _id: null,
              value: { $max: '$high' },
            },
          },
        ],
        '1weekHigh': [
          {
            $limit: 5,
          },
          {
            $group: {
              _id: null,
              value: { $max: '$high' },
            },
          },
        ],
      },
    },
  ]);
  res.json(dailySector[0].rawData[5].ltp);
};

module.exports = {
  latestPrice,
  latestPricesBySearch,
  sectorWiseLatestPrice,
  dailySectorPrice,
  stockDetails,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  topGainerLoser,
  allGainerLoser,
  pytest,
};
