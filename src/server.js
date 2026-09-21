import { config } from "dotenv";
import app from "./app.js";
import { connectToDB } from "./config/db.js";
import { startJobs } from "./jobs/index.js";

config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectToDB();

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });

  startJobs();
};

startServer();
