import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Book from "../models/Book.js";
import { ApiError } from "../utils/ApiError.js";

const CART_POPULATE = {
  path: "items.bookId",
  select: "title author price quantity stock coverImage",
};

const getCart = (userId) =>
  Cart.findOne({ userId }).populate(CART_POPULATE).lean();

export const getCartService = async (userId) => {
  const cart = await getCart(userId);

  return (
    cart ?? {
      userId,
      items: [],
    }
  );
};

export const addCartService = async ({ userId, bookId, quantity = 1 }) => {
  if (!mongoose.isValidObjectId(bookId)) {
    throw ApiError(400, "Invalid book id");
  }

  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw ApiError(400, "Quantity must be at least 1");
  }

  const book = await Book.findById(bookId).select("quantity stock").lean();

  if (!book) {
    throw ApiError(404, "Book not found");
  }

  if (!book.stock || book.quantity < qty) {
    throw ApiError(400, "Insufficient stock");
  }

  // Make sure the cart exists.
  await Cart.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        items: [],
      },
    },
    { upsert: true },
  );

  // Try to increment an existing item.
  const updatedCart = await Cart.findOneAndUpdate(
    {
      userId,
      "items.bookId": bookId,
    },
    {
      $inc: {
        "items.$.quantity": qty,
      },
    },
    {
      returnDocument: "after",
    },
  )
    .populate(CART_POPULATE)
    .lean();

  if (updatedCart) {
    const item = updatedCart.items.find(
      (item) => item.bookId?._id?.toString() === bookId,
    );

    if (item.quantity > book.quantity) {
      // Don't allow cart quantity to exceed available stock.
      await Cart.updateOne(
        {
          userId,
          "items.bookId": bookId,
        },
        {
          $inc: {
            "items.$.quantity": -qty,
          },
        },
      );

      throw ApiError(400, "Insufficient stock");
    }

    return updatedCart;
  }

  // Item doesn't exist → add it.
  const cart = await Cart.findOneAndUpdate(
    {
      userId,
      "items.bookId": {
        $ne: bookId,
      },
    },
    {
      $push: {
        items: {
          bookId,
          quantity: qty,
        },
      },
    },
    {
      returnDocument: "after",
    },
  )
    .populate(CART_POPULATE)
    .lean();

  if (!cart) {
    throw ApiError(409, "Cart was updated concurrently, please try again");
  }

  return cart;
};

export const updateCartItemService = async ({ userId, bookId, quantity }) => {
  if (!mongoose.isValidObjectId(bookId)) {
    throw ApiError(400, "Invalid book id");
  }

  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw ApiError(400, "Quantity must be at least 1");
  }

  const book = await Book.findById(bookId).select("quantity stock").lean();

  if (!book) {
    throw ApiError(404, "Book not found");
  }

  if (!book.stock || qty > book.quantity) {
    throw ApiError(400, "Insufficient stock");
  }

  const cart = await Cart.findOneAndUpdate(
    {
      userId,
      "items.bookId": bookId,
    },
    {
      $set: {
        "items.$.quantity": qty,
      },
    },
    {
      returnDocument: "after",
    },
  )
    .populate(CART_POPULATE)
    .lean();

  if (!cart) {
    const cartExists = await Cart.exists({ userId });

    if (!cartExists) {
      throw ApiError(404, "Cart not found");
    }

    throw ApiError(404, "Item not found in cart");
  }

  return cart;
};

export const removeCartItemService = async ({ userId, bookId }) => {
  const cart = await Cart.findOneAndUpdate(
    {
      userId,
      "items.bookId": bookId,
    },
    {
      $pull: {
        items: {
          bookId,
        },
      },
    },
    {
      returnDocument: "after",
    },
  )
    .populate(CART_POPULATE)
    .lean();

  if (!cart) {
    const cartExists = await Cart.exists({ userId });

    if (!cartExists) {
      throw ApiError(404, "Cart not found");
    }

    throw ApiError(404, "Item not found in cart");
  }

  return cart;
};

export const clearCartService = async ({ userId }) => {
  const cart = await Cart.findOneAndUpdate(
    { userId },
    {
      $set: {
        items: [],
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!cart) {
    throw ApiError(404, "Cart not found");
  }

  return cart;
};
