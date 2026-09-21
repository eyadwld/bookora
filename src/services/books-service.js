import Book from "../models/Book.js";
import Category from "../models/Category.js";
import cloudinary from "../config/cloudianry.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const createBookService = async ({
  title,
  author,
  category,
  price,
  quantity,
  description,
  userId,
  file,
}) => {
  if (!file) {
    throw ApiError(400, "Image Cover is required");
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw ApiError(400, "Invalid category id");
  }

  const categoryExists = await Category.findById(category).lean();
  if (!categoryExists) {
    throw ApiError(404, "Category not found");
  }

  const result = await uploadToCloudinary({
    fileBuffer: file.buffer,
    folder: "bookora/books",
  });

  const book = await Book.create({
    title: title,
    author: author,
    category: category,
    price: price,
    quantity: quantity,
    description: description,
    stock: Number(quantity) > 0,
    coverImage: {
      url: result.secure_url,
      publicId: result.public_id,
    },
    creator: userId,
  });

  return book;
};

export const getBooksService = async ({
  search,
  category,
  minPrice,
  maxPrice,
  stock,
  cursor,
  limit,
}) => {
  const optimizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const andConditions = [];

  //-------Search-------//
  if (search) {
    andConditions.push({
      $or: [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          author: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    });
  }

  //----------Filtering-----------//

  //category
  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw ApiError(400, "Invalid Category");
    }
    andConditions.push({ category });
  }

  //price
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {};
    if (minPrice !== undefined && minPrice !== "") {
      priceFilter.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      priceFilter.$lte = Number(maxPrice);
    }
    andConditions.push({ price: priceFilter });
  }

  if (stock !== undefined && stock !== "") {
    const stockBool = stock === true || stock === "true";
    const stockFalse = stock === false || stock === "false";
    if (stockBool) andConditions.push({ stock: true });
    else if (stockFalse) andConditions.push({ stock: false });
  }

  //--------Cursor Pagination---------//
  if (cursor) {
    let decodedCusor;
    try {
      decodedCusor = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    } catch {
      throw ApiError(400, "Invalid cursor");
    }
    const cursorDate = new Date(decodedCusor.createdAt);
    const cursorId = new mongoose.Types.ObjectId(decodedCusor.id);

    andConditions.push({
      $or: [
        {
          createdAt: { $lt: cursorDate },
        },
        {
          createdAt: cursorDate,
          _id: {
            $lt: cursorId,
          },
        },
      ],
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  // Fetch limit + 1
  const books = await Book.find(filter)
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(optimizedLimit + 1)
    .select("-creator")
    .populate("category", "name")
    .lean();

  //Check next page
  const hasNextPage = books.length > optimizedLimit;
  if (hasNextPage) {
    books.pop();
  }

  //Check Cusor
  let nextCursor = null;

  if (hasNextPage) {
    const lastBook = books[books.length - 1];

    const cursorData = {
      createdAt: lastBook.createdAt,
      id: lastBook._id,
    };

    nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
  }

  return {
    books,
    nextCursor,
    hasNextPage,
  };
};

export const getSingleBookService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid book id");
  }
  const book = await Book.findById(id).populate("category", "name").lean();

  if (!book) {
    throw ApiError(404, "There No book with that id");
  }
  return book;
};

export const updateBookService = async ({ id, body, file }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid book id");
  }
  const book = await Book.findById(id);

  if (!book) {
    throw ApiError(404, "There is no book with that id");
  }

  const allowedFields = [
    "title",
    "author",
    "category",
    "price",
    "quantity",
    "description",
    "stock",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "category") {
        if (!mongoose.Types.ObjectId.isValid(body[field])) {
          throw ApiError(400, "Invalid category id");
        }
        const categoryExists = await Category.findById(body[field]).lean();
        if (!categoryExists) {
          throw ApiError(404, "Category not found");
        }
      }
      book[field] = body[field];
    }
  }

  // Keep stock in sync when quantity changes and stock not explicitly set
  if (body.quantity !== undefined && body.stock === undefined) {
    book.stock = Number(body.quantity) > 0;
  }

  if (file) {
    const result = await uploadToCloudinary({
      fileBuffer: file.buffer,
      folder: "bookora/books",
    });

    if (book.coverImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(book.coverImage.publicId);
      } catch (err) {
        console.error("Cloudinary cleanup skipped:", err.message);
      }
    }

    book.coverImage = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  return await book.save();
};

export const deleteBookService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError(400, "Invalid book id");
  }
  const book = await Book.findByIdAndDelete(id);

  if (!book) {
    throw ApiError(404, "There No book with that id");
  }

  if (book.coverImage?.publicId) {
    try {
      await cloudinary.uploader.destroy(book.coverImage.publicId);
    } catch (err) {
      console.error("Cloudinary cleanup skipped:", err.message);
    }
  }

  return book;
};
