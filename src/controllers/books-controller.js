import {
  createBookService,
  getSingleBookService,
  updateBookService,
  deleteBookService,
  getBooksService,
} from "../services/books-service.js";

export const createBook = async (req, res, next) => {
  try {
    const { title, author, category, price, quantity, description } = req.body;
    const book = await createBookService({
      title,
      author,
      category,
      price,
      quantity,
      description,
      userId: req.userId,
      file: req.file,
    });
    res.status(201).json({ message: "Book created successfully", data: book });
  } catch (error) {
    next(error);
  }
};

export const getBooks = async (req, res, next) => {
  try {
    const result = await getBooksService(req.query);
    res.status(200).json({ message: "Books feched successfully", data: result });
  } catch (error) {
    next(error);
  }
};

export const getSingleBook = async (req, res, next) => {
  try {
    const book = await getSingleBookService(req.params.id);
    res.status(200).json({ message: "Book Feched successfully", data: book });
  } catch (error) {
    next(error);
  }
};

export const updateBook = async (req, res, next) => {
  try {
    const book = await updateBookService({
      id: req.params.id,
      body: req.body,
      file: req.file,
    });
    res.status(200).json({ message: "Book Updated successfully", data: book });
  } catch (error) {
    next(error);
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    const deletedBook = await deleteBookService(req.params.id);
    res
      .status(200)
      .json({ message: "Book Deleted successfully", data: deletedBook });
  } catch (error) {
    next(error);
  }
};
