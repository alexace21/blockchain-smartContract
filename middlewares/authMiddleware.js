const { verifyToken } = require('../utils/jwtUtils');
const { UnauthorizedError, ForbiddenError } = require('../utils/appError');
const config = require('../config/environment');
const User = require('../models/User'); // Import User model

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('You are not logged in! Please log in to get access.'));
  }

  try {
      // 1. Verify token
  const decoded = verifyToken(token, config.jwt.secret);
  
  if (!decoded) {
    return next(new UnauthorizedError('Invalid token. Please log in again!'));
  }

  // 2. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new UnauthorizedError('The user belonging to this token no longer exists.')
    );
  }

  // Add user to request object
  req.user = currentUser;
  next();
} catch(err) {
      return next(new AppError('Invalid token. Please log in again!', 401));
}
};

module.exports = { protect };