const url = require("url");
const createError = require("http-errors");
const SSLCommerzPayment = require("sslcommerz-lts");
const Package = require("../models/packagesModel");
const { ObjectId } = require("mongodb");
const User = require("../models/userModel");
const Payment = require("../models/paymentsModel");

const isLive = false; //true for live, false for sandbox

/*
  @api:       GET /api/payment/init/
  @desc:      payment init
  @access:    private
*/
const paymentInit = async (req, res) => {
  const { product } = url.parse(req.url, true).query;
  const { id, name, phone, email } = req.user;

  const productInfo = await Package.findOne({ product });

  const storeId = process.env.SSL_STORE_ID;
  const storePassword = process.env.SSL_STORE_PASS;
  const backend = process.env.BACKEND_URL;

  const data = {
    total_amount: productInfo.currentPrice,
    currency: "BDT",
    tran_id: new ObjectId().toString(),
    success_url: `${backend}/api/payment/success?product=${product}&user=${id}&validity=${productInfo.validityDays}`,
    fail_url: `${backend}/api/payment/fail`,
    cancel_url: `${backend}/api/payment/cancel`,
    ipn_url: `${backend}/api/payment/ipn`,
    shipping_method: "Online",
    product_name: productInfo.product,
    product_category: "Electronic",
    product_profile: "general",
    cus_name: name,
    cus_email: email,
    cus_add1: "Dhaka",
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1230",
    cus_country: "Bangladesh",
    cus_phone: phone,
    cus_fax: phone,
    ship_name: name,
    ship_add1: "Dhaka",
    ship_add2: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: 1230,
    ship_country: "Bangladesh",
  };
  // console.log(data);
  const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

  sslcz.init(data).then((apiResponse) => {
    let GatewayPageURL = apiResponse.GatewayPageURL;
    // res.redirect(GatewayPageURL);
    console.log("Redirecting to: ", GatewayPageURL);
    res.status(200).json({ url: GatewayPageURL });
  });
};

const paymentSuccess = async (req, res) => {
  try {
    const { product, user, validity } = url.parse(req.url, true).query;
    const { val_id: valId } = req.body;

    const storeId = process.env.SSL_STORE_ID;
    const storePassword = process.env.SSL_STORE_PASS;
    const data = {
      val_id: valId,
    };
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);
    const validCheckData = await sslcz.validate(data);

    console.log(validCheckData);

    const {
      status,
      tran_id,
      bank_tran_id,
      amount,
      store_amount,
      card_type,
      tran_date,
    } = validCheckData;

    if (status === "VALID") {
      await Payment.create({
        status,
        tranId: tran_id,
        valId,
        bankTranId: bank_tran_id,
        amount: amount,
        storeAmount: store_amount,
        cardType: card_type,
        tranDate: tran_date,
        product,
        user,
      });

      const premiumExpireDate = addDaysToToday(Number(validity));

      await User.findByIdAndUpdate(user, {
        $set: { isPremium: true, premiumExpireDate },
      });

      res.redirect(
        `${process.env.FRONTEND_URL}/payment-success?tranId=${tran_id}`
      );

      // res
      //   .status(200)
      //   .json({ message: "Payment successful", url: "/payment-success" });
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
    }
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
  }
};

const paymentFail = async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
};

const paymentCancel = async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-cancel`);
};

const paymentIpn = async (req, res) => {};

/*
  @api:       GET /api/payment/getTrnxById?id={trxid}
  @desc:      payment init
  @access:    private
*/
const getTrnxById = async (req, res) => {
  const { id } = url.parse(req.url, true).query;
  const data = {
    tran_id: id,
  };
  const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

  sslcz.transactionQueryByTransactionId(data).then((data) => {
    //process the response that got from sslcommerz
    //https://developer.sslcommerz.com/doc/v4/#by-session-id
  });
};

/*
  @api:       GET /api/payment/init/
  @desc:      payment init
  @access:    private
*/
const getPackages = async (req, res) => {
  try {
    const package = await Package.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json(package);
  } catch (err) {
    next(createError(500, "Somnething went wrong"));
  }
};

// helpers //

function addDaysToToday(days) {
  const today = new Date();
  const resultDate = new Date(today);
  resultDate.setDate(today.getDate() + days);
  resultDate.setUTCHours(17, 59, 0, 0); // 23:59 at GMT+6 corresponds to 17:59 UTC
  return resultDate;
}

module.exports = {
  paymentInit,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIpn,
  getPackages,
  getTrnxById,
};
