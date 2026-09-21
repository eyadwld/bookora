import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

import {
  createOtpSecret,
  generateOtpToken,
  verifyOtpToken,
} from "../utils/otp.js";

import { sendOtpEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";

const OTP_TTL = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/* =========================================================
   OTP HELPERS
========================================================= */

const issueOtp = async ({
  user,
  secretField,
  expiresField,
  attemptsField,
  sendEmail,
}) => {
  const secret = createOtpSecret();

  user[secretField] = secret;
  user[expiresField] = new Date(Date.now() + OTP_TTL);
  user[attemptsField] = 0;

  await user.save();

  const otp = generateOtpToken(secret, user.email);

  try {
    await sendEmail(user.email, otp);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`otp:dev ${user.email}: ${otp}`);
    }
  }
};

const issueEmailOtp = (user) =>
  issueOtp({
    user,
    secretField: "emailOtpSecret",
    expiresField: "emailOtpExpiresAt",
    attemptsField: "emailOtpAttempts",
    sendEmail: sendOtpEmail,
  });

const issuePasswordResetOtp = (user) =>
  issueOtp({
    user,
    secretField: "passwordResetOtpSecret",
    expiresField: "passwordResetOtpExpiresAt",
    attemptsField: "passwordResetOtpAttempts",
    sendEmail: sendPasswordResetEmail,
  });

/* =========================================================
   OTP VERIFICATION HELPER
========================================================= */

const verifyUserOtp = async ({
  user,
  otp,
  secretField,
  expiresField,
  attemptsField,
}) => {
  const secret = user[secretField];
  const expiresAt = user[expiresField];

  if (!secret || !expiresAt || expiresAt < new Date()) {
    throw ApiError(400, "Code expired, request a new one");
  }

  if ((user[attemptsField] || 0) >= MAX_OTP_ATTEMPTS) {
    throw ApiError(429, "Too many attempts, request a new code");
  }

  user[attemptsField] = (user[attemptsField] || 0) + 1;

  const valid = verifyOtpToken(secret, String(otp).trim(), user.email);

  if (!valid) {
    await user.save();

    throw ApiError(400, "Invalid code");
  }

  user[secretField] = undefined;
  user[expiresField] = undefined;
  user[attemptsField] = 0;

  await user.save();
};

/* =========================================================
   SIGNUP
========================================================= */

export const signupService = async ({
  name,
  email,
  password,
  phone,
  address,
}) => {
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail) {
    throw ApiError(400, "Email is required");
  }

  const exists = await User.exists({
    email: normalizedEmail,
  });

  if (exists) {
    throw ApiError(409, "User already exists");
  }

  try {
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: await bcrypt.hash(password, 12),
      address,
      authProvider: "local",
    });

    await issueEmailOtp(user);

    return user;
  } catch (error) {
    // Protect against concurrent signup requests.
    if (error.code === 11000) {
      throw ApiError(409, "User already exists");
    }

    throw error;
  }
};

/* =========================================================
   VERIFY EMAIL
========================================================= */

export const verifyOtpService = async ({ userId, otp }) => {
  if (!otp) {
    throw ApiError(400, "OTP is required");
  }

  if (!userId) {
    throw ApiError(400, "User ID is required");
  }

  const user = await User.findById(userId).select(
    "+emailOtpSecret +emailOtpExpiresAt +emailOtpAttempts",
  );

  if (!user) {
    throw ApiError(404, "Account not found");
  }

  if (user.emailVerified) {
    return user;
  }

  await verifyUserOtp({
    user,
    otp,
    secretField: "emailOtpSecret",
    expiresField: "emailOtpExpiresAt",
    attemptsField: "emailOtpAttempts",
  });

  user.emailVerified = true;

  await user.save();

  return user;
};

/* =========================================================
   RESEND EMAIL OTP
========================================================= */

export const resendOtpService = async ({ userId }) => {
  if (!userId) {
    throw ApiError(400, "User ID is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw ApiError(404, "Account not found");
  }

  if (user.authProvider && user.authProvider !== "local") {
    throw ApiError(400, "Google accounts don't need a code");
  }

  if (user.emailVerified) {
    return {
      alreadyVerified: true,
    };
  }

  await issueEmailOtp(user);

  return {
    ok: true,
  };
};

/* =========================================================
   LOGIN
========================================================= */

export const loginService = async ({ email, password }) => {
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    throw ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: normalizedEmail,
  })
    .select("+password +role +isActive")
    .lean();

  if (!user) {
    throw ApiError(401, "Invalid credentials");
  }

  if (user.authProvider && user.authProvider !== "local") {
    throw ApiError(
      401,
      "This account uses Google login. Please continue with Google.",
    );
  }

  if (user.isActive === false) {
    throw ApiError(
      403,
      "Your account is deactivated. Contact us for more details",
    );
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw ApiError(401, "Invalid credentials");
  }

  delete user.password;

  return user;
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export const forgotPasswordService = async (email) => {
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail) {
    throw ApiError(400, "Email is required");
  }

  const user = await User.findOne({
    email: normalizedEmail,
  });

  // Do not reveal whether account exists.
  if (!user || (user.authProvider && user.authProvider !== "local")) {
    return { ok: true, userId: null };
  }

  await issuePasswordResetOtp(user);

  return {
    ok: true,
    userId: user._id.toString(),
  };
};

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPasswordService = async ({
  userId,
  email,
  otp,
  newPassword,
}) => {
  if (!userId && !email) {
    throw ApiError(400, "User ID is required");
  }

  if (!otp) {
    throw ApiError(400, "OTP is required");
  }

  if (!newPassword || newPassword.length < 8) {
    throw ApiError(400, "Password must be at least 8 chars");
  }

  let user = null;

  if (userId) {
    user = await User.findById(userId).select(
      "+passwordResetOtpSecret +passwordResetOtpExpiresAt +passwordResetOtpAttempts +password",
    );
  } else {
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      throw ApiError(400, "User ID is required");
    }

    user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordResetOtpSecret +passwordResetOtpExpiresAt +passwordResetOtpAttempts +password",
    );
  }

  if (!user) {
    throw ApiError(404, "Account not found");
  }

  await verifyUserOtp({
    user,
    otp,
    secretField: "passwordResetOtpSecret",
    expiresField: "passwordResetOtpExpiresAt",
    attemptsField: "passwordResetOtpAttempts",
  });

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();

  await user.save();

  return {
    ok: true,
  };
};

export const updatePasswordService = resetPasswordService;
