import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
}); // this code imports the Cloudinary SDK and configures it with the necessary credentials (cloud name, API key, and API secret) from environment variables. It then exports the configured Cloudinary instance for use in other parts of the application.

export default cloudinary;
