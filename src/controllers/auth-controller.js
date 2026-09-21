import {
  signupService,
  loginService,
  verifyOtpService,
  resendOtpService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth-service.js";

import {
  createSessionService,
  refreshSessionService,
  revokeSessionByTokenService,
  revokeSessionService,
  revokeAllSessionsService,
  getSessionsService,
} from "../services/session-service.js";

import { REFRESH_TOKEN_TTL_MS } from "../utils/token-manager.js";

const REFRESH_COOKIE_PATH = "/api/auth";

/* =========================================================
   COOKIE HELPERS
========================================================= */

const setRefreshCookie = (res, refreshToken) => {
  if (!refreshToken) {
    return;
  }

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path: REFRESH_COOKIE_PATH,

    maxAge: REFRESH_TOKEN_TTL_MS,

    signed: true,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path: REFRESH_COOKIE_PATH,

    signed: true,
  });
};

const getRefreshToken = (req) => req.signedCookies?.refreshToken;

/* =========================================================
   SIGNUP
========================================================= */

export const signup = async (req, res) => {
  const user = await signupService(req.body);

  res.status(201).json({
    message: "User created successfully! Check your email for the OTP.",

    userId: user._id.toString(),

    emailVerified: user.emailVerified,
  });
};

/* =========================================================
   LOGIN
========================================================= */

export const login = async (req, res) => {
  const user = await loginService(req.body);

  if (!user.emailVerified) {
    await resendOtpService({
      userId: user._id,
    }).catch(() => { });

    return res.status(403).json({
      success: false,

      message:
        "Please verify your email before logging in. A new verification code has been sent.",

      emailVerified: false,

      userId: user._id.toString(),

      email: user.email,
    });
  }

  const result = await createSessionService({
    userId: user._id,

    userAgent: req.get("user-agent"),

    ip: req.ip,
  });

  setRefreshCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Login successful",

    userId: user._id.toString(),

    emailVerified: true,

    accessToken: result.accessToken,

    sessionId: result.session._id.toString(),
  });
};

/* =========================================================
   REFRESH
========================================================= */

export const refresh = async (req, res) => {
  const result = await refreshSessionService({
    refreshToken: getRefreshToken(req),

    userAgent: req.get("user-agent"),

    ip: req.ip,
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    message: "Token refreshed",

    accessToken: result.accessToken,

    sessionId: result.session._id.toString(),
  });
};

/* =========================================================
   LOGOUT
========================================================= */

export const logout = async (req, res) => {
  const refreshToken = getRefreshToken(req);

  if (refreshToken) {
    await revokeSessionByTokenService(refreshToken);
  } else if (req.sessionId) {
    await revokeSessionService({
      userId: req.userId,
      sessionId: req.sessionId,
    });
  }

  clearRefreshCookie(res);

  res.status(200).json({
    message: "Logout successful",
  });
};

/* =========================================================
   VERIFY OTP
========================================================= */

export const verifyOtp = async (req, res) => {
  const user = await verifyOtpService({
    userId: req.body.userId,

    otp: req.body.otp,
  });

  res.status(200).json({
    message: "Email verified successfully, you can login now",

    userId: user._id.toString(),

    emailVerified: true,
  });
};

/* Backward compatibility */
export const verifyEmail = verifyOtp;

/* =========================================================
   RESEND OTP
========================================================= */

export const resendOtp = async (req, res) => {
  const result = await resendOtpService({
    userId: req.body.userId,
  });

  if (result.alreadyVerified) {
    return res.status(200).json({
      message: "Email already verified",
    });
  }

  res.status(200).json({
    message: "OTP sent to your email",
  });
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export const forgotPassword = async (req, res) => {
  const result = await forgotPasswordService(req.body.email);

  res.status(200).json({
    message: "Check your email to reset your password.",

    userId: result.userId || null,
  });
};

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPassword = async (req, res) => {
  await resetPasswordService({
    userId: req.body.userId,

    email: req.body.email,

    otp: req.body.otp,

    newPassword: req.body.newPassword,
  });

  res.status(200).json({
    message: "Password updated successfully, you can login now",
  });
};

/* =========================================================
   LOGOUT ALL
========================================================= */

export const logoutAll = async (req, res) => {
  await revokeAllSessionsService(req.userId);

  clearRefreshCookie(res);

  res.status(200).json({
    message: "Logged out from all devices",
  });
};

/* =========================================================
   GET SESSIONS
========================================================= */

export const getSessions = async (req, res) => {
  const sessions = await getSessionsService(req.userId);

  const data = sessions.map((session) => ({
    ...session,

    _id: session._id.toString(),

    current: req.sessionId
      ? session._id.toString() === req.sessionId.toString()
      : false,
  }));

  res.status(200).json({
    message: "Active sessions fetched",

    data,
  });
};

/* =========================================================
   REVOKE SESSION
========================================================= */

export const revokeSession = async (req, res) => {
  await revokeSessionService({
    userId: req.userId,

    sessionId: req.params.id,
  });

  res.status(200).json({
    message: "Session revoked",
  });
};
