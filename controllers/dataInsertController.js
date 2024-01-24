const Fundamental = require('../models/fundamentalModel');

const xlsx = require('xlsx');

/*
  @api:       GET /api/dataInsert/eps/
  @desc:      insert eps quarterly data to collection 
  @access:    public
*/
const insertFloorPrice = async (req, res, next) => {
  const newWorkbook = xlsx.readFile(
    'E:/MERN_APP/stock-analyst-bd/data/floor_price_list.xlsx'
  );

  var xlData = xlsx.utils.sheet_to_json(newWorkbook.Sheets['Sheet1']);

  for (data of xlData) {
    const response = await Fundamental.findOneAndUpdate(
      { tradingCode: data.code.trim() },
      { floorPrice: data.price }
    );
    // console.log(response);
  }

  res.send('Floor price updated');
};

/*
  @api:       GET /api/dataInsert/eps/
  @desc:      insert eps quarterly data to collection 
  @access:    public
*/
const insertEps = async (req, res, next) => {
  var xlData = xlsx.utils.sheet_to_json(workbook.Sheets['eps']);

  for (data of xlData) {
    const insertData = {
      year: '2022',
      q1: data['Q1-2022'],
      q2: data['Q2-2022'],
      q3: data['Q3-2022'],
      q4: data['Q4-2022'],
      annual: data['annual-2022'],
    };
    const response = await Fundamental.findOneAndUpdate(
      { tradingCode: data.tradingCode },
      { $push: { epsQuaterly: insertData } }
    );
  }

  res.send(xlData);
};

const insertNav = async (req, res, next) => {
  var xlData = xlsx.utils.sheet_to_json(workbook.Sheets['nav']);

  for (data of xlData) {
    const insertData = [
      {
        year: '2022',
        q1: data['Q1-2022'],
        q2: data['Q2-2022'],
        q3: data['Q3-2022'],
        q4: data['Q4-2022'],
      },
      {
        year: '2023',
        q1: data['Q1-2023'],
        q2: data['Q2-2023'],
        q3: data['Q3-2023'],
      },
    ];
    const response = await Fundamental.findOneAndUpdate(
      { tradingCode: data.tradingCode },
      { navQuaterly: insertData }
    );
  }

  res.send(xlData);
};

const insertNocfps = async (req, res, next) => {
  var xlData = xlsx.utils.sheet_to_json(workbook.Sheets['npcfps']);

  for (data of xlData) {
    const insertData = [
      // {
      //   year: '2022',
      //   q1: data['Q1-2022'],
      //   q2: data['Q2-2022'],
      //   q3: data['Q3-2022'],
      //   q4: data['Q4-2022'],
      // },
      {
        year: '2023',
        q1: data['Q1-2023'],
        q2: data['Q2-2023'],
        q3: data['Q3-2023'],
        q4: data['Q4-2023'],
      },
    ];
    const response = await Fundamental.findOneAndUpdate(
      { tradingCode: data.tradingCode },
      { nocfpsQuaterly: insertData }
    );
  }

  res.send(xlData);
};

const insertFinanceData = async (req, res, next) => {
  const workbook = xlsx.readFile(
    'E:/MERN_APP/stock-analyst-bd/data/eps_nav_upload.xlsx'
  );
  const xlData = xlsx.utils.sheet_to_json(workbook.Sheets['fin']);

  const datamap = [
    { text: 'Total Asset', value: 'totalAsset' },
    { text: 'Total Current Asset', value: 'totalCurrentAsset' },
    { text: "Shareholder's equity", value: 'shareholderEquity' },
    {
      text: 'Total Non Current Liabilities',
      value: 'totalNonCurrentLiabilities',
    },
    { text: 'Total Current Liabilities', value: 'totalCurrentLiabilities' },
    { text: 'Revenue', value: 'revenue' },
    { text: 'Operating Profit/Loss', value: 'operatingProfit' },
    { text: 'EBIT(Earn Before TAx)', value: 'ebit' },
    { text: 'Net Income/Profit after tax', value: 'netIncome' },
  ];

  const perChunk = 9;
  const result = xlData.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);

  // res.json(result);

  finalData = [];

  for (stock of result) {
    let financeData = {
      tradingCode: stock[0].tradingCode,
      values: {},
    };

    let years = Object.keys(stock[0]).filter((item) => item.startsWith('20'));

    // console.log(stock[0].tradingCode)

    for (data of stock) {
      const param = datamap.find((item) => item.text === data.parameter).value;

      if (param) {
        yearWiseValue = [];

        for (let year of years) {
          yearWiseValue.push({
            year: year,
            value: data[year] || null,
          });
        }
        financeData.values[param] = yearWiseValue;
      }
    }
    finalData.push(financeData);
  }

  // res.json(finalData);

  let dataPush = [];

  for (let data of finalData) {
    let totalLiabilities = [];
    let bookValue = [];
    let roe = [];
    let roce = [];
    let de = [];
    let profitMargin = [];
    let netIncomeRatio = [];
    let currentRatio = [];
    let capitalEmployed = [];
    let roa = [];
    // console.log(data.tradingCode);
    for (let i = 0; i < data.values.totalAsset.length; i++) {
      const year = data.values.totalAsset[i].year;

      totalLiabilities.push({
        year: year,
        value: Number(
          data.values.totalNonCurrentLiabilities[i].value +
          data.values.totalCurrentLiabilities[i].value
        ),
      });
      bookValue.push({
        year: year,
        value: Number(
          data.values.totalAsset[i].value -
          (data.values.totalNonCurrentLiabilities[i].value +
            data.values.totalCurrentLiabilities[i].value)
        ),
      });
      capitalEmployed.push({
        year: year,
        value: Number(
          data.values.totalAsset[i].value -
          data.values.totalCurrentLiabilities[i].value
        ),
      });
      roa.push({
        year: year,
        value: Number(
          (
            data.values.netIncome[i].value / data.values.totalAsset[i].value
          ).toFixed(3)
        ),
      });
      currentRatio.push({
        year: year,
        value: Number(
          (
            data.values.totalCurrentAsset[i].value /
            data.values.totalCurrentLiabilities[i].value
          ).toFixed(3)
        ),
      });
      netIncomeRatio.push({
        year: year,
        value: Number(
          (
            data.values.netIncome[i].value / data.values.revenue[i].value
          ).toFixed(3)
        ),
      });
      profitMargin.push({
        year: year,
        value: Number(
          (
            data.values.revenue[i].value / data.values.netIncome[i].value
          ).toFixed(3)
        ),
      });
      de.push({
        year: year,
        value: Number(
          (
            (data.values.totalNonCurrentLiabilities[i].value +
              data.values.totalCurrentLiabilities[i].value) /
            (data.values.totalAsset[i].value -
              (data.values.totalNonCurrentLiabilities[i].value +
                data.values.totalCurrentLiabilities[i].value))
          ).toFixed(3)
        ),
      });
      roce.push({
        year: year,

        value: Number(
          (
            data.values.ebit[i].value /
            (data.values.totalAsset[i].value -
              data.values.totalCurrentLiabilities[i].value)
          ).toFixed(3)
        ),
      });
      roe.push({
        year: year,
        value: Number(
          (
            data.values.netIncome[i].value /
            (data.values.totalAsset[i].value -
              (data.values.totalNonCurrentLiabilities[i].value +
                data.values.totalCurrentLiabilities[i].value))
          ).toFixed(3)
        ),
      });
    }
    data.values.totalLiabilities = totalLiabilities;
    data.values.bookValue = bookValue;
    data.values.capitalEmployed = capitalEmployed;
    data.values.roa = roa;
    data.values.currentRatio = currentRatio;
    data.values.netIncomeRatio = netIncomeRatio;
    data.values.profitMargin = profitMargin;
    data.values.de = de;
    data.values.roce = roce;
    data.values.roe = roe;

    dataPush.push(data);
  }

  // res.json(dataPush);

  for (item of dataPush) {
    const tradingCode = item.tradingCode;
    console.log(tradingCode);
    await Fundamental.findOneAndUpdate({ tradingCode }, item.values);
  }

  res.json(dataPush);
};

module.exports = {
  insertEps,
  insertNav,
  insertNocfps,
  insertFinanceData,
  insertFloorPrice,
};
