import express from "express";

import {
  createCheckoutSession,
  getPaymentStatus,
  getPaymentByOrder,
  getAdminPayments,
  stripeWebhook,
} from "../controllers/payment-controller.js";

import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";

import validate from "../middleware/validation.js";

import {
  checkoutSessionValidator,
  paymentSessionParamValidator,
  adminPaymentsQueryValidator,
} from "../validators/payment-validator.js";

import { orderIdParamValidator } from "../validators/order-validator.js";

const router = express.Router();

router.post("/webhook", stripeWebhook);

router.use(verifyToken);

router.get(
  "/admin",
  verifyAdmin,
  validate(adminPaymentsQueryValidator),
  getAdminPayments,
);

router.post(
  "/checkout",
  validate(checkoutSessionValidator),
  createCheckoutSession,
);

router.get(
  "/session/:sessionId",
  validate(paymentSessionParamValidator),
  getPaymentStatus,
);

router.get(
  "/order/:orderId",
  validate(orderIdParamValidator),
  getPaymentByOrder,
);

export default router;
