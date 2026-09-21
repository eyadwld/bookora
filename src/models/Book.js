import { Schema, model } from "mongoose";

const bookSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      required: true,
    },
    coverImage: {
      url: {
        type: String,
        required: true,
      },

      publicId: {
        type: String,
        required: true,
      },
    },
    stock: {
      type: Boolean,
      default: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

bookSchema.index({
  createdAt: -1,
  _id: -1,
});

bookSchema.index({ category: 1, createdAt: -1 });
bookSchema.index({ price: 1, createdAt: -1 });
bookSchema.index({ title: "text", author: "text" });

export default model("Book", bookSchema);
