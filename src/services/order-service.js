import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import { ApiError } from "../utils/ApiError.js";
import { getStripe } from "../config/stripe.js";

// ======================================================
// Create Order
// ======================================================

export const createOrderService = async ({
  userId,
  shippingAddress,
  idempotencyKey,
}) => {
  if (
    !shippingAddress?.fullName ||
    !shippingAddress?.phone ||
    !shippingAddress?.country ||
    !shippingAddress?.city
  ) {
    throw ApiError(400, "Complete shipping address is required");
  }

  if (!idempotencyKey) {
    throw ApiError(400, "Idempotency-Key header is required");
  }

  if (idempotencyKey.length > 255) {
    throw ApiError(400, "Invalid Idempotency-Key");
  }

  // --------------------------------------------------
  // Return existing order for repeated request
  // --------------------------------------------------

  const existingOrder = await Order.findOne({
    user: userId,
    idempotencyKey,
  });

  if (existingOrder) {
    return existingOrder;
  }

  const session = await mongoose.startSession();

  let createdOrder = null;

  try {
    await session.withTransaction(async () => {
      // --------------------------------------------------
      // Re-check idempotency inside transaction
      // --------------------------------------------------

      const duplicateOrder = await Order.findOne({
        user: userId,
        idempotencyKey,
      }).session(session);

      if (duplicateOrder) {
        createdOrder = duplicateOrder;
        return;
      }

      // --------------------------------------------------
      // Cart
      // --------------------------------------------------

      const cart = await Cart.findOne({
        userId,
      }).session(session);

      if (!cart || !cart.items || cart.items.length === 0) {
        throw ApiError(400, "Cart is empty");
      }

      // --------------------------------------------------
      // Load all books
      // --------------------------------------------------

      const bookIds = cart.items.map((item) => item.bookId);

      const books = await Book.find({
        _id: {
          $in: bookIds,
        },
      })
        .select("_id title price quantity stock")
        .session(session);

      if (books.length !== cart.items.length) {
        throw ApiError(400, "One or more books are no longer available");
      }

      const bookMap = new Map(books.map((book) => [book._id.toString(), book]));

      // --------------------------------------------------
      // Validate + snapshot items
      // --------------------------------------------------

      const orderItems = [];

      for (const cartItem of cart.items) {
        const book = bookMap.get(cartItem.bookId.toString());

        if (!book) {
          throw ApiError(404, "Book not found");
        }

        if (book.stock === false) {
          throw ApiError(400, `"${book.title}" is no longer available`);
        }

        if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
          throw ApiError(400, "Invalid book quantity");
        }

        if (book.quantity < cartItem.quantity) {
          throw ApiError(409, `Insufficient stock for "${book.title}"`);
        }

        orderItems.push({
          book: book._id,
          name: book.title,
          price: book.price,
          quantity: cartItem.quantity,
        });
      }

      // --------------------------------------------------
      // Reserve inventory atomically
      // --------------------------------------------------

      for (const item of orderItems) {
        const result = await Book.updateOne(
          {
            _id: item.book,
            quantity: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              quantity: -item.quantity,
            },
          },
          {
            session,
          },
        );

        if (result.modifiedCount !== 1) {
          throw ApiError(
            409,
            `Stock changed while creating the order for "${item.name}"`,
          );
        }
      }

      // --------------------------------------------------
      // Calculate totals
      // --------------------------------------------------

      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const discount = 0;

      const shippingFee = 50;

      const totalPrice = subtotal - discount + shippingFee;

      // --------------------------------------------------
      // Expiration
      // --------------------------------------------------

      const expiresAt = new Date(
        Date.now() +
          (Number(process.env.ORDER_PAYMENT_EXPIRATION_MINUTES) || 30) *
            60 *
            1000,
      );

      // --------------------------------------------------
      // Create Order
      // --------------------------------------------------

      const order = new Order({
        user: userId,

        items: orderItems,

        subtotal,

        discount,

        shippingFee,

        totalPrice,

        shippingAddress,

        status: "pending",

        inventoryRestored: false,

        expiresAt,

        idempotencyKey,
      });

      createdOrder = await order.save({
        session,
      });

      // --------------------------------------------------
      // Clear cart
      // --------------------------------------------------

      await Cart.updateOne(
        {
          userId,
        },
        {
          $set: {
            items: [],
          },
        },
        {
          session,
        },
      );
    });

    return createdOrder;
  } catch (error) {
    // --------------------------------------------------
    // Unique idempotency race
    // --------------------------------------------------

    if (error?.code === 11000) {
      const duplicate = await Order.findOne({
        user: userId,
        idempotencyKey,
      });

      if (duplicate) {
        return duplicate;
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ======================================================
// Get My Orders
// ======================================================

export const getOrdersService = async ({ userId }) => {
  if (!userId) {
    throw ApiError(400, "userId is required");
  }

  return Order.find({
    user: userId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();
};

// ======================================================
// Get My Single Order
// ======================================================

export const getSingleOrderService = async ({ userId, orderId }) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw ApiError(400, "Invalid order id");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate({
      path: "items.book",
      select: "name coverImage",
    })
    .lean();

  if (!order) {
    throw ApiError(404, "Order not found");
  }

  return order;
};

// ======================================================
// Admin - Get All Orders
// ======================================================

const validOrderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
  "partially_refunded",
  "refunded",
];

export const getAllOrdersService = async ({
  cursor,
  limit,
  status,
  userId,
} = {}) => {
  const optimizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const conditions = [];

  if (status) {
    if (!validOrderStatuses.includes(status)) {
      throw ApiError(400, "Invalid status filter");
    }

    conditions.push({
      status,
    });
  }

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError(400, "Invalid userId filter");
    }

    conditions.push({
      user: userId,
    });
  }

  // --------------------------------------------------
  // Cursor
  // --------------------------------------------------

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

  const orders = await Order.find(filter)
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(optimizedLimit + 1)
    .populate({
      path: "user",
      select: "name email",
    })
    .lean();

  const hasNextPage = orders.length > optimizedLimit;

  if (hasNextPage) {
    orders.pop();
  }

  let nextCursor = null;

  if (hasNextPage) {
    const lastOrder = orders[orders.length - 1];

    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: lastOrder.createdAt,
        id: lastOrder._id,
      }),
    ).toString("base64");
  }

  return {
    orders,
    nextCursor,
    hasNextPage,
  };
};

// ======================================================
// Admin - Get Order
// ======================================================

export const getOrderByIdService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw ApiError(400, "Invalid order id");
  }

  const order = await Order.findById(orderId)
    .populate({
      path: "user",
      select: "name email phone",
    })
    .populate({
      path: "items.book",
      select: "name coverImage",
    })
    .lean();

  if (!order) {
    throw ApiError(404, "Order not found");
  }

  return order;
};

// ======================================================
// Expire Order
// ======================================================

export const expireOrderService = async (orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw ApiError(400, "Invalid order id");
  }

  const stripe = getStripe();

  const session = await mongoose.startSession();

  let shouldExpireStripeSession = false;

  try {
    // ==================================================
    // MongoDB Transaction
    // ==================================================

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,

        status: "pending",

        expiresAt: {
          $lte: new Date(),
        },
      }).session(session);

      // Order does not exist
      // or is no longer expired
      if (!order) {
        return;
      }

      // ==================================================
      // Check successful payment
      // ==================================================

      const successfulPayment = await Payment.findOne({
        order: order._id,

        status: {
          $in: ["paid", "partially_refunded", "refunded"],
        },
      }).session(session);

      // Never expire an order that was paid
      if (successfulPayment) {
        return;
      }

      // ==================================================
      // Restore Inventory
      // ==================================================

      if (!order.inventoryRestored) {
        for (const item of order.items) {
          await Book.updateOne(
            {
              _id: item.book,
            },
            {
              $inc: {
                quantity: item.quantity,
              },
            },
            {
              session,
            },
          );
        }

        order.inventoryRestored = true;
      }

      // ==================================================
      // Expire Order
      // ==================================================

      order.status = "expired";

      order.expiresAt = undefined;

      await order.save({
        session,
      });

      shouldExpireStripeSession = true;
    });

    // ==================================================
    // Stripe API MUST remain outside
    // MongoDB transaction.
    // ==================================================

    if (!shouldExpireStripeSession) {
      return;
    }

    const pendingPayment = await Payment.findOne({
      order: orderId,

      status: "pending",
    });

    if (!pendingPayment?.checkoutSessionId) {
      return;
    }

    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(
        pendingPayment.checkoutSessionId,
      );

      if (stripeSession.status === "open") {
        await stripe.checkout.sessions.expire(pendingPayment.checkoutSessionId);
      }
    } catch (error) {
      console.error("Failed to expire Stripe Checkout Session", {
        orderId,

        paymentId: pendingPayment._id,

        error: error.message,
      });
    }
  } finally {
    await session.endSession();
  }
};
