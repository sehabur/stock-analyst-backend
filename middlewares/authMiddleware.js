const jwt = require("jsonwebtoken");

const createError = require("http-errors");

const User = require("../models/userModel");

const { checkIsPremiumEligible } = require("../helper/users");

const checkLogin = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded) {
        const user = await User.findById(decoded.id).select("-password -__v");
        if (user) {
          req.user = user;
          return next();
        } else {
          const error = createError(404, "User not found");
          return next(error);
        }
      } else {
        const error = createError(401, "Invalid Token");
        return next(error);
      }
    } else {
      const error = createError(401, "Invalid Token");
      return next(error);
    }
  } catch (err) {
    const error = createError(401, err.message);
    return next(error);
  }
};

const checkPremium = async (req, res, next) => {
  try {
    const { isPremium, premiumExpireDate } = req.user;

    const isPremiumEligible = checkIsPremiumEligible(
      isPremium,
      premiumExpireDate
    );

    if (isPremiumEligible) {
      return next();
    } else {
      return next(createError(401, "Access denied"));
    }
  } catch (err) {
    return next(createError(401, err.message));
  }
};

const checkAdmin = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.isAdmin) {
      return next();
    } else {
      const error = createError(401, "Access denied");
      return next(error);
    }
  } catch (err) {
    const error = createError(401, err.message);
    return next(error);
  }
};

module.exports = {
  checkLogin,
  checkPremium,
  checkAdmin,
};
