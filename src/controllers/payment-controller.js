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

export const createCheckoutSession = async (req, res, next) => {
  try {
    const result = await createCheckoutSessionService({
      userId: req.userId,
      orderId: req.body.orderId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Checkout Session Status
|--------------------------------------------------------------------------
*/

export const getPaymentStatus = async (req, res, next) => {
  try {
    const result = await getPaymentStatusService({
      userId: req.userId,
      sessionId: req.params.sessionId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Payment By Order
|--------------------------------------------------------------------------
*/

export const getPaymentByOrder = async (req, res, next) => {
  try {
    const result = await getPaymentByOrderService({
      userId: req.userId,
      orderId: req.params.orderId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Admin - List Payments
|--------------------------------------------------------------------------
*/

export const getAdminPayments = async (req, res, next) => {
  try {
    const result = await getAdminPaymentsService({
      cursor: req.query.cursor,
      limit: req.query.limit,
      status: req.query.status,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
*/

export const stripeWebhook = async (req, res, next) => {
  try {
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
    const result = await handleStripeWebhookService(event);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
