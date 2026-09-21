import {
  createBookService,
  getSingleBookService,
  updateBookService,
  deleteBookService,
  getBooksService,
} from "../services/books-service.js";

export const createBook = async (req, res) => {
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
};

export const getBooks = async (req, res) => {
  const result = await getBooksService(req.query);
  res.status(200).json({ message: "Books feched successfully", data: result });
};

export const getSingleBook = async (req, res) => {
  const book = await getSingleBookService(req.params.id);
  res.status(200).json({ message: "Book Feched successfully", data: book });
};

export const updateBook = async (req, res) => {
  const book = await updateBookService({
    id: req.params.id,
    body: req.body,
    file: req.file,
  });
  res.status(200).json({ message: "Book Updated successfully", data: book });
};

export const deleteBook = async (req, res) => {
  const deletedBook = await deleteBookService(req.params.id);
  res
    .status(200)
    .json({ message: "Book Deleted successfully", data: deletedBook });
};
