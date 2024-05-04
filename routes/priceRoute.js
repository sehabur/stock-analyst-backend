const express = require("express");
const axios = require("axios");
const {
  getAllStocks,
  getStocksList,
  getIpoList,
  latestPrice,
  latestPricesBySearch,
  sectorWiseLatestPrice,
  dailySectorPrice,
  stockDetails,
  allGainerLoser,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  screener,
  topFinancials,
  pytest,
  getSymbolTvchart,
  getBarsTvchart,
  newtest,
} = require("../controllers/priceController");

const router = express.Router();

router.route("/latestPrice").get(latestPrice);

router.route("/getStocksList").get(getStocksList);

router.route("/getAllStocks").get(getAllStocks);

router.route("/ipo").get(getIpoList);

router.route("/latestPricesBySearch").get(latestPricesBySearch);

router.route("/sectorWiseLatestPrice").get(sectorWiseLatestPrice);

router.route("/dailySectorPrice/:sectorTag").get(dailySectorPrice);

router.route("/stock/:code").get(stockDetails);

router.route("/news/:code").get(newsByStock);

router.route("/blockTr/:code").get(blocktrByStock);

router.route("/allGainerLoser").get(allGainerLoser);

router.route("/indexMinuteData").get(indexMinuteData);

router.route("/screener").post(screener);

router.route("/topFinancials").get(topFinancials);

router.route("/pytest").get(pytest);

router.route("/getSymbolTvchart").get(getSymbolTvchart);

router.route("/getBarsTvchart").get(getBarsTvchart);

router.route("/newtest").get(newtest);

router.route("/test").post(async () => {
  await axios.request({
    method: "post",
    url: "https://www.dsebd.org/ajax/load-instrument.php",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8:",
      Host: "www.dsebd.org",
      "X-Requested-With": "XMLHttpRequest",
    },
    data: {
      inst: "INTRACO",
    },
  });
});

module.exports = router;
