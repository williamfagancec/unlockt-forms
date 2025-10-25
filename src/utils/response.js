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
  const total = Number(pagination.total) || 0;
  const limit = Number(pagination.limit) || 0;
  const page = Number(pagination.page) || 1;
  
  const totalPages = (Number.isFinite(limit) && limit > 0) 
    ? Math.ceil(total / limit) 
    : 0;
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
