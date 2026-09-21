import Order from "../models/Order.js";

import { expireOrderService } from "../services/order-service.js";

export const runOrderExpirationJob = async () => {
  const expiredOrders = await Order.find({
    status: "pending",

    expiresAt: {
      $lte: new Date(),
    },
  })
    .select("_id")
    .limit(50);

  for (const order of expiredOrders) {
    try {
      await expireOrderService(order._id);
    } catch (error) {
      console.error(`Failed to expire order ${order._id}`, error);
    }
  }
};
