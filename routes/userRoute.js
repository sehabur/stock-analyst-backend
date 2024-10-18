const express = require("express");

const router = express.Router();

const {
  signin,
  signup,
  getUserProfileById,
  updateUserProfile,
  updateFcmToken,
  sendNotification,
  addFavoriteItem,
  // getFavoritesByUserId,
  getAllPortfolioByUser,
  createNewPortfolio,
  getPortfolioDetailsById,
  deletePortfolio,
  createBuyRequest,
  createSellRequest,
  getPriceAlertsByUserId,
  createPriceAlerts,
  deletePriceAlerts,
  schedulePriceAlertNotification,
  scheduleNewsAlert,
  getNotificationByUserId,
  resetNewNotifications,
  verifyPhone,
  generateOtp,
  changePassword,
  resetPasswordLink,
  setNewPassword,
} = require("../controllers/userController");

const { checkLogin } = require("../middlewares/authMiddleware");

const {
  registerValidationMiddleware,
} = require("../middlewares/validationMiddlewares/registerValidationMiddleware");

// Portfolio //
router
  .route("/portfolio")
  .get(checkLogin, getAllPortfolioByUser)
  .post(checkLogin, createNewPortfolio);

router
  .route("/portfolio/:id")
  .get(checkLogin, getPortfolioDetailsById)
  .delete(checkLogin, deletePortfolio);

router.route("/trade/buy").patch(checkLogin, createBuyRequest);

router.route("/trade/sell").patch(checkLogin, createSellRequest);

router.patch("/favorite", checkLogin, addFavoriteItem);

// router.get("/favorite/:id", checkLogin, getFavoritesByUserId);

// Price alerts //
router.post("/priceAlerts", checkLogin, createPriceAlerts);

router.route("/priceAlerts/user/:id").get(checkLogin, getPriceAlertsByUserId);

router.delete("/priceAlerts/:id", checkLogin, deletePriceAlerts);

router.get("/schedulePriceAlertNotification", schedulePriceAlertNotification);

router.post("/scheduleNewsAlert", scheduleNewsAlert);

router.post("/signin", signin);

router.post("/signup", registerValidationMiddleware, signup);

router.post("/changePassword", checkLogin, changePassword);

router.post("/resetPasswordLink", resetPasswordLink);

router.post("/setNewPassword", setNewPassword);

router
  .route("/profile/:id")
  .get(getUserProfileById)
  .patch(checkLogin, updateUserProfile);

router.route("/profile/updateFcmToken/:id").patch(checkLogin, updateFcmToken);

router.route("/sendNotification/:id").post(checkLogin, sendNotification);

router.route("/notification/:id").get(checkLogin, getNotificationByUserId);

router.route("/notification/resetNew").patch(checkLogin, resetNewNotifications);

router.route("/verifyPhone").post(checkLogin, verifyPhone);

router.route("/generateOtp").get(checkLogin, generateOtp);

module.exports = router;
