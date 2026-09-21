import express from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import serverRoutes from "./routes/server-routes.js";
import { ratelimiter } from "./middleware/rate-limiter.js";

// Correct kebab-case file below.
import { stripeWebhook } from "./controllers/payment-controller.js";

const app = express();

config();
// ADDED: security + observability best practices (were entirely missing)
app.use(helmet()); // secure headers
// app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // request logs
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(","),
    credentials: true,
  }),
);

// Stripe webhook MUST come before express.json()
// (Stripe signature verification requires raw body bytes; json parsing breaks it)
app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  stripeWebhook,
);

app.use(express.json({ limit: "1mb" })); // ADDED: body-size cap (DoS protection)
// FIX: old `cookieParser()` without secret made `signed: true` cookies unreadable
// (signedCookies always empty). Now passes secret so signed cookies verify; falls
// back gracefully when env missing (keeps refresh-token session flow working locally).
app.use(cookieParser(process.env.COOKIE_SECRET || "dev-cookie-secret"));

// Health check (ADDED: load balancers / uptime monitors need this)
app.get("/health", (req, res) =>
  res.status(200).json({ success: true, message: "OK" }),
);

// Rate limiter disabled automatically if Upstash env is missing (see middleware)
app.use(ratelimiter());

app.use("/api", serverRoutes);

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (status >= 500)
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  res.status(status).json({ success: false, message });
}

app.use(errorHandler);

export default app;
