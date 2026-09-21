import User from "../models/User.js";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Category from "../models/Category.js";

export const getDashboardStatsService = async () => {
  const [
    users,
    books,
    orders,
    revenueAgg,
    ordersByStatus,
    lowStock,
    recentOrders,
    paymentsByStatus,
  ] = await Promise.all([
    User.countDocuments(),
    Book.countDocuments(),
    Order.countDocuments(),

    Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } },
      },
    ]),

    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    Book.find({ quantity: { $lte: 3 } })
      .select("title author quantity stock")
      .sort({ quantity: 1 })
      .limit(10)
      .lean(),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({ path: "user", select: "name email" })
      .select("totalPrice status createdAt user")
      .lean(),
    Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const categories = await Category.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: { $ne: false } });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const revenueTrend = await Payment.aggregate([
    { $match: { status: "paid", paidAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    overview: {
      users,
      activeUsers,
      books,
      categories,
      orders,
      paidPayments: revenueAgg[0]?.count || 0,
      revenue: revenueAgg[0]?.revenue || 0,
    },
    ordersByStatus: Object.fromEntries(
      ordersByStatus.map((s) => [s._id, s.count]),
    ),
    paymentsByStatus: Object.fromEntries(
      paymentsByStatus.map((s) => [s._id, s.count]),
    ),
    lowStock,
    recentOrders,
    revenueTrend,
  };
};
