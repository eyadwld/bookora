import { Router } from "express";
import { param } from "express-validator";
import {
  signup,
  login,
  refresh,
  logout,
  logoutAll,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getSessions,
  revokeSession,
} from "../controllers/auth-controller.js";
import validate from "../middleware/validation.js";
import { verifyToken } from "../middleware/is-auth.js";
import {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
  resendOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/auth-validator.js";

const router = Router();

const sessionIdValidator = [
  param("id").isMongoId().withMessage("Invalid session id"),
];

router.post("/signup", validate(signupValidator), signup);
router.post("/verify-otp", validate(verifyOtpValidator), verifyOtp);
router.post("/resend-otp", validate(resendOtpValidator), resendOtp);
router.post("/login", validate(loginValidator), login);
router.post("/refresh", refresh);
router.post(
  "/forgot-password",
  validate(forgotPasswordValidator),
  forgotPassword,
);
router.post("/reset-password", validate(resetPasswordValidator), resetPassword);
router.post("/logout", logout);
router.post("/logout-all", verifyToken, logoutAll);
router.get("/sessions", verifyToken, getSessions);
router.delete(
  "/sessions/:id",
  verifyToken,
  validate(sessionIdValidator),
  revokeSession,
);

// Deprecated: old email-link flow removed in favor of OTP
router.post("/verify-email", (req, res) =>
  res
    .status(410)
    .json({
      success: false,
      message:
        "Email links removed — use POST /api/auth/verify-otp with your 6-digit code",
    }),
);

export default router;
