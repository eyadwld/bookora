import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyToken = async (req, _res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token =
      req.signedCookies?.token ||
      req.signedCookies?.accessToken ||
      req.cookies?.token ||
      req.cookies?.accessToken ||
      bearer;
    if (!token)
      throw ApiError(401, "Authentication required (token not found)");

    if (!process.env.JWT_SECRET)
      throw ApiError(500, "Server misconfigured: JWT_SECRET missing");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw ApiError(
        401,
        err.name === "TokenExpiredError"
          ? "Session expired, please login again"
          : "Invalid token",
      );
    }

    const user = await User.findById(decoded.id).select(
      "+isActive +role +passwordChangedAt",
    );
    if (!user) throw ApiError(404, "User not found");
    if (!user.isActive)
      throw ApiError(
        403,
        "Your account is deactivated. Contact us for more details",
      );

    if (user.passwordChangedAt && decoded.iat) {
      const changedSec = Math.floor(
        new Date(user.passwordChangedAt).getTime() / 1000,
      );
      if (decoded.iat < changedSec)
        throw ApiError(401, "Password changed recently, please login again");
    }

    req.userId = user._id;
    req.role = user.role;
    req.userEmail = user.email;
    req.sessionId = decoded.sid || null;
    next();
  } catch (error) {
    next(error);
  }
};

export const verifyAdmin = (req, _res, next) => {
  if (!req.userId) return next(ApiError(401, "Unauthorized"));
  if (req.role !== "admin")
    return next(ApiError(403, "Access forbidden: Admin only"));
  next();
};
