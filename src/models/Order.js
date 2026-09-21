import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      country: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        trim: true,
      },
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "expired",
        "partially_refunded",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    inventoryRestored: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      index: true,
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({
  user: 1,
  createdAt: -1,
});

orderSchema.index({
  createdAt: -1,
  _id: -1,
});

orderSchema.index({
  status: 1,
  expiresAt: 1,
});

export default mongoose.model("Order", orderSchema);
