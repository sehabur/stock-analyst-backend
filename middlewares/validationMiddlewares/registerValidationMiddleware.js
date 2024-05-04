const { body } = require("express-validator");

const registerValidationMiddleware = [
  // body("name").notEmpty().withMessage("Please input Name"),
  // body("email").isEmail().withMessage("Invalid email"),
  body("phone")
    .isLength({ min: 11, max: 11 })
    .withMessage("Phone number must be of 11 numbers"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be atleast 6 characters"),
];

module.exports = {
  registerValidationMiddleware,
};
