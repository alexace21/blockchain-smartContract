// const jwt = require('jsonwebtoken');

// const { COOKIE_SESSION_NAME } = require('../constants');
// const { SECRET } = require('../config/environment');

// // Authenitcation if this user is Valid.
// exports.auth = async (req, res, next) => {
//     const token = req.cookies[COOKIE_SESSION_NAME];

//     if (token) {
//         jwt.verify(token, SECRET, ((err, decodedToken) => {
//             if (err) {
//                 res.clearCookie(COOKIE_SESSION_NAME);

//                 //return next(err);
//                 return res.status(401).json("Unauthorized!");
//             }

//             req.user = decodedToken;
//             res.locals.user = decodedToken;

//             next();
//         }));
//     } else {
//         next();
//     }
// };
// // Authorization of the user. // Route guard
// exports.isAuth = (req, res, next) => {
//     if (!req.user) {
//         return res.status(401).json("Unauthorized!");
//     }
//     next();
// };

// exports.isGuest = (req, res, next) => {
//     if (req.user) {
//         return res.redirect('/api/health');
//     }
//     next();
// };



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
};

module.exports = { protect };