import { body, param } from "express-validator";

export const createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 chars"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 chars"),
];

export const updateCategoryValidator = [
  param("id").isMongoId().withMessage("Invalid category id"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 chars"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 chars"),
];

export const categoryIdValidator = [
  param("id").isMongoId().withMessage("Invalid category id"),
];
