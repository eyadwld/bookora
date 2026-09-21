import { body, param } from "express-validator";

export const updateMeValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Name must be 3-20 chars"),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone cannot be empty"),
  body("address.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty"),
  body("address.country")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Country cannot be empty"),
  body("email").not().exists().withMessage("Email cannot be updated"),
  body("role").not().exists().withMessage("Role cannot be updated here"),
];

export const deleteMeValidator = [
  body("password").optional().notEmpty().withMessage("Password is required"),
];

export const changePasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .trim()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 chars"),
];

export const userIdValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
];

export const updateUserStatusValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  body("isActive").isBoolean().withMessage("isActive must be a boolean"),
];

export const updateUserRoleValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  body("role").isIn(["admin", "user"]).withMessage("Invalid role specified"),
];
