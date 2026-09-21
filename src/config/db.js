import mongoose from "mongoose";

export const connectToDB = async () => {
  try {
    const url = process.env.MONGODB_URL;
    if (!url) {
      throw new Error("MONGODB_URL is not defined");
    }
    await mongoose.connect(url);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log("Failed to Connect to MongoDB", err);
    process.exit(1); // stop the server if the database is not connected exit the process if there is an error 1 menas exit with failure and 0 means exit with success
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.log("Failed to Disconnect from MongoDB", err);
    process.exit(1);
  }
};
