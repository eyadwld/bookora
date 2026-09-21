import {
  createCategoryService,
  getCategoriesService,
  getCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/category-service.js";

export const createCategory = async (req, res) => {
  const category = await createCategoryService(req.body);
  res
    .status(201)
    .json({ message: "Category created successfully", data: category });
};

export const getCategories = async (_req, res) => {
  const categories = await getCategoriesService();
  res
    .status(200)
    .json({ message: "Categories fetched successfully", data: categories });
};

export const getCategory = async (req, res) => {
  const category = await getCategoryService(req.params.id);
  res
    .status(200)
    .json({ message: "Category fetched successfully", data: category });
};

export const updateCategory = async (req, res) => {
  const category = await updateCategoryService(req.params.id, req.body);
  res
    .status(200)
    .json({ message: "Category updated successfully", data: category });
};

export const deleteCategory = async (req, res) => {
  const category = await deleteCategoryService(req.params.id);
  res
    .status(200)
    .json({ message: "Category deleted successfully", data: category });
};
