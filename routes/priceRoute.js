const express = require("express");

const axios = require("axios");

const {
  getAllStocks,
  getStocksList,
  getIpoList,
  latestPrice,
  indexMover,
  latestPricesBySearch,
  sectorGainValueSummary,
  sectorLatestPrice,
  dailySectorPrice,
  allStockBeta,
  stockDetails,
  indexDetails,
  technicals,
  allGainerLoser,
  topGainerLoser,
  indexMinuteData,
  newsByStock,
  blocktrByStock,
  screener,
  topFinancials,
  pytest,
  getSymbolTvchart,
  getBarsTvchart,
  marketDepth,
  marketDepthAllInst,
  newtest,
} = require("../controllers/priceController");

const router = express.Router();

router.route("/latestPrice").get(latestPrice);

router.route("/indexMover").get(indexMover);

router.route("/allStockBeta").get(allStockBeta);

router.route("/getStocksList").get(getStocksList);

router.route("/getAllStocks").get(getAllStocks);

router.route("/ipo").get(getIpoList);

router.route("/latestPricesBySearch").get(latestPricesBySearch);

// sector //
router.route("/sectorGainValueSummary").get(sectorGainValueSummary);
router.route("/sectorLatestPrice").get(sectorLatestPrice);
router.route("/dailySectorPrice/:sectorTag").get(dailySectorPrice);

router.route("/stock/:code").get(stockDetails);

router.route("/index/:code").get(indexDetails);

router.route("/technical/stock/:code").get(technicals);

router.route("/news/:code").get(newsByStock);

router.route("/blockTr/:code").get(blocktrByStock);

// Gainer
router.route("/allGainerLoser").get(allGainerLoser);
router.route("/topGainerLoser").get(topGainerLoser);

router.route("/indexMinuteData").get(indexMinuteData);

router.route("/screener").post(screener);

router.route("/topFinancials").get(topFinancials);

router.route("/getSymbolTvchart").get(getSymbolTvchart);

router.route("/getBarsTvchart").get(getBarsTvchart);

router.route("/marketDepth").get(marketDepth);

router.route("/marketDepthAllInst").get(marketDepthAllInst);

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

// test route for app
router.route("/user1").get((req, res) => {
  console.log("user");
  const data = "User data 22";
  res.json({ data });
});

router.route("/product1").get((req, res) => {
  console.log("product");
  const data = "Product data 28";
  res.json({ data });
});

module.exports = router;
