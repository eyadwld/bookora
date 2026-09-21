import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtpSecret: {
      type: String,
      select: false,
    },

    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    passwordResetOtpSecret: {
      type: String,
      select: false,
    },

    passwordResetOtpExpiresAt: {
      type: Date,
      select: false,
    },

    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    passwordChangedAt: {
      type: Date,
      select: false,
    },

    address: {
      country: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
