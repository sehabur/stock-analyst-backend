const express = require('express');
const router = express.Router();

const {
  insertEps,
  insertNav,
  insertNocfps,
  insertFinanceData,
} = require('../controllers/dataInsertController');

router.route('/eps').get(insertEps);
router.route('/nav').get(insertNav);
router.route('/nocfps').get(insertNocfps);
router.route('/financeData').get(insertFinanceData);

module.exports = router;
