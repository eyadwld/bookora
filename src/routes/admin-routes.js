import { Router } from "express";
import { getDashboardStats } from "../controllers/admin-controller.js";
import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";

const router = Router();

router.use(verifyToken, verifyAdmin);

router.get("/dashboard", getDashboardStats);

export default router;
