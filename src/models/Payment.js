import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundPendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      lowercase: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "expired",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },

    checkoutSessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    paymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    failureReason: {
      type: String,
      trim: true,
    },

    paidAt: Date,

    failedAt: Date,

    refundedAt: Date,
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({
  order: 1,
  status: 1,
  createdAt: -1,
});

paymentSchema.index(
  { order: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
  },
);

export default mongoose.model("Payment", paymentSchema);
