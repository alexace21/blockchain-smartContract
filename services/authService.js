// const User = require('../models/User');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { SECRET } = require('../config/environment');

// exports.create = async (userData) => User.create(userData);

// exports.login = async (email, password) => {
//     const user = await User.findOne({ email });

//     if (!user) {
//         throw { message: 'Cannot find email or password!' };
//     }

//     const doesExist = await bcrypt.compare(password, user.password);

//     if (!doesExist) {
//         throw { message: 'Cannot find email or password!' };
//     }

//     return user;
// };

// exports.generateToken = (user) => {
//     const payload = { _id: user._id, username: user.username, email: user.email, };
//     const options = { expiresIn: '2d' };

//     const promiseResult = new Promise((resolve, reject) => {
//         jwt.sign(payload, SECRET, options, (err, decodedToken) => {
//             if (err) {
//                 return reject(err);
//             }

//             resolve(decodedToken);
//         });
//     });
//     return promiseResult;
// };


const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAuthTokens } = require('../utils/jwtUtils');
const { comparePassword } = require('../utils/passwordUtils');
const { UnauthorizedError, ConflictError, BadRequestError } = require('../utils/appError');
const config = require('../config/environment');

const registerUser = async (email, password, username) => {
  const user = await User.create({ email, password, username });
  return user;
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password'); // Select password for comparison
  if (!user || !(await comparePassword(password, user.password))) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const { accessToken, refreshToken, expiresIn } = generateAuthTokens(user._id);

  // Store refresh token
  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + require('ms')(config.jwt.refreshExpiration)),
  });

  return { user, accessToken, refreshToken, expiresIn };
};

const refreshAccessToken = async (refreshToken) => {
  // Verify the refresh token using the refresh secret
  const decoded = require('jsonwebtoken').verify(refreshToken, config.jwt.refreshSecret);

  if (!decoded || !decoded.id) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Find and validate the refresh token in the database
  const storedRefreshToken = await RefreshToken.findOne({
    userId: decoded.id,
    token: refreshToken,
  });

  if (!storedRefreshToken) {
    throw new UnauthorizedError('Invalid or expired refresh token. Please login again.');
  }

  // Invalidate the old refresh token (optional, but good practice for security)
  await RefreshToken.deleteOne({ _id: storedRefreshToken._id });

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new UnauthorizedError('User not found for this refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken, expiresIn } = generateAuthTokens(user._id);

  // Store the new refresh token
  await RefreshToken.create({
    userId: user._id,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + require('ms')(config.jwt.refreshExpiration)),
  });

  return { accessToken, expiresIn, newRefreshToken };
};

const logoutUser = async (userId, refreshToken) => {
  // Invalidate the refresh token in the database
  await RefreshToken.deleteOne({ userId, token: refreshToken });
};

const updateUserProfile = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
  if (!user) {
    throw new BadRequestError('User not found');
  }
  return user;
};

const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new BadRequestError('User not found');
  }

  if (!(await comparePassword(currentPassword, user.password))) {
    throw new UnauthorizedError('Current password incorrect');
  }

  user.password = newPassword; // Pre-save hook will hash it
  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  updateUserProfile,
  changeUserPassword,
};