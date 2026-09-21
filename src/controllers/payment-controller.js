import { getStripe } from "../config/stripe.js";

import {
  createCheckoutSessionService,
  getPaymentStatusService,
  getPaymentByOrderService,
  getAdminPaymentsService,
  handleStripeWebhookService,
} from "../services/payment-service.js";

/*
|--------------------------------------------------------------------------
| Create Checkout Session
|--------------------------------------------------------------------------
*/

export const createCheckoutSession = async (req, res) => {
  const result = await createCheckoutSessionService({
    userId: req.userId,
    orderId: req.body.orderId,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

/*
|--------------------------------------------------------------------------
| Get Checkout Session Status
|--------------------------------------------------------------------------
*/

export const getPaymentStatus = async (req, res) => {
  const result = await getPaymentStatusService({
    userId: req.userId,
    sessionId: req.params.sessionId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

/*
|--------------------------------------------------------------------------
| Get Payment By Order
|--------------------------------------------------------------------------
*/

export const getPaymentByOrder = async (req, res) => {
  const result = await getPaymentByOrderService({
    userId: req.userId,
    orderId: req.params.orderId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

/*
|--------------------------------------------------------------------------
| Admin - List Payments
|--------------------------------------------------------------------------
*/

export const getAdminPayments = async (req, res) => {
  const result = await getAdminPaymentsService({
    cursor: req.query.cursor,
    limit: req.query.limit,
    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
*/

export const stripeWebhook = async (req, res) => {
  console.log("🔥 STRIPE WEBHOOK RECEIVED");

  const stripe = getStripe();

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: "Missing Stripe signature",
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    console.log("🔥 STRIPE EVENT:", {
      id: event.id,
      type: event.type,
    });
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error.message,
    );

    return res.status(400).json({
      success: false,
      message: "Invalid Stripe webhook signature",
    });
  }

  /*
   * Process event.
   */
  try {
    const result = await handleStripeWebhookService(event);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      received: false,
      message: "Webhook processing failed",
    });
  }
};
