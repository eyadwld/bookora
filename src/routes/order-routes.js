import express from "express";

import {
  createOrder,
  getOrders,
  getSingleOrder,
  getAllOrders,
  getOrderById,
} from "../controllers/order-controller.js";

import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";
import validate from "../middleware/validation.js";
import {
  createOrderValidator,
  orderIdParamValidator,
  adminOrdersQueryValidator,
} from "../validators/order-validator.js";

const router = express.Router();

router.use(verifyToken);

// ======================================================
// Admin
// ======================================================

router.get(
  "/admin",
  verifyAdmin,
  validate(adminOrdersQueryValidator),
  getAllOrders,
);

router.get(
  "/admin/:orderId",
  verifyAdmin,
  validate(orderIdParamValidator),
  getOrderById,
);

// ======================================================
// Customer
// ======================================================

router.post("/", validate(createOrderValidator), createOrder);

router.get("/my-orders", getOrders);

router.get(
  "/my-orders/:orderId",
  validate(orderIdParamValidator),
  getSingleOrder,
);

export default router;
