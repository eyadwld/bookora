import { body } from "express-validator";

export const addCartItemValidator = [
  body("bookId")
    .notEmpty()
    .withMessage("bookId is required")
    .isMongoId()
    .withMessage("Invalid book id"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const updateCartItemValidator = [
  body("bookId")
    .notEmpty()
    .withMessage("bookId is required")
    .isMongoId()
    .withMessage("Invalid book id"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const removeCartItemValidator = [
  body("bookId")
    .notEmpty()
    .withMessage("bookId is required")
    .isMongoId()
    .withMessage("Invalid book id"),
];
