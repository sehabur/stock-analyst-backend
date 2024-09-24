const express = require("express");

const {
  getStudyTemplate,
  saveStudyTemplate,
  removeStudyTemplate,
  getChart,
  saveChart,
  removeChart,
} = require("../controllers/tvchartController");

const router = express.Router();

const { checkLogin } = require("../middlewares/authMiddleware");

router
  .route("/template")
  .get(checkLogin, getStudyTemplate)
  .post(checkLogin, saveStudyTemplate)
  .delete(checkLogin, removeStudyTemplate);

router
  .route("/chart")
  .get(checkLogin, getChart)
  .post(checkLogin, saveChart)
  .delete(checkLogin, removeChart);

module.exports = router;
