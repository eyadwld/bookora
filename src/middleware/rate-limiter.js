import ratelimit from "../config/upstash.js";
import { ApiError } from "../utils/ApiError.js";

export const ratelimiter = () => async (req, _res, next) => {
  try {
    if (req.originalUrl?.includes("/payments/webhook")) return next();
    if (!ratelimit) return next();

    const identifier = req.userId || req.ip;

    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return next(ApiError(429, "Too many requests, slow down"));
    }

    next();
  } catch (error) {
    if (error.statusCode === 429) return next(error);
    console.warn("Rate limiter skipped:", error.message);
    next();
  }
};
