import { body, param, query } from "express-validator";

// ADDED: payment validators were missing (orderId never checked -> CastError 500s).
export const checkoutSessionValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isMongoId()
    .withMessage("Invalid order id"),
];

export const paymentSessionParamValidator = [
  param("sessionId").notEmpty().withMessage("sessionId is required"),
];

export const adminPaymentsQueryValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit 1-100"),
  query("status")
    .optional()
    .isIn([
      "pending",
      "paid",
      "failed",
      "expired",
      "refunded",
      "partially_refunded",
    ])
    .withMessage("Invalid status filter"),
];
