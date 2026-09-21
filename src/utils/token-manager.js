import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { ApiError } from "./ApiError.js";

export const createToken = (id, email, role = "user") => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw ApiError(500, "Server misconfigured: JWT_SECRET missing");
  return jwt.sign({ id, email, role }, secret, { expiresIn: "7d" });
};

// Session-service helpers (same JWT secret, no logic change elsewhere)
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const REVOKED_SESSION_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export const createAccessToken = (userId, sessionId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw ApiError(500, "Server misconfigured: JWT_SECRET missing");
  return jwt.sign(
    { id: userId.toString(), sid: sessionId.toString() },
    secret,
    {
      expiresIn: "15m",
    },
  );
};

export const createRefreshToken = () => crypto.randomBytes(48).toString("hex");

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export default createToken;
