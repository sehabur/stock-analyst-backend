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
  getPortfolioById,
  deletePortfolio,
  createBuyRequest,
  createSellRequest,
} = require("../controllers/userController");

const { checkLogin } = require("../middlewares/authMiddleware");

const {
  registerValidationMiddleware,
} = require("../middlewares/validationMiddlewares/registerValidationMiddleware");

router.route("/portfolio").get(getAllPortfolioByUser).post(createNewPortfolio);

router.route("/portfolio/:id").get(getPortfolioById).delete(deletePortfolio);

router.route("/trade/buy").patch(createBuyRequest);

router.route("/trade/sell").patch(createSellRequest);

router.patch("/favorite", addFavoriteItem);

router.post("/signin", signin);

router.post("/signup", registerValidationMiddleware, signup);

router
  .route("/profile/:id")
  .get(checkLogin, getUserProfileById)
  .patch(checkLogin, updateUserProfile);

module.exports = router;
