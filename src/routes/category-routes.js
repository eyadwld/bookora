import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category-controller.js";
import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";
import validate from "../middleware/validation.js";
import {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
} from "../validators/category-validator.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", validate(categoryIdValidator), getCategory);

router.post(
  "/",
  verifyToken,
  verifyAdmin,
  validate(createCategoryValidator),
  createCategory,
);
router.patch(
  "/:id",
  verifyToken,
  verifyAdmin,
  validate(updateCategoryValidator),
  updateCategory,
);
router.delete(
  "/:id",
  verifyToken,
  verifyAdmin,
  validate(categoryIdValidator),
  deleteCategory,
);

export default router;
