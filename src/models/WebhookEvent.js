import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
      required: true,
    },

    eventId: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    processed: {
      type: Boolean,
      default: false,
    },

    processedAt: Date,
  },
  {
    timestamps: true,
  },
);

webhookEventSchema.index(
  {
    provider: 1,
    eventId: 1,
  },
  {
    unique: true,
  },
);

export default mongoose.model("WebhookEvent", webhookEventSchema);
