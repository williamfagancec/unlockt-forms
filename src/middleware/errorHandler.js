class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'passwordHash', 'token'];

function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (SENSITIVE_FIELDS.includes(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redacted[key] = redactSensitiveData(obj[key]);
    } else {
      redacted[key] = obj[key];
    }
  }
  
  return redacted;
}

function errorHandler(logger) {
  return (err, req, res, next) => {
    const log = req.log || logger;
    
    err.statusCode = err.statusCode || 500;
    err.isOperational = err.isOperational !== undefined ? err.isOperational : false;

    if (err.statusCode >= 500) {
      log.error({
        err,
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        body: redactSensitiveData(req.body),
        userId: req.session?.adminUser?.id,
      }, 'Server error');
    } else {
      log.warn({
        error: err.message,
        statusCode: err.statusCode,
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
      }, 'Client error');
    }

    const errorMessage = (!err.isOperational && err.statusCode >= 500)
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred';

    const response = {
      success: false,
      error: errorMessage
    };

    if (err.errors && Array.isArray(err.errors)) {
      response.errors = err.errors.map(e => ({
        field: e.path || e.param,
        message: e.msg || e.message
      }));
    }

    if (!err.isOperational && err.statusCode >= 500 && req.correlationId) {
      response.correlationId = req.correlationId;
    }

    res.status(err.statusCode).json(response);
  };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.url,
  });
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
