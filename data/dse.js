const sectorList = [
  { name: "Bank", tag: "bank" },
  { name: "Cement", tag: "cement" },
  { name: "Ceramics Sector", tag: "ceramics" },
  { name: "Corporate Bond", tag: "corporate" },
  { name: "Debenture", tag: "debenture" },
  { name: "Engineering", tag: "engineering" },
  { name: "Financial Institutions", tag: "financial" },
  { name: "Food & Allied", tag: "food" },
  { name: "Fuel & Power", tag: "fuel" },
  { name: "G-SEC (T.Bond)", tag: "g-sec" },
  { name: "General Insurance", tag: "general" },
  { name: "IT Sector", tag: "it" },
  { name: "Jute", tag: "jute" },
  { name: "Life Insurance", tag: "life" },
  { name: "Miscellaneous", tag: "miscellaneous" },
  { name: "Mutual Funds", tag: "mutual" },
  { name: "Paper & Printing", tag: "paper" },
  { name: "Pharmaceuticals & Chemicals", tag: "pharmaceuticals" },
  { name: "Services & Real Estate", tag: "services" },
  { name: "Tannery Industries", tag: "tannery" },
  { name: "Telecommunication", tag: "telecommunication" },
  { name: "Textile", tag: "textile" },
  { name: "Travel & Leisure", tag: "travel" },
];

const categoryList = ["A", "B", "N", "Z", "SME"];

const circuitMoveRange = [
  { min: 1, max: 200, value: 10 },
  { min: 201, max: 500, value: 8.75 },
  { min: 501, max: 1000, value: 7.5 },
  { min: 1001, max: 2000, value: 6.25 },
  { min: 2001, max: 5000, value: 5 },
  { min: 5001, max: 20000, value: 3.75 },
];

const inactiveStocks = [
  "UNITEDAIR",
  "ONEBANK",
  "Monno jute stafllers ltd",
  "CAPITECGBF",
  "ICB2NDNRB",
  "NLI1STMF",
  "SEBL1STMF",
  "BXSYNTH",
  "GLAXOSMITH",
];

// {
//   "tradingCode": "UNITEDAIR",
//   "price": 1.9
// },
// {
//   "tradingCode": "ONEBANK",
//   "price": 9.5
// },
// {
//   "tradingCode": "Monno jute stafllers ltd",
//   "price": 794.8
// },
// {
//   "tradingCode": "CAPITECGBF",
//   "price": 13.4
// },
// {
//   "tradingCode": "ICB2NDNRB",
//   "price": 0
// },
// {
//   "tradingCode": "NLI1STMF",
//   "price": 14.4
// },
// {
//   "tradingCode": "SEBL1STMF",
//   "price": 13.1
// },
// {
//   "tradingCode": "BXSYNTH",
//   "price": 8.4
// },
// {
//   "tradingCode": "GLAXOSMITH",
//   "price": 2046.8
// }

module.exports = {
  sectorList,
  categoryList,
  circuitMoveRange,
};
