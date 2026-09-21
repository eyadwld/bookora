import { Router } from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  changePassword,
  getAllUsers,
  getUser,
  updateUserStatus,
  upadateUserRole,
} from "../controllers/user-controller.js";
import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";
import validate from "../middleware/validation.js";
import {
  updateMeValidator,
  deleteMeValidator,
  changePasswordValidator,
  userIdValidator,
  updateUserStatusValidator,
  updateUserRoleValidator,
} from "../validators/user-validator.js";

const router = Router();

// Authenticated user routes
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, validate(updateMeValidator), updateMe);
router.delete("/me", verifyToken, validate(deleteMeValidator), deleteMe);
router.patch(
  "/me/password",
  verifyToken,
  validate(changePasswordValidator),
  changePassword,
);

// Admin routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.get(
  "/:id",
  verifyToken,
  verifyAdmin,
  validate(userIdValidator),
  getUser,
);
router.patch(
  "/:id/status",
  verifyToken,
  verifyAdmin,
  validate(updateUserStatusValidator),
  updateUserStatus,
);
router.patch(
  "/:id/role",
  verifyToken,
  verifyAdmin,
  validate(updateUserRoleValidator),
  upadateUserRole,
);

export default router;
