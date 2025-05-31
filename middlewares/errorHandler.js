const { AppError } = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';
  let error = err.error || 'Internal Server Error';
  let details = err.details || {};

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    message = `Duplicate field value: ${Object.keys(err.keyValue).join(', ')}`;
    error = 'Conflict';
    details = err.keyValue;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400; // Bad Request
    message = 'Validation failed';
    error = 'Bad Request';
    details = Object.values(err.errors).map(el => ({ field: el.path, message: el.message }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again!';
    error = 'Unauthorized';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired! Please log in again.';
    error = 'Unauthorized';
  }

  // Send generic error for operational errors, full error in development
  if (!err.isOperational) {
    // Log the error for debugging, but don't send sensitive info to client
    console.error('UNCAUGHT ERROR 💥', err);
    statusCode = 500;
    message = 'Something very wrong happened!';
    error = 'Internal Server Error';
    details = {};
  }

  res.status(statusCode).json({
    error: error,
    message: message,
    details: details,
  });
};

module.exports = errorHandler;