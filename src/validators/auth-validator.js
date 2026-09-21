import { body } from "express-validator";

export const signupValidator = [
  body("name")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 chars"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .trim()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 chars"),
  body("passwordConfirm")
    .trim()
    .custom((v, { req }) => v === req.body.password)
    .withMessage("Passwords do not match"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.country").notEmpty().withMessage("Country is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
];

export const loginValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .trim()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 chars"),
];

const emailOrId = [
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("userId").optional().isMongoId().withMessage("Invalid user id"),
];

const otpField = (name = "otp") =>
  body(name)
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits");

export const verifyOtpValidator = [...emailOrId, otpField("otp")];
export const resendOtpValidator = [...emailOrId];
export const forgotPasswordValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
];
export const resetPasswordValidator = [
  ...emailOrId,
  otpField("otp"),
  body("newPassword")
    .trim()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 chars"),
];
