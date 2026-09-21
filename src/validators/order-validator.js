import { body, param, query } from "express-validator";

// ADDED: order validators were entirely missing (shippingAddress/status never
// validated -> Mongoose CastErrors surfaced as 500s). Now fail fast with 400s.
export const createOrderValidator = [
  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),
  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required"),
  body("shippingAddress.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required"),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
];

export const orderIdParamValidator = [
  param("orderId").isMongoId().withMessage("Invalid order id"),
];

export const orderIdBodyValidator = [
  body("orderId").isMongoId().withMessage("Invalid order id"),
];

export const updateOrderStatusValidator = [
  param("orderId").optional().isMongoId().withMessage("Invalid order id"),
  body("orderId").optional().isMongoId().withMessage("Invalid order id"),
  body("status")
    .isIn([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "expired",
      "partially_refunded",
      "refunded",
    ])
    .withMessage("Invalid status"),
];

export const adminOrdersQueryValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit 1-100"),
  query("status")
    .optional()
    .isIn([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "expired",
      "partially_refunded",
      "refunded",
    ])
    .withMessage("Invalid status filter"),
  query("userId").optional().isMongoId().withMessage("Invalid userId filter"),
];
