import {
  createOrderService,
  getOrdersService,
  getSingleOrderService,
  getAllOrdersService,
  getOrderByIdService,
} from "../services/order-service.js";

// ======================================================
// Customer
// ======================================================

export const createOrder = async (req, res) => {
  const order = await createOrderService({
    userId: req.userId,

    shippingAddress: req.body.shippingAddress,

    idempotencyKey: req.get("Idempotency-Key"),
  });

  res.status(201).json({
    success: true,

    message: "Order created successfully",

    data: order,
  });
};

export const getOrders = async (req, res) => {
  const orders = await getOrdersService({
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: orders,
  });
};

export const getSingleOrder = async (req, res) => {
  const order = await getSingleOrderService({
    userId: req.userId,

    orderId: req.params.orderId,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
};

// ======================================================
// Admin
// ======================================================

export const getAllOrders = async (req, res) => {
  const result = await getAllOrdersService({
    cursor: req.query.cursor,

    limit: req.query.limit,

    status: req.query.status,

    userId: req.query.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getOrderById = async (req, res) => {
  const order = await getOrderByIdService(req.params.orderId);

  res.status(200).json({
    success: true,
    data: order,
  });
};
