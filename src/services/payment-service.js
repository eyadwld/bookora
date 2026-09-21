import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import WebhookEvent from "../models/WebhookEvent.js";

import { ApiError } from "../utils/ApiError.js";
import { getStripe } from "../config/stripe.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getPaymentIntentId = (paymentIntent) => {
  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent.id || null;
};

/**
 * Check whether an order already has a successful payment.
 */
const hasSuccessfulPayment = async (orderId) => {
  return Payment.exists({
    order: orderId,

    status: {
      $in: ["paid", "partially_refunded", "refunded"],
    },
  });
};

/*
|--------------------------------------------------------------------------
| Create Checkout Session
|--------------------------------------------------------------------------
*/

export const createCheckoutSessionService = async ({ userId, orderId }) => {
  /*
   * Validate ObjectId
   */
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw ApiError(400, "Invalid order id");
  }

  const stripe = getStripe();

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  }).lean();

  if (!order) {
    throw ApiError(404, "Order not found");
  }

  /*
   * Order must still be payable.
   */
  if (order.status !== "pending") {
    throw ApiError(400, "This order is no longer payable");
  }

  /*
   * Check business expiration.
   */
  if (order.expiresAt && order.expiresAt <= new Date()) {
    throw ApiError(400, "Order has expired");
  }

  /*
   * Check if order was already paid.
   */
  const successfulPayment = await hasSuccessfulPayment(order._id);

  if (successfulPayment) {
    throw ApiError(400, "Order has already been paid");
  }

  /*
  |--------------------------------------------------------------------------
  | Existing pending Payment
  |--------------------------------------------------------------------------
  */

  let pendingPayment = await Payment.findOne({
    order: order._id,
    user: userId,
    status: "pending",
  });

  if (pendingPayment?.checkoutSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        pendingPayment.checkoutSessionId,
      );

      if (session.status === "open") {
        return {
          checkoutUrl: session.url,
          checkoutSessionId: session.id,
          paymentId: pendingPayment._id,
        };
      }

      await Payment.updateOne(
        {
          _id: pendingPayment._id,
          status: "pending",
        },
        {
          $set: {
            status: "expired",

            failureReason: "Stripe Checkout Session is no longer open",
          },
        },
      );

      pendingPayment = null;
    } catch (error) {
      console.error("❌ Failed to retrieve existing Stripe Checkout Session:", {
        checkoutSessionId: pendingPayment.checkoutSessionId,
        paymentId: pendingPayment._id.toString(),
        orderId: order._id.toString(),
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Create Payment attempt
  |--------------------------------------------------------------------------
  */

  let payment;

  try {
    payment = await Payment.create({
      order: order._id,
      user: userId,

      provider: "stripe",

      amount: order.totalPrice,

      currency: "usd",

      status: "pending",
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await Payment.findOne({
        order: order._id,
        user: userId,
        status: "pending",
      });

      if (existing?.checkoutSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            existing.checkoutSessionId,
          );

          if (session.status === "open") {
            return {
              checkoutUrl: session.url,
              checkoutSessionId: session.id,
              paymentId: existing._id,
            };
          }
        } catch {
          console.error(
            "❌ Failed to retrieve existing Stripe Checkout Session after duplicate payment:",
            {
              checkoutSessionId: existing.checkoutSessionId,
              paymentId: existing._id.toString(),
              orderId: order._id.toString(),
              error: error.message,
              stack: error.stack,
            },
          );
        }
      }
    }

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Create Stripe Checkout Session
  |--------------------------------------------------------------------------
  */

  try {
    const stripeSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",

        line_items: [
          ...order.items.map((item) => ({
            price_data: {
              currency: "usd",

              product_data: {
                name: item.name,
              },

              unit_amount: Math.round(item.price * 100),
            },

            quantity: item.quantity,
          })),

          ...(order.shippingFee > 0
            ? [
                {
                  price_data: {
                    currency: "usd",

                    product_data: {
                      name: "Shipping fee",
                    },

                    unit_amount: Math.round(order.shippingFee * 100),
                  },

                  quantity: 1,
                },
              ]
            : []),
        ],

        metadata: {
          orderId: order._id.toString(),

          paymentId: payment._id.toString(),

          userId: userId.toString(),
        },

        success_url:
          `${process.env.CLIENT_URL}` + `/payment/success?orderId=${order._id}`,

        cancel_url:
          `${process.env.CLIENT_URL}` + `/payment/cancel?orderId=${order._id}`,

        /*
         * Align with the Bookora order expiration window.
         * MUST stay well under Stripe's 24h maximum for
         * `expires_at` (exactly-24h gets rejected).
         */
        expires_at:
          Math.floor(Date.now() / 1000) +
          (Number(process.env.ORDER_PAYMENT_EXPIRATION_MINUTES) || 30) * 60,
      },

      {
        /*
         * Stripe API idempotency.
         * Retrying this exact operation
         * won't create duplicate sessions.
         */
        idempotencyKey: `payment-${payment._id}`,
      },
    );

    await Payment.updateOne(
      {
        _id: payment._id,
        status: "pending",
      },
      {
        $set: {
          checkoutSessionId: stripeSession.id,
        },
      },
    );

    return {
      checkoutUrl: stripeSession.url,

      checkoutSessionId: stripeSession.id,

      paymentId: payment._id,
    };
  } catch (error) {
    await Payment.updateOne(
      {
        _id: payment._id,
        status: "pending",
      },
      {
        $set: {
          status: "failed",

          failureReason:
            error?.message || "Unable to create Stripe Checkout Session",

          failedAt: new Date(),
        },
      },
    );

    throw ApiError(502, "Unable to create payment session");
  }
};

/*
|--------------------------------------------------------------------------
| Mark Payment As Paid
|--------------------------------------------------------------------------
*/

const markPaymentAsPaid = async ({ payment, stripeSession }) => {
  const paymentIntentId = getPaymentIntentId(stripeSession.payment_intent);

  if (!paymentIntentId) {
    throw ApiError(400, "PaymentIntent ID missing");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(payment.order).session(session);

      if (!order) {
        throw ApiError(404, "Order not found");
      }

      if (order.status !== "pending") {
        return;
      }

      const result = await Payment.updateOne(
        {
          _id: payment._id,

          status: {
            $in: ["pending", "failed"],
          },
        },

        {
          $set: {
            status: "paid",

            paymentIntentId,

            paidAt: new Date(),
          },

          $unset: {
            failureReason: 1,
          },
        },

        {
          session,
        },
      );

      if (result.modifiedCount !== 1) {
        return;
      }

      await Order.updateOne(
        {
          _id: order._id,

          status: "pending",
        },

        {
          $set: {
            status: "processing",
          },

          $unset: {
            expiresAt: 1,
          },
        },

        {
          session,
        },
      );
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| Checkout Session Completed
|--------------------------------------------------------------------------
*/

const handleCheckoutSessionCompleted = async (stripeSession) => {
  /*
   * Get our own metadata.
   */
  const paymentId = stripeSession.metadata?.paymentId;

  const orderId = stripeSession.metadata?.orderId;

  if (!paymentId || !orderId) {
    throw ApiError(400, "Missing payment metadata");
  }

  /*
   * Find payment.
   */
  const payment = await Payment.findOne({
    _id: paymentId,

    order: orderId,
  });

  if (!payment) {
    throw ApiError(404, "Payment not found");
  }

  /*
   * If already paid, nothing to do.
   * This gives us another layer of idempotency.
   */
  if (["paid", "partially_refunded", "refunded"].includes(payment.status)) {
    return;
  }

  // Stripe says whether payment was successful.

  if (!["paid", "no_payment_required"].includes(stripeSession.payment_status)) {
    return;
  }

  const expectedAmount = Math.round(payment.amount * 100);

  if (stripeSession.amount_total !== expectedAmount) {
    throw ApiError(400, "Payment amount mismatch");
  }

  /*
   * Verify currency.
   */
  if (stripeSession.currency !== payment.currency) {
    throw ApiError(400, "Payment currency mismatch");
  }

  /*
   * Mark as paid.
   */
  await markPaymentAsPaid({
    payment,
    stripeSession,
  });
};

/*
|--------------------------------------------------------------------------
| Payment Failed
|--------------------------------------------------------------------------
*/

const markPaymentAsFailed = async ({ paymentId, reason }) => {
  const result = await Payment.updateOne(
    {
      _id: paymentId,
      status: "pending",
    },

    {
      $set: {
        status: "failed",

        failureReason: reason || "Payment failed",

        failedAt: new Date(),
      },
    },
  );

  return result;
};

/*
|--------------------------------------------------------------------------
| Checkout Session Async Payment Failed
|--------------------------------------------------------------------------
*/

const handleCheckoutSessionAsyncFailed = async (stripeSession) => {
  const paymentId = stripeSession.metadata?.paymentId;

  if (!paymentId) {
    return;
  }

  await markPaymentAsFailed({
    paymentId,

    reason: "Stripe Checkout payment failed",
  });
};

/*
|--------------------------------------------------------------------------
| Checkout Session Expired
|--------------------------------------------------------------------------
*/

const handleCheckoutSessionExpired = async (stripeSession) => {
  const paymentId = stripeSession.metadata?.paymentId;

  if (!paymentId) {
    return;
  }

  await Payment.updateOne(
    {
      _id: paymentId,

      status: "pending",
    },

    {
      $set: {
        status: "expired",

        failureReason: "Stripe Checkout Session expired",
      },
    },
  );
};

/*
|--------------------------------------------------------------------------
| PaymentIntent Failed
|--------------------------------------------------------------------------
*/

const handlePaymentIntentFailed = async (paymentIntent) => {
  let payment = await Payment.findOne({
    paymentIntentId: paymentIntent.id,
  });

  if (!payment) {
    return;
  }

  await markPaymentAsFailed({
    paymentId: payment._id,

    reason: paymentIntent.last_payment_error?.message || "Payment failed",
  });
};

/*
|--------------------------------------------------------------------------
| Webhook Service
|--------------------------------------------------------------------------
*/

export const handleStripeWebhookService = async (event) => {
  /*
   * ---------------------------------------------------------
   * STEP 1
   * Idempotency
   * ---------------------------------------------------------
   */

  let webhookEvent;

  try {
    webhookEvent = await WebhookEvent.create({
      provider: "stripe",

      eventId: event.id,

      type: event.type,

      processed: false,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    webhookEvent = await WebhookEvent.findOne({
      provider: "stripe",

      eventId: event.id,
    });

    if (!webhookEvent) {
      throw error;
    }

    if (webhookEvent.processed) {
      return {
        received: true,

        duplicate: true,
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * STEP 2
   * Process Event
   * ---------------------------------------------------------
   */

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case "checkout.session.expired":
      await handleCheckoutSessionExpired(event.data.object);
      break;

    case "checkout.session.async_payment_failed":
      await handleCheckoutSessionAsyncFailed(event.data.object);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object);
      break;

    default:
      console.log("Unhandled Stripe event:", event.type);
      break;
  }

  /*
   * ---------------------------------------------------------
   * STEP 3
   * Mark Webhook as processed
   * ---------------------------------------------------------
   */

  await WebhookEvent.updateOne(
    {
      provider: "stripe",

      eventId: event.id,
    },

    {
      $set: {
        processed: true,

        processedAt: new Date(),
      },
    },
  );

  return {
    received: true,
  };
};

export const getPaymentByOrderService = async ({ userId, orderId }) => {
  // 1. Validate orderId
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw ApiError(400, "Invalid order ID");
  }

  // 2. Make sure the order belongs to the authenticated user
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  }).select("_id");

  if (!order) {
    throw ApiError(404, "Order not found");
  }

  // 3. Get all payment attempts for this order
  const payments = await Payment.find({
    order: orderId,
    user: userId,
  })
    .sort({ createdAt: -1 })
    .select(
      "_id order amount currency status checkoutSessionId paymentIntentId failureReason paidAt failedAt refundedAt createdAt",
    );

  return payments;
};

export const getPaymentStatusService = async ({ userId, sessionId }) => {
  const stripe = getStripe();

  // 1. Find the payment and make sure it belongs to this user
  const payment = await Payment.findOne({
    checkoutSessionId: sessionId,
    user: userId,
  });

  if (!payment) {
    throw ApiError(404, "Payment not found");
  }

  // 2. Get the current Stripe Checkout Session
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

  // 3. Return status information
  return {
    paymentId: payment._id,
    orderId: payment.order,

    // Our database = business source of truth
    paymentStatus: payment.status,

    // Stripe's current status
    stripePaymentStatus: stripeSession.payment_status,
    checkoutSessionStatus: stripeSession.status,
  };
};

/*
|--------------------------------------------------------------------------
| Admin - List Payments (cursor paginated)
|--------------------------------------------------------------------------
*/

const validPaymentStatuses = [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
  "partially_refunded",
];

export const getAdminPaymentsService = async ({
  cursor,
  limit,
  status,
} = {}) => {
  const optimizedLimit = Math.min(Math.max(Number(limit) || 15, 1), 100);

  const conditions = [];

  if (status) {
    if (!validPaymentStatuses.includes(status)) {
      throw ApiError(400, "Invalid status filter");
    }

    conditions.push({
      status,
    });
  }

  if (cursor) {
    let decodedCursor;

    try {
      decodedCursor = JSON.parse(
        Buffer.from(cursor, "base64").toString("utf8"),
      );
    } catch {
      throw ApiError(400, "Invalid cursor");
    }

    if (
      !decodedCursor.createdAt ||
      !decodedCursor.id ||
      !mongoose.isValidObjectId(decodedCursor.id)
    ) {
      throw ApiError(400, "Invalid cursor");
    }

    const cursorDate = new Date(decodedCursor.createdAt);

    if (Number.isNaN(cursorDate.getTime())) {
      throw ApiError(400, "Invalid cursor");
    }

    const cursorId = new mongoose.Types.ObjectId(decodedCursor.id);

    conditions.push({
      $or: [
        {
          createdAt: {
            $lt: cursorDate,
          },
        },
        {
          createdAt: cursorDate,
          _id: {
            $lt: cursorId,
          },
        },
      ],
    });
  }

  const filter = conditions.length
    ? {
        $and: conditions,
      }
    : {};

  const payments = await Payment.find(filter)
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(optimizedLimit + 1)
    .populate({
      path: "user",
      select: "name email",
    })
    .populate({
      path: "order",
      select: "_id",
    })
    .lean();

  const hasNextPage = payments.length > optimizedLimit;

  if (hasNextPage) {
    payments.pop();
  }

  let nextCursor = null;

  if (hasNextPage) {
    const lastPayment = payments[payments.length - 1];

    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: lastPayment.createdAt,
        id: lastPayment._id,
      }),
    ).toString("base64");
  }

  return {
    payments,
    nextCursor,
    hasNextPage,
  };
};
