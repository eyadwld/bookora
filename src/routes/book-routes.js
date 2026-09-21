import { Router } from "express";
import {
  createBook,
  getBooks,
  getSingleBook,
  updateBook,
  deleteBook,
} from "../controllers/books-controller.js";
import upload from "../middleware/image-upload.js";
import { verifyToken, verifyAdmin } from "../middleware/is-auth.js";
import validate from "../middleware/validation.js";
import {
  createBookValidator,
  updateBookValidator,
  bookIdValidator,
} from "../validators/book-validator.js";

const router = Router();

router.get("/", getBooks);
router.get("/:id", validate(bookIdValidator), getSingleBook);

router.post(
  "/",
  verifyToken,
  verifyAdmin,
  upload.single("cover"),
  validate(createBookValidator),
  createBook,
);
router.patch(
  "/:id",
  verifyToken,
  verifyAdmin,
  upload.single("cover"),
  validate(updateBookValidator),
  updateBook,
);
router.delete(
  "/:id",
  verifyToken,
  verifyAdmin,
  validate(bookIdValidator),
  deleteBook,
);

export default router;
