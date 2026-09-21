import { runOrderExpirationJob } from "./orderExpiration.js";

export const startJobs = () => {
  setInterval(async () => {
    try {
      await runOrderExpirationJob();
    } catch (error) {
      console.error("Order expiration job failed:", error);
    }
  }, 30 * 1000);
};
