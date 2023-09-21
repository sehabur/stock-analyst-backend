const express = require('express');
const {
  latestPrice,
  sectorWiseLatestPrice,
  dailySectorPrice,
  stockDetails,
  topGainerLooser,
} = require('../controllers/priceController');

const router = express.Router();

router.route('/latestPrice').get(latestPrice);

router.route('/sectorWiseLatestPrice').get(sectorWiseLatestPrice);

router.route('/dailySectorPrice/:sectorTag').get(dailySectorPrice);

router.route('/stock/:code').get(stockDetails);

router.route('/topGainerLooser').get(topGainerLooser);

module.exports = router;
topGainerLooser;
