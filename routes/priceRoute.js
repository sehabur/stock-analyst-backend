const express = require("express");

const {
  getAllStocks,
  getStocksList,
  getIpoList,
  getMarketStatus,
  latestPrice,
  indexMover,
  // latestPricesBySearch,
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
  getIndexInfo,
  getSymbolTvchart,
  getBarsTvchart,
  marketDepth,
  marketDepthAllInst,
} = require("../controllers/priceController");

const router = express.Router();

router.route("/latestPrice").get(latestPrice);

router.route("/getIndexInfo").get(getIndexInfo);

router.route("/indexMover").get(indexMover);

router.route("/allStockBeta").get(allStockBeta);

router.route("/getStocksList").get(getStocksList);

router.route("/getAllStocks").get(getAllStocks);

router.route("/getMarketStatus").get(getMarketStatus);

router.route("/ipo").get(getIpoList);

// router.route("/latestPricesBySearch").get(latestPricesBySearch);

// sector //
router.route("/sectorGainValueSummary").get(sectorGainValueSummary);
router.route("/sectorLatestPrice").get(sectorLatestPrice);
router.route("/dailySectorPrice/:sectorTag").get(dailySectorPrice);

// for trading view library //
router.route("/getSymbolTvchart").get(getSymbolTvchart);
router.route("/getBarsTvchart").get(getBarsTvchart);

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

router.route("/marketDepth").get(marketDepth);

router.route("/marketDepthAllInst").get(marketDepthAllInst);

// Test functions //
router.route("/test").get((req, res) => {
  console.log("Test");
  const data = "Test data 101";
  res.json({ data });
});

module.exports = router;
