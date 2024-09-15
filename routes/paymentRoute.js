const express = require("express");

const router = express.Router();

const {
  paymentInit,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIpn,
  getPackages,
  getTrnxById,
} = require("../controllers/paymentController");

const { checkLogin } = require("../middlewares/authMiddleware");

router.route("/init").get(checkLogin, paymentInit);

router.route("/success").post(paymentSuccess);

router.route("/fail").post(paymentFail);

router.route("/cancel").post(paymentCancel);

router.route("/ipn").post(paymentIpn);

router.route("/packages").get(getPackages);

router.route("/getTrnxById").get(checkLogin, getTrnxById);

module.exports = router;
