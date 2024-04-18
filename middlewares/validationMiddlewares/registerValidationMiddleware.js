const { body } = require("express-validator");

const registerValidationMiddleware = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be atleast 6 characters"),
  body("name").notEmpty().withMessage("Please input Name"),
  body("phone").notEmpty().withMessage("Please input Phone number"),
];

module.exports = {
  registerValidationMiddleware,
};
