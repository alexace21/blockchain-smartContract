const authService = require('../services/authService');
const { NotFoundError } = require('../utils/appError');

const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware
    if (!req.user) {
      return next(new NotFoundError('User not found.'));
    }
    // `toJSON` method on User model handles removing password
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const updatedUser = await authService.updateUserProfile(req.user.id, updateData);

    res.status(200).json({
      id: updatedUser._id,
      email: updatedUser.email,
      username: updatedUser.username,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changeUserPassword(req.user.id, currentPassword, newPassword);
    res.status(204).send(); // No Content
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
};