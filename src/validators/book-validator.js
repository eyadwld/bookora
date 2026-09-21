import { body, param } from "express-validator";

export const createBookValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("author").trim().notEmpty().withMessage("Author is required"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category id"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be >= 0"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be >= 0"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];

export const updateBookValidator = [
  param("id").isMongoId().withMessage("Invalid book id"),
  body("category").optional().isMongoId().withMessage("Invalid category id"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be >= 0"),
  body("quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be >= 0"),
];

export const bookIdValidator = [
  param("id").isMongoId().withMessage("Invalid book id"),
];
