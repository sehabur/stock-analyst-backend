const Fundamental = require('../models/fundamentalModel');

const xlsx = require('xlsx');

const workbook = xlsx.readFile(
  'E:/MERN_APP/stock-analyst-bd/data/eps_nav_upload.xlsx'
);

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
  //   var sheet_name_list = workbook.SheetNames;
  var xlData = xlsx.utils.sheet_to_json(workbook.Sheets['fin']);

  const datamap = [
    { text: 'Total Asset', value: 'totalAsset' },
    { text: "Shareholder's equity", value: 'shareholderEquity' },
    {
      text: 'Total Non Current Liabilities',
      value: 'totalNonCurrentLiabilities',
    },
    { text: 'Total Current Liabilities', value: 'totalCurrentLiabilities' },
    // { text: 'Total Liabilities', value: 'totalLiabilities' },
    // { text: 'NAV', value: 'nav' },
    { text: 'Total Operating Income', value: 'totalOperatingIncome' },
    { text: 'Revenue', value: 'revenue' },
    { text: 'EBIT(Earn Before TAx)', value: 'ebit' },
    // { text: 'Net Income/Profit after tax', value: 'netIncomeAfterTax' },
    // { text: 'Capital Emplyed', value: 'capitalEmplyed' },
    // { text: 'Book Value', value: 'bookValue' },
    // { text: 'ROCE', value: 'roce' },
    // { text: 'D/E', value: 'de' },
    // { text: 'ROE', value: 'roe' },
    // { text: 'EPS', value: 'eps' },
  ];

  const perChunk = 8;

  const result = xlData.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);

  finalData = [];

  // res.json({ result });

  for (stock of result) {
    let financeData = {
      tradingCode: stock[0].tradingCode,
      values: {},
    };
    for (data of stock) {
      console.log(data);
      const param = datamap.find((item) => item.text === data.parameter);

      financeData.values[param?.value] = [
        {
          year: '2017',
          value: data['2017'],
        },
        {
          year: '2018',
          value: data['2018'],
        },
        {
          year: '2019',
          value: data['2019'],
        },
        {
          year: '2020',
          value: data['2020'],
        },
        {
          year: '2021',
          value: data['2021'],
        },
        {
          year: '2022',
          value: data['2022'],
        },
      ];
    }

    finalData.push(financeData);
  }
  res.json({ finalData });

  // for (item of finalData) {
  //   const tradingCode = item.tradingCode;
  //   const updateData = item.values;

  //   const response = await Fundamental.findOneAndUpdate(
  //     { tradingCode },
  //     { ...updateData }
  //   );
  // }
};

module.exports = {
  insertEps,
  insertNav,
  insertNocfps,
  insertFinanceData,
};
