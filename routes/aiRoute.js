const express = require("express");
const { getInsight } = require("../controllers/aiController");

const router = express.Router();

// const { checkLogin, checkPremium } = require("../middlewares/authMiddleware");

router.route("/getInsight").post(getInsight);

module.exports = router;
