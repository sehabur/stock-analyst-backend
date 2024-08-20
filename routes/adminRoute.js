const express = require("express");
const {
  getDataScriptLogs,
  getDataScriptErrors,
  getSettings,
} = require("../controllers/adminController");

const router = express.Router();

const { checkLogin } = require("../middlewares/authMiddleware");

router
  .route("/check/66bb089882e8340979ccfdf9/script/log")
  .get(getDataScriptLogs);

router
  .route("/check/66bb089882e8340979ccfdf9/script/error")
  .get(getDataScriptErrors);

router
  .route("/check/66bb089882e8340979ccfdf9/script/settings")
  .get(getSettings);

module.exports = router;
