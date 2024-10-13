const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const url = require("url");

const User = require("../models/userModel");
const Portfolio = require("../models/portfolioModel");
const PortfolioItem = require("../models/portfolioItemModel");
const LatestPrice = require("../models/latestPriceModel");

const { sendMailToUser } = require("../helper/mailer");
const PriceAlert = require("../models/priceAlertModel");
const {
  sendNotificationToFcmToken,
  saveNotificationToDb,
} = require("../helper/fcm");
const Notification = require("../models/notificationModel");
const {
  addDaysToToday,
  generateSixDigitRandomNumber,
  sendOtpToUser,
  checkIsPremiumEligible,
} = require("../helper/users");

/*
  @api:       POST /api/users/signin/
  @desc:      user signin
  @access:    public
*/
const signin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({
      phone,
      isActive: true,
    });

    if (!user) {
      const error = createError(404, "User not found");
      return next(error);
    }
    // if (!user.isVerified) {
    //   const error = createError(401, "User verification pending");
    //   return next(error);
    // }

    const result = await bcrypt.compare(password, user.password);

    if (!result) {
      return next(createError(401, "Password incorrect"));
    }

    const newNotificationCount = await Notification.find({
      user: user._id,
      isNew: true,
    }).count();

    // user.loggedInDeviceCount = user.loggedInDeviceCount || 1 + 1;

    // await user.save();

    // await User.findByIdAndUpdate(
    //   { phone: phoneNumber },
    //   { $inc: { loggedInDeviceCount: 1 } }
    // );

    res.status(200).json({
      message: "Login attempt successful",
      user: {
        ...user._doc,
        newNotificationCount,
        password: null,
        token: generateToken(user._id),
        isLoggedIn: true,
        isPremiumEligible: checkIsPremiumEligible(
          user.isPremium,
          user.premiumExpireDate
        ),
      },
    });
  } catch (err) {
    next(createError(500, "Unknown Error"));
  }
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
        "Account already exists with this phone number. Please try with different number"
      );
      return next(error);
    }

    let newUser = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: encriptPassword(password),
      isActive: true,
      loggedInDeviceCount: 1,
    });

    res.status(201).json({
      message: "Account creation successful",
      user: {
        ...newUser._doc,
        password: null,
        token: generateToken(newUser._id),
        isLoggedIn: true,
        isPremiumEligible: false,
      },
    });
  } catch (err) {
    const error = createError(500, "Something went wrong. Please try again");
    next(error);
  }
};

const generateOtp = async (req, res, next) => {
  try {
    const { _id, phone } = req.user;
    const otp = generateSixDigitRandomNumber();

    const { status } = await sendOtpToUser(phone, otp);

    if (status == "success") {
      await User.findByIdAndUpdate(_id, {
        $set: { lastOtp: otp },
      });
      res.status(200).json({ message: "Otp sending success" });
    } else {
      res.status(400).json({ message: "Otp sending failed" });
    }
  } catch (error) {
    next(createError(500, "Error occured"));
  }
};

const verifyPhone = async (req, res, next) => {
  try {
    const { otp, type } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.lastOtp === Number(otp)) {
      if (type === "free_trial") {
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            isPremium: true,
            premiumExpireDate: addDaysToToday(1),
            isFreeTrialUsed: true,
            isVerified: true,
          },
        });
      } else {
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            isVerified: true,
          },
        });
      }
      res.status(200).json({ status: "success", message: "Otp matched" });
    } else {
      res.status(400).json({ status: "failed", message: "Otp does not match" });
    }
  } catch (error) {
    next(createError(500, "Something went wrong"));
  }
};

/*
  @api:       GET /api/users/profile/:id
  @desc:      get user profile of a specific user
  @access:    private
*/
const getUserProfileById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -__v");

    const newNotificationCount = await Notification.find({
      user: req.params.id,
      isNew: true,
    }).count();

    if (!user) {
      return next(createError(404, "User not found"));
    }

    res.status(200).json({
      ...user._doc,
      newNotificationCount,
      isLoggedIn: true,
      isPremiumEligible: checkIsPremiumEligible(
        user.isPremium,
        user.premiumExpireDate
      ),
    });
  } catch (err) {
    next(createError(500, "Error occured"));
  }
};

/*
  @api:       PATCH /api/users/notification/resetNew
  @desc:      get user profile of a specific user
  @access:    private
*/
const resetNewNotifications = async (req, res, next) => {
  try {
    const notif = await Notification.updateMany(
      {
        user: req.user.id,
        isNew: true,
      },
      { isNew: false }
    );
    res.status(200).json({
      status: "success",
      message: "Reset successful",
      notif,
    });
  } catch (error) {
    next(createError(500, "Error occured"));
  }
};

/*
  @api:       GET /api/users/notification/:id
  @desc:      get user profile of a specific user
  @access:    private
*/
const getNotificationByUserId = async (req, res, next) => {
  try {
    const notif = await Notification.find({ user: req.params.id }).sort({
      deliveryTime: -1,
    });

    res.status(200).json(notif);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

// /*
//   @api:       GET /api/users/favorite/:userId
//   @desc:      get user data of a profile
//   @access:    private
// */
// const getFavoritesByUserId = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.params.id).select(
//       "name phone email isPremium favorites"
//     );

//     if (user) {
//       res.status(200).json(user);
//     } else {
//       const error = createError(404, "User not found");
//       next(error);
//     }
//   } catch (err) {
//     const error = createError(500, "Error occured");
//     next(error);
//   }
// };

/*
  @api:       PATCH /api/users/favorite
  @desc:      Add Favorite Item
  @access:    private
*/
const addFavoriteItem = async (req, res, next) => {
  try {
    const { tradingCode, type, userId } = req.body;

    let message = null;
    if (type === "add") {
      const result = await User.findByIdAndUpdate(userId, {
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
      message = "Favorite items update successful";
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
    const userId = req.params.id;
    const { name, email } = req.body;

    if (userId === req.user.id) {
      const userUpdate = await User.findByIdAndUpdate(
        userId,
        {
          name,
          email,
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
  @api:       PATCH /api/users/profile/updateFcmToken/:id
  @desc:      update user profile
  @access:    private
*/
const updateFcmToken = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { fcmToken } = req.body;

    if (userId === req.user.id) {
      await User.findByIdAndUpdate(
        userId,
        {
          fcmToken,
        },
        { new: true }
      ).select("-password -__v");
      res.status(201).json({ message: "Fcm token update successful" });
    } else {
      const error = createError(400, "Fcm token update failed");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "Fcm token update failed");
    next(error);
  }
};

/*
  @api:       POST /api/users/sendNotification/:id
  @desc:      update user profile
  @access:    private
*/
const sendNotification = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const { title, body } = req.body;

    const { status, message } = await sendNotificationToFcmToken(
      userId,
      title,
      body
    );
    res.status(status).json({ message });
  } catch (err) {
    const error = createError(500, "Something went wrong");
    next(error);
  }
};

/*
  @api:       GET /api/users/portfolio?user={userId}
  @desc:      Get all portfolio
  @access:    private
*/
const getAllPortfolioByUser = async (req, res, next) => {
  // try {
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
        (item) => item.tradingCode === stock.tradingCode
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
  // } catch (err) {
  //   const error = createError(500, "Error occured");
  //   next(error);
  // }
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
const getPortfolioDetailsById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const portfolio = await Portfolio.findById(id).populate("items");

    const latestPrices = await LatestPrice.find();

    let totalPortfolioBuyPrice = 0;
    let totalPortfolioSellPrice = 0;

    const stockItems = portfolio.items.map((item) => {
      const sellPrice = latestPrices.find(
        (latestPrice) => latestPrice.tradingCode === item.tradingCode
      ).ltp;

      const sellValue = sellPrice * item.quantity;

      const unrealizedGain = Number((sellValue - item.totalPrice).toFixed(2));

      const unrealizedGainPercent = Number(
        ((unrealizedGain * 100) / item.totalPrice).toFixed(2)
      );

      totalPortfolioBuyPrice += item.totalPrice;
      totalPortfolioSellPrice += sellValue;

      return {
        tradingCode: item.tradingCode,
        quantity: item.quantity,
        buyPrice: item.price,
        totalBuyPrice: item.totalPrice,
        sellPrice: sellPrice,
        totalSellPrice: sellValue,
        unrealizedGain,
        unrealizedGainPercent,
      };
    });

    const totalUnrealizedGain = Number(
      (totalPortfolioSellPrice - totalPortfolioBuyPrice).toFixed(2)
    );
    const totalUnrealizedGainPercent = Number(
      ((totalUnrealizedGain * 100) / totalPortfolioBuyPrice).toFixed(2)
    );

    const finalData = {
      _id: portfolio._id,
      name: portfolio.name,
      commission: portfolio.commission,
      totalPortfolioBuyPrice,
      totalPortfolioSellPrice,
      totalUnrealizedGain,
      totalUnrealizedGainPercent,
      stocks: stockItems,
    };

    res.status(200).json(finalData);
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

    // for (itemId of portfolio.items) {
    //   await PortfolioItem.findByIdAndDelete(itemId);
    // }
    await PortfolioItem.deleteMany({ _id: { $in: portfolio.items } });

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
  try {
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
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
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

/*
  @api:       GET /api/users/priceAlerts/user/:id
  @desc:      get user profile of a specific user
  @access:    private
*/
const getPriceAlertsByUserId = async (req, res, next) => {
  try {
    const alerts = await PriceAlert.find({ user: req.params.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(alerts);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       GET /api/users/schedulePriceAlertNotification/
  @desc:      get user profile of a specific user
  @access:    private
*/
const schedulePriceAlertNotification = async (req, res, next) => {
  // try {
  const alerts = await PriceAlert.aggregate([
    {
      $match: {
        status: "live",
      },
    },
    {
      $lookup: {
        from: "latest_prices",
        localField: "tradingCode",
        foreignField: "tradingCode",
        as: "latest_price",
        pipeline: [
          {
            $match: {
              ltp: { $ne: 0 },
            },
          },
        ],
      },
    },
    { $unwind: "$latest_price" },
    {
      $project: {
        _id: 1,
        tradingCode: 1,
        targetPrice: "$price",
        type: 1,
        user: 1,
        currentPrice: "$latest_price.ltp",
      },
    },
  ]);

  for (let alert of alerts) {
    const { _id, currentPrice, targetPrice, type, tradingCode, user } = alert;

    if (
      (type == "above" && currentPrice >= targetPrice) ||
      (type == "below" && currentPrice <= targetPrice)
    ) {
      const title = tradingCode + " Price Alert";
      const body =
        "Latest trading price is now BDT " +
        currentPrice +
        " which is " +
        type +
        " your set value (BDT " +
        targetPrice +
        ")";

      const userInfo = await User.findById(user);

      if (!userInfo) continue;

      console.log(user, userInfo);

      const { fcmToken } = userInfo;

      if (!fcmToken) continue;

      const { status, message } = await sendNotificationToFcmToken(
        fcmToken,
        title,
        body
      );

      if (status == 200) {
        await saveNotificationToDb(
          user,
          title,
          body,
          fcmToken,
          tradingCode,
          message
        );
        await PriceAlert.findByIdAndUpdate(_id, {
          $set: { status: "executed" },
        });
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "All message delivered successfully",
  });
  // } catch (err) {
  //   const error = createError(500, "Error occured");
  //   next(error);
  // }
};

/*
  @api:       DELETE /api/users/priceAlerts/:id
  @desc:      Delete portfolio
  @access:    private
*/
const deletePriceAlerts = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    const alertItem = await PriceAlert.findByIdAndDelete(id);

    // await User.findByIdAndUpdate(userId, {
    //   $pull: { priceAlerts: id },
    // });

    res.status(200).json({
      Status: "success",
      Item: alertItem,
    });
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       POST /api/users/priceAlerts
  @desc:      buy request
  @access:    private
*/
const createPriceAlerts = async (req, res, next) => {
  try {
    let { tradingCode, type, price, details } = req.body;

    const newAlert = await PriceAlert.create({
      tradingCode,
      type,
      price: Number(price),
      details,
      status: "live",
      user: req.user.id,
    });

    // await User.findByIdAndUpdate(req.user.id, {
    //   $push: { priceAlerts: newAlert._id },
    // });

    res.status(200).json(newAlert);
  } catch (err) {
    const error = createError(500, "Error occured");
    next(error);
  }
};

/*
  @api:       POST /api/users/scheduleNewsAlert/
  @desc:      schedule News Alert and to user and save to DB
  @access:    private
*/
const scheduleNewsAlert = async (req, res, next) => {
  const { news } = req.body;

  const users = await User.find({
    $expr: { $gt: [{ $size: "$favorites" }, 0] },
  });

  const favItemMap = new Map();

  for (let user of users) {
    const { _id, fcmToken, favorites } = user;

    for (let favItem of favorites) {
      if (favItemMap.has(favItem)) {
        let currUserInfo = favItemMap.get(favItem);
        favItemMap.set(favItem, [...currUserInfo, { id: _id, fcmToken }]);
      } else {
        favItemMap.set(favItem, [{ id: _id, fcmToken }]);
      }
    }
  }

  for (let newsItem of news) {
    const { tradingCode, title, description } = newsItem;

    const userListToSend = favItemMap.get(newsItem.tradingCode);

    if (userListToSend && userListToSend.length > 0) {
      userListToSend.forEach(async (user) => {
        const { status, message } = await sendNotificationToFcmToken(
          user.fcmToken,
          title + " | News",
          description
        );

        // console.log(status, user.fcmToken, title, description);

        if (status == 200) {
          await saveNotificationToDb(
            user.id,
            title + " | News",
            description,
            user.fcmToken,
            tradingCode,
            message
          );
        }
      });
    }
  }

  res.status(200).json({ status: "success" });
};

/*
  @api:       POST /api/users/changePassword/
  @desc:      change Password
  @access:    private
*/
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (user) {
      result = await bcrypt.compare(oldPassword, user.password);

      if (result) {
        await user.updateOne({
          password: encriptPassword(newPassword),
        });

        res.status(201).json({
          message: "Password changed successful.",
        });
      } else {
        const error = createError(401, "Old Password does not match.");
        next(error);
      }
    } else {
      const error = createError(404, "User not found");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "Password change failed.");
    next(error);
  }
};

/*
  @api:       POST /api/users/resetPasswordLink/
  @desc:      Reset Password
  @access:    public
*/
const resetPasswordLink = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (user) {
      const resetToken = uuidv4();

      await User.findOneAndUpdate(user._id, {
        resetToken,
        resetTokenExpiry: addMinutes(new Date(), 15), // 15 min from now //
      });

      const verificationLink = `${process.env.FRONT_END_URL}/manage-password/set-new?user=${user._id}&resetToken=${resetToken}`;

      const mailBody = `<html><body><h2>Reset your password </h2><p>Click on the below link to reset your password</p><a href=${verificationLink} target="_blank">Reset Password</a><br/><br/><p>If you face any difficulties or need any assistance please contact us at <a href="mailto:kuetianshub@gmail.com">kuetianshub@gmail.com</a></p></body></html>`;

      const mailSendResponse = await sendMailToUser(
        user.email,
        mailBody,
        "Reset your password"
      );

      if (mailSendResponse.messageId) {
        res.status(200).json({
          message: "Password reset link sent successfully",
          mailTo: user.email,
        });
      } else {
        const error = createError(500, "Password reset link sent failed.");
        next(error);
      }
    } else {
      const error = createError(500, "User not found with this email");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "Password reset link sent failed.");
    next(error);
  }
};

/*
  @api:       POST /api/users/setNewPassword/
  @desc:      Set new Password
  @access:    public
*/
const setNewPassword = async (req, res, next) => {
  try {
    const { newPassword, userId, resetToken } = req.body;
    const user = await User.findById(userId);

    if (user) {
      if (
        user.resetToken === resetToken &&
        user.resetTokenExpiry > new Date()
      ) {
        await user.updateOne({
          password: encriptPassword(newPassword),
          resetToken: null,
          resetTokenExpiry: null,
        });

        res.status(201).json({
          message: "Password changed successfully",
        });
      } else {
        const error = createError(
          401,
          "Your password reset link is invalid or got expired."
        );
        next(error);
      }
    } else {
      const error = createError(500, "User not found.");
      next(error);
    }
  } catch (err) {
    const error = createError(500, "Password change failed.");
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

const addMinutes = (date, minutes) => {
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

// Exports //

module.exports = {
  signin,
  signup,
  getUserProfileById,
  updateUserProfile,
  sendNotification,
  resetNewNotifications,
  updateFcmToken,
  addFavoriteItem,
  // getFavoritesByUserId,
  getNotificationByUserId,
  changePassword,
  resetPasswordLink,
  setNewPassword,
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
  verifyPhone,
  generateOtp,
};
