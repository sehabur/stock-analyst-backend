const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const url = require("url");
const User = require("../models/userModel");
const Portfolio = require("../models/portfolioModel");
const PortfolioItem = require("../models/portfolioItemModel");
const LatestPrice = require("../models/latestPriceModel");

/*
  @api:       POST /api/users/signin/
  @desc:      user signin
  @access:    public
*/
const signin = async (req, res, next) => {
  // try {
  const { phone: phoneNumber, password } = req.body;
  const user = await User.findOne({ phone: phoneNumber, isActive: true });

  if (!user) {
    const error = createError(404, "User not found");
    return next(error);
  }
  if (!user.isVerified) {
    const error = createError(401, "User verification pending");
    return next(error);
  }

  result = await bcrypt.compare(password, user.password);

  if (!result) {
    const error = createError(401, "Password does not match.");
    return next(error);
  }

  const { _id, name, email, phone, portfolio, favorites, isActive, createdAt } =
    user;

  res.status(200).json({
    message: "Login attempt successful",
    user: {
      _id,
      name,
      email,
      phone,
      portfolio,
      favorites,
      isActive,
      createdAt,
      token: generateToken(_id),
      isLoggedIn: true,
    },
  });
  // } catch (err) {
  //   const error = createError(500, "Login failed. Unknown Error");
  //   next(error);
  // }
};

/*
    @api:       POST /api/users/signup/
    @desc:      signup for new user
    @access:    public
  */
const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(errors);
    }

    const { name, email, phone, password } = req.body;

    const userExists = await User.findOne({ phone });

    if (userExists) {
      const error = createError(
        400,
        "Account already exists with this phone number"
      );
      return next(error);
    }

    const newUser = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: encriptPassword(password),
    });

    res.status(201).json({
      message: "Account creation successful",
      user: newUser,
    });
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       GET /api/users/profile/:id
  @desc:      get user profile of a specific user
  @access:    private
*/
const getUserProfileById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password -__v");

    if (user) {
      res.status(200).json({ user });
    } else {
      const error = createError(404, "User not found");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       PATCH /api/users/favorite
  @desc:      Add Favorite Item
  @access:    private
*/
const addFavoriteItem = async (req, res, next) => {
  try {
    const { tradingCode, type, userId } = req.body;

    let message;
    if (type === "add") {
      await User.findByIdAndUpdate(userId, {
        $push: { favorites: tradingCode },
      });
      message = "Item added to favorites";
    } else if (type === "remove") {
      await User.findByIdAndUpdate(userId, {
        $pull: { favorites: tradingCode },
      });
      message = "Item removed from favorites";
    } else if (type === "bulk_add") {
      await User.findByIdAndUpdate(userId, {
        favorites: tradingCode,
      });
      message = "Multiple item added to favorites";
    }
    res.status(200).json({ message });
  } catch (err) {
    const error = createError(500, "Something went wrong");
    next(error);
  }
};
/*
  @api:       PATCH /api/users/profile/:id
  @desc:      update user profile
  @access:    private
*/
const updateUserProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json(errors);
    }
    const userId = req.params.id;
    const {
      firstName,
      lastName,
      rollNo,
      batch,
      departmentLong,
      departmentShort,
      homeDistrict,
      presentDistrict,
      currentlyLiveIn,
      gender,
      bloodGroup,
      bloodDonationEnable,
      email,
      phoneNo,
      linkedinProfileUrl,
      facebookProfileUrl,
      status,
      currentJobTitle,
      currentOrganization,
      registrationNo,
      interests,
      expertin,
      profilePicture,
    } = req.body;

    let imageData;

    if (req.file) {
      imageData = await uploadSingleImage(req.file);
    } else if (profilePicture !== "null") {
      imageData = profilePicture;
    } else if (profilePicture === "null") {
      imageData = null;
    }

    if (userId === req.user.id) {
      const userUpdate = await User.findByIdAndUpdate(
        userId,
        {
          firstName,
          lastName,
          rollNo,
          batch,
          departmentLong,
          departmentShort,
          homeDistrict,
          presentDistrict,
          currentlyLiveIn,
          gender,
          bloodGroup,
          bloodDonationEnable,
          email,
          phoneNo,
          linkedinProfileUrl,
          facebookProfileUrl,
          status,
          currentJobTitle,
          currentOrganization,
          registrationNo,
          interests: interests?.split(",").map((item) => item.trim()),
          expertin: expertin?.split(",").map((item) => item.trim()),
          profilePicture: imageData,
        },
        { new: true }
      ).select("-password -__v");

      res
        .status(201)
        .json({ message: "User update successful", userUpdate: userUpdate });
    } else {
      const error = createError(400, "User update failed");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "User update failed");
    next(error);
  }
};

/*
  @api:       GET /api/users/portfolio?user={userId}
  @desc:      Get all portfolio
  @access:    private
*/
const getAllPortfolioByUser = async (req, res, next) => {
  try {
    const { user } = url.parse(req.url, true).query;
    const portfolio = await Portfolio.find({ user })
      .sort({ createdAt: -1 })
      .populate("items");

    const count = portfolio.length;

    const latestPrices = await LatestPrice.find();

    const result = [];
    for (let i = 0; i < count; i++) {
      let totalCost = 0;
      let totalSellValue = 0;

      portfolio[i].items.forEach((stock) => {
        totalCost += stock.totalPrice;

        const sellPrice = latestPrices.find(
          (item) => item.tradingCode === "GP"
        ).ltp;

        const sellValue = sellPrice * stock.quantity;
        totalSellValue += sellValue;
      });

      const unrealizedGain = Number((totalSellValue - totalCost).toFixed(2));
      const unrealizedGainPercent = Number(
        ((unrealizedGain * 100) / totalCost).toFixed(2)
      );

      result[i] = {
        ...portfolio[i]._doc,
        totalCost: Number(totalCost.toFixed(2)),
        totalSellValue: Number(totalSellValue.toFixed(2)),
        unrealizedGain,
        unrealizedGainPercent,
      };
    }

    res.status(200).json(result);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       POST /api/users/portfolio
  @desc:      Create portfolio
  @access:    private
*/
const createNewPortfolio = async (req, res, next) => {
  try {
    const { name, user, commission } = req.body;
    const portfolio = await Portfolio.create({
      name,
      user,
      commission,
      items: [],
      itemList: [],
    });
    res.status(201).json(portfolio);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       GET /api/users/portfolio/:id
  @desc:      Get portfolio by id
  @access:    private
*/
const getPortfolioById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const portfolio = await Portfolio.findById(id).populate("items");
    res.status(200).json(portfolio);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       DELETE /api/users/portfolio/:id
  @desc:      Delete portfolio
  @access:    private
*/
const deletePortfolio = async (req, res, next) => {
  try {
    const id = req.params.id;
    const portfolio = await Portfolio.findByIdAndDelete(id);
    res.status(200).json(portfolio);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       PATCH /api/users/trade/buy
  @desc:      buy request
  @access:    private
*/
const createBuyRequest = async (req, res, next) => {
  // try {
  let { tradingCode, quantity, price, commission, portfolioId } = req.body;

  price = Number(price);
  quantity = Number(quantity);
  commission = Number(commission);

  const portfolio = await Portfolio.findById(portfolioId).populate("items");

  const existingItem = portfolio.items.find(
    (item) => item.tradingCode === tradingCode
  );
  let newTradeItem;

  if (existingItem) {
    const newTotalPrice = quantity * price;
    const newTotalCommission = (newTotalPrice * commission) / 100;
    const finalNewTotalPrice = newTotalPrice + newTotalCommission;

    const updatedQuantity = Number(existingItem.quantity + quantity);
    const updatedToalPrice = Number(
      (existingItem.totalPrice + finalNewTotalPrice).toFixed(2)
    );
    const updatedPrice = Number(
      (updatedToalPrice / updatedQuantity).toFixed(2)
    );

    newTradeItem = await PortfolioItem.findByIdAndUpdate(
      existingItem._id,
      {
        quantity: updatedQuantity,
        price: updatedPrice,
        totalPrice: updatedToalPrice,
      },
      { new: true }
    );
  } else {
    const totalPrice = quantity * price;
    const totalCommission = (totalPrice * commission) / 100;
    const finalTotalPrice = Number((totalPrice + totalCommission).toFixed(2));

    newTradeItem = await PortfolioItem.create({
      tradingCode,
      quantity,
      price,
      totalPrice: finalTotalPrice,
      portfolioId: portfolioId,
    });

    await Portfolio.findByIdAndUpdate(portfolioId, {
      $push: { items: newTradeItem.id, itemList: tradingCode },
    });
  }

  res.status(200).json(newTradeItem);
  // } catch (err) {
  //   const error = createError(500, "Error occured");
  //   next(error);
  // }
};
/*
  @api:       PATCH /api/users/trade/sell
  @desc:      sell trade
  @access:    private
*/
const createSellRequest = async (req, res, next) => {
  try {
    const { tradingCode, quantity, price, commission, portfolioId } = req.body;

    const portfolioItem = await PortfolioItem.findOne({
      portfolioId,
      tradingCode,
      quantity: { $gte: Number(quantity) },
    });

    if (!portfolioItem) {
      const error = createError(404, "Trading code or quantity is not valid");
      return next(error);
    }

    const totalCommission = Number(
      ((quantity * price * commission) / 100).toFixed(2)
    );

    const updatedQuantity = Number(
      (portfolioItem.quantity - quantity).toFixed(2)
    );

    const updatedTotalPrice = Number(
      (portfolioItem.price * updatedQuantity - totalCommission).toFixed(2)
    );

    let newTradeItem;
    if (updatedQuantity === 0) {
      newTradeItem = await PortfolioItem.findByIdAndDelete(portfolioItem._id);
    } else {
      newTradeItem = await PortfolioItem.findByIdAndUpdate(
        portfolioItem._id,
        {
          quantity: updatedQuantity,
          totalPrice: updatedTotalPrice,
        },
        { new: true }
      );
    }

    res.status(200).json(newTradeItem);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

// Helper Functions //

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {});
};

const encriptPassword = (password) => {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
};

// Exports //

module.exports = {
  signin,
  signup,
  getUserProfileById,
  updateUserProfile,
  addFavoriteItem,
  //   changePassword,
  //   resetPasswordLink,
  //   setNewPassword,
  getAllPortfolioByUser,
  createNewPortfolio,
  getPortfolioById,
  deletePortfolio,
  createBuyRequest,
  createSellRequest,
};
