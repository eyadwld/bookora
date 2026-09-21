import Stripe from "stripe";
import { config } from "dotenv";
import { ApiError } from "../utils/ApiError.js";

config();

const stripeSecret = process.env.STRIPE_SECRET_KEY;

// ADDED: export a null-safe client. Webhook verification + checkout creation
// throw a clear 503 if keys are missing instead of TypeError: Cannot read properties.
let stripe = null;
if (stripeSecret) {
  stripe = new Stripe(stripeSecret);
} else {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY missing — payment routes will return 503",
  );
}

export const getStripe = () => {
  if (!stripe) {
    throw ApiError(503, "Payment service unavailable (Stripe not configured)");
  }
  return stripe;
};

export default stripe;
