const mongoose = require("mongoose");

const fundamentalSchema = mongoose.Schema(
  {
    tradingCode: { type: String, required: true },
    companyName: { type: String, required: true },
    marketLot: { type: Number, required: true },
    totalShares: { type: Number, required: true },
    sector: { type: String, required: true },
    lastAgm: { type: String, required: true },
    rightIssue: { type: String, required: true },
    yearEnd: { type: String, required: true },
    reserveSurplusWithoutOci: { type: Number, required: true },
    oci: { type: Number, required: true },
    listingYear: { type: String, required: true },
    category: { type: String, required: true },
    shortTermLoan: { type: Number, required: true },
    longTermLoan: { type: Number, required: true },
    faceValue: { type: Number, required: true },
    epsCurrent: { type: Number, required: true },
    floorPrice: { type: Number, required: true },
    epsCurrent: { type: Number, required: true },
    about: { type: String, required: true },

    declarationDate: { type: Date },
    recordDate: { type: Date },

    epsQuaterly: [{ type: Object, required: true }],
    navQuaterly: [{ type: Object, required: true }],
    nocfpsQuaterly: [{ type: Object, required: true }],

    cashDividend: [{ type: Object, required: true }],
    stockDividend: [{ type: Object, required: true }],
    profitYearly: [{ type: Object, required: true }],
    epsYearly: [{ type: Object, required: true }],
    navYearly: [{ type: Object, required: true }],

    totalAsset: [{ type: Object, required: true }],
    totalCurrentAsset: [{ type: Object, required: true }],
    shareholderEquity: [{ type: Object, required: true }],
    totalNonCurrentLiabilities: [{ type: Object, required: true }],
    totalCurrentLiabilities: [{ type: Object, required: true }],
    totalOperatingIncome: [{ type: Object, required: true }],
    revenue: [{ type: Object, required: true }],
    ebit: [{ type: Object, required: true }],
    operatingProfit: [{ type: Object, required: true }],
    netIncome: [{ type: Object, required: true }],
    totalLiabilities: [{ type: Object, required: true }],
    capitalEmployed: [{ type: Object, required: true }],
    bookValue: [{ type: Object, required: true }],
    roce: [{ type: Object, required: true }],
    de: [{ type: Object, required: true }],
    roe: [{ type: Object, required: true }],
    roa: [{ type: Object, required: true }],
    currentRatio: [{ type: Object, required: true }],
    netIncomeRatio: [{ type: Object, required: true }],
    profitMargin: [{ type: Object, required: true }],

    screener: { type: Object },

    isActive: { type: Boolean },
  },
  {
    timestamps: true,
  }
);

const Fundamental = mongoose.model("Fundamental", fundamentalSchema);

module.exports = Fundamental;
