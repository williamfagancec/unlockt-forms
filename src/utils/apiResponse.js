const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

const success = (res, data = null, message = null, statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const created = (res, data = null, message = 'Resource created successfully') => {
  return success(res, data, message, HTTP_STATUS.CREATED);
};

const error = (res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  const response = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

const validationError = (res, errors) => {
  const formattedErrors = Array.isArray(errors) 
    ? errors.map(err => ({
        field: err.path || err.param,
        message: err.msg || err.message
      }))
    : [{ message: errors }];

  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    error: 'Validation failed',
    errors: formattedErrors
  });
};

const notFound = (res, resource = 'Resource') => {
  return error(res, `${resource} not found`, HTTP_STATUS.NOT_FOUND);
};

const unauthorized = (res, message = 'Authentication required') => {
  return error(res, message, HTTP_STATUS.UNAUTHORIZED);
};

const forbidden = (res, message = 'Access forbidden') => {
  return error(res, message, HTTP_STATUS.FORBIDDEN);
};

const conflict = (res, message = 'Resource conflict') => {
  return error(res, message, HTTP_STATUS.CONFLICT);
};

const serviceUnavailable = (res, message = 'Service temporarily unavailable') => {
  return error(res, message, HTTP_STATUS.SERVICE_UNAVAILABLE);
};

module.exports = {
  HTTP_STATUS,
  success,
  created,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  serviceUnavailable
};
