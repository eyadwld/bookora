import { getDashboardStatsService } from "../services/admin-service.js";

export const getDashboardStats = async (_req, res) => {
  const stats = await getDashboardStatsService();
  res
    .status(200)
    .json({ success: true, message: "Dashboard stats fetched", data: stats });
};
