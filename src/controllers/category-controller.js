import {
  createCategoryService,
  getCategoriesService,
  getCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/category-service.js";

export const createCategory = async (req, res, next) => {
  try {
    const category = await createCategoryService(req.body);
    res
      .status(201)
      .json({ message: "Category created successfully", data: category });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req, res, next) => {
  try {
    const categories = await getCategoriesService();
    res
      .status(200)
      .json({ message: "Categories fetched successfully", data: categories });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const category = await getCategoryService(req.params.id);
    res
      .status(200)
      .json({ message: "Category fetched successfully", data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await updateCategoryService(req.params.id, req.body);
    res
      .status(200)
      .json({ message: "Category updated successfully", data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await deleteCategoryService(req.params.id);
    res
      .status(200)
      .json({ message: "Category deleted successfully", data: category });
  } catch (error) {
    next(error);
  }
};
