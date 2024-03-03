const express = require("express");
const router = express.Router();

const {
  insertEps,
  insertNav,
  insertNocfps,
  insertFinanceData,
  insertFloorPrice,
  changeSector,
  insertAbout,
} = require("../controllers/dataInsertController");

router.route("/changeSector").get(changeSector);
router.route("/eps").get(insertEps);
router.route("/nav").get(insertNav);
router.route("/nocfps").get(insertNocfps);
router.route("/financeData").get(insertFinanceData);
router.route("/floor").get(insertFloorPrice);
router.route("/about").get(insertAbout);

module.exports = router;
