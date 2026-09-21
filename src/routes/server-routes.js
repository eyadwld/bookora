import { Router } from "express";

import authRoutes from "./auth-routes.js";
import userRoutes from "./user-routes.js";
import bookRoutes from "./book-routes.js";
import categoryRoutes from "./category-routes.js";
import cartRoutes from "./cart-routes.js";
import paymentRoutes from "./payment-routes.js";
import orderRoutes from "./order-routes.js";
import adminRoutes from "./admin-routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/user", userRoutes);
router.use("/books", bookRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/payments", paymentRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);

export default router;
