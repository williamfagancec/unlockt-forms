function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

function errorResponse(message, errors = null) {
  const response = {
    success: false,
    error: message,
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
}

function paginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
