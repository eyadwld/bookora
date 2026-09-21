import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";

export const getMeService = async (id) => {
  const user = await User.findById(id).select("+role").lean();

  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }
  return user;
};

export const updateMeService = async (id, body) => {
  const allowedFields = ["name", "phone", "address"];

  const updates = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!updatedUser) {
    throw ApiError(404, "There is no user with that id");
  }

  return updatedUser;
};

export const deleteMeService = async (id, { password }) => {
  const user = await User.findById(id).select("+password +authProvider").lean();

  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }

  if (user.password) {
    if (!password) {
      throw ApiError(400, "Password is required");
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw ApiError(401, "Wrong password");
    }
  }

  const deletedUser = await User.findByIdAndDelete(id);

  if (!deletedUser) {
    throw ApiError(404, "User not found");
  }

  return deletedUser;
};

export const changePasswordService = async (
  id,
  { oldPassword, newPassword },
) => {
  if (!oldPassword || !newPassword) {
    throw ApiError(400, "Old password and new password are required");
  }
  if (newPassword.length < 8) {
    throw ApiError(400, "New password must be at least 8 chars");
  }
  const user = await User.findById(id).select("+password +authProvider");

  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }

  if (!user.password) {
    throw ApiError(
      400,
      "This account uses Google login and has no password to change",
    );
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    throw ApiError(401, "Wrong password");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  user.password = hashedPassword;
  user.passwordChangedAt = new Date();

  return await user.save();
};

//ADMIN
export const getAllUsersService = async ({ search, limit } = {}) => {
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).trim(), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const max = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const users = await User.find(filter)
    .select("name email phone address createdAt")
    .select("+isActive +role")
    .sort({ createdAt: -1 })
    .limit(max)
    .lean();

  return users;
};

export const getUserService = async (id) => {
  const user = await User.findById(id).select("+isActive +role").lean();

  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }

  return user;
};

export const updateUserStatusService = async (id, { isActive }) => {
  if (typeof isActive !== "boolean") {
    throw ApiError(400, "isActive must be a boolean");
  }

  const user = await User.findByIdAndUpdate(
    id,
    {
      isActive,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).select("+isActive");
  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }
  return user;
};

export const upadateUserRoleService = async (id, { role }) => {
  if (!["admin", "user"].includes(role)) {
    throw ApiError(400, "Invalid role specified");
  }

  const user = await User.findByIdAndUpdate(
    id,
    {
      role: role,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).select("+role");

  if (!user) {
    throw ApiError(404, "There is no user with that id");
  }
  return user;
};
