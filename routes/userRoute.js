const express = require("express");

const router = express.Router();

const {
  signin,
  signup,
  getUserProfileById,
  updateUserProfile,
  addFavoriteItem,
  getAllPortfolioByUser,
  createNewPortfolio,
  getPortfolioDetailsById,
  deletePortfolio,
  createBuyRequest,
  createSellRequest,
} = require("../controllers/userController");

const { checkLogin } = require("../middlewares/authMiddleware");

const {
  registerValidationMiddleware,
} = require("../middlewares/validationMiddlewares/registerValidationMiddleware");

router
  .route("/portfolio")
  .get(checkLogin, getAllPortfolioByUser)
  .post(checkLogin, createNewPortfolio);

router
  .route("/portfolio/:id")
  .get(getPortfolioDetailsById)
  .delete(checkLogin, deletePortfolio);

router.route("/trade/buy").patch(checkLogin, createBuyRequest);

router.route("/trade/sell").patch(checkLogin, createSellRequest);

router.patch("/favorite", checkLogin, addFavoriteItem);

router.post("/signin", signin);

router.post("/signup", registerValidationMiddleware, signup);

router
  .route("/profile/:id")
  .get(getUserProfileById)
  .patch(checkLogin, updateUserProfile);

module.exports = router;
