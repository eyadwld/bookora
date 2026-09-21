import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Hash of the CURRENT refresh token
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    // Hash of the previous refresh token
    // Used for refresh-token rotation grace period
    previousRefreshTokenHash: {
      type: String,
      default: null,
    },

    rotatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    deleteAt: {
      type: Date,
      required: true,
    },

    userAgent: {
      type: String,
      default: null,
    },

    ip: {
      type: String,
      default: null,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
