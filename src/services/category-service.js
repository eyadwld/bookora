import mongoose from "mongoose";
import Category from "../models/Category.js";
import Book from "../models/Book.js";
import { ApiError } from "../utils/ApiError.js";

export const createCategoryService = async ({ name, description }) => {
  const trimmed = name.trim();
  const existing = await Category.findOne({
    name: {
      $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    },
  }).lean();
  if (existing) {
    throw ApiError(409, "Category already exists");
  }
  const category = await Category.create({ name: trimmed, description });
  return category;
};

export const getCategoriesService = async () => {
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  return categories;
};

export const getCategoryService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid category id");
  }
  const category = await Category.findById(id).lean();
  if (!category) {
    throw ApiError(404, "Category not found");
  }
  return category;
};

export const updateCategoryService = async (id, { name, description }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid category id");
  }
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;

  const category = await Category.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  if (!category) {
    throw ApiError(404, "Category not found");
  }
  return category;
};

export const deleteCategoryService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid category id");
  }
  const booksUsing = await Book.countDocuments({ category: id });
  if (booksUsing > 0) {
    throw ApiError(
      400,
      `Cannot delete category: ${booksUsing} book(s) still use it`,
    );
  }
  const category = await Category.findByIdAndDelete(id).lean();
  if (!category) {
    throw ApiError(404, "Category not found");
  }
  return category;
};
