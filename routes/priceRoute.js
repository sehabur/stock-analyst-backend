const express = require("express");

const axios = require("axios");

const {
  getAllStocks,
  getStocksList,
  getIpoList,
  latestPrice,
  indexMover,
  latestPricesBySearch,
  sectorWiseLatestPrice,
  dailySectorPrice,
  allStockBeta,
  stockDetails,
  indexDetails,
  technicals,
  allGainerLoser,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  screener,
  topFinancials,
  pytest,
  getSymbolTvchart,
  getBarsTvchart,
  marketDepth,
  newtest,
} = require("../controllers/priceController");

const { sendMailToUser } = require("../helper/mailer");

const router = express.Router();

router.route("/latestPrice").get(latestPrice);

router.route("/indexMover").get(indexMover);

router.route("/allStockBeta").get(allStockBeta);

router.route("/getStocksList").get(getStocksList);

router.route("/getAllStocks").get(getAllStocks);

router.route("/ipo").get(getIpoList);

router.route("/latestPricesBySearch").get(latestPricesBySearch);

router.route("/sectorWiseLatestPrice").get(sectorWiseLatestPrice);

router.route("/dailySectorPrice/:sectorTag").get(dailySectorPrice);

router.route("/stock/:code").get(stockDetails);

router.route("/index/:code").get(indexDetails);

router.route("/technical/stock/:code").get(technicals);

router.route("/news/:code").get(newsByStock);

router.route("/blockTr/:code").get(blocktrByStock);

router.route("/allGainerLoser").get(allGainerLoser);

router.route("/indexMinuteData").get(indexMinuteData);

router.route("/screener").post(screener);

router.route("/topFinancials").get(topFinancials);

router.route("/getSymbolTvchart").get(getSymbolTvchart);

router.route("/getBarsTvchart").get(getBarsTvchart);

router.route("/marketDepth").get(marketDepth);

// Test functions //
router.route("/pytest").get(pytest);

router.route("/newtest").get(newtest);

router.route("/test").post(async (req, res) => {
  const data = await axios.request({
    method: "post",
    url: "https://www.dsebd.org/ajax/load-instrument.php",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8:",
      Host: "www.dsebd.org",
      "X-Requested-With": "XMLHttpRequest",
    },
    data: {
      inst: "MALEKSPIN",
    },
  });
  console.log(data.data);
  res.send(data.data);
});

module.exports = router;
