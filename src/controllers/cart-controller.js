import {
  getCartService,
  addCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
} from "../services/cart-service.js";

export const getCart = async (req, res, next) => {
  try {
    const cart = await getCartService(req.userId);

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const updateQuantity = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const { bookId } = req.body;

    const cart = await removeCartItemService({
      userId: req.userId,
      bookId,
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await clearCartService({
      userId: req.userId,
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
