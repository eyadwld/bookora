import {
  getCartService,
  addCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
} from "../services/cart-service.js";

export const getCart = async (req, res) => {
  const cart = await getCartService(req.userId);

  res.status(200).json({
    success: true,
    data: cart,
  });
};

export const addItem = async (req, res) => {
  const { bookId, quantity } = req.body;

  const cart = await addCartService({
    userId: req.userId,
    bookId,
    quantity,
  });

  res.status(200).json({
    success: true,
    data: cart,
  });
};

export const updateQuantity = async (req, res) => {
  const { bookId, quantity } = req.body;

  const cart = await updateCartItemService({
    userId: req.userId,
    bookId,
    quantity,
  });

  res.status(200).json({
    success: true,
    data: cart,
  });
};

export const removeItem = async (req, res) => {
  const { bookId } = req.body;

  const cart = await removeCartItemService({
    userId: req.userId,
    bookId,
  });

  res.status(200).json({
    success: true,
    data: cart,
  });
};

export const clearCart = async (req, res) => {
  const cart = await clearCartService({
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: cart,
  });
};
