class AppError extends Error {
  constructor(message, statusCode, error = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // For operational errors vs. programming errors
    this.error = error || this.message; // More specific error detail if available
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = {}) {
    super(message, 400, 'Bad Request');
    this.details = details; // For validation errors etc.
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = {}) {
    super(message, 401, 'Unauthorized');
    this.details = details;
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = {}) {
    super(message, 403, 'Forbidden');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found', details = {}) {
    super(message, 404, 'Not Found');
    this.details = details;
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = {}) {
    super(message, 409, 'Conflict');
    this.details = details;
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};