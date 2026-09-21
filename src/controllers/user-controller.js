import {
  getMeService,
  updateMeService,
  deleteMeService,
  getAllUsersService,
  getUserService,
  updateUserStatusService,
  upadateUserRoleService,
  changePasswordService,
} from "../services/user-service.js";

export const getMe = async (req, res, next) => {
  try {
    const user = await getMeService(req.userId);
    res.status(200).json({
      message: "User data fetched successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified !== false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await updateMeService(req.userId, req.body);
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    next(error);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    const deletedUser = await deleteMeService(req.userId, req.body);
    res
      .status(200)
      .json({ message: "Account is deleted successfully ", user: deletedUser });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const user = await changePasswordService(req.userId, req.body);
    res.status(200).json({
      message: "Password updated",
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersService(req.query);
    res
      .status(200)
      .json({ success: true, message: "All Users Fetched", data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await getUserService(req.params.id);
    res.status(200).json({ message: "User Data Feched successfully", user });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await updateUserStatusService(req.params.id, req.body);
    res.status(200).json({
      message: "User status updated successfully",
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const upadateUserRole = async (req, res, next) => {
  try {
    const user = await upadateUserRoleService(req.params.id, req.body);
    res.status(200).json({
      message: `User role updated to ${user.role}`,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
