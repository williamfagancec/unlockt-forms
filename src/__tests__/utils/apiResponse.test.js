const {
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
} = require('../../utils/apiResponse');

describe('apiResponse utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('success', () => {
    it('should return success response with data and message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';

      success(mockRes, data, message);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    it('should return success response without message', () => {
      const data = { id: 1 };

      success(mockRes, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      });
    });

    it('should return success response with null data', () => {
      success(mockRes, null, 'Success');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success'
      });
    });
  });

  describe('created', () => {
    it('should return 201 status with data', () => {
      const data = { id: 1, name: 'New Resource' };

      created(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created successfully',
        data
      });
    });

    it('should allow custom message', () => {
      created(mockRes, { id: 1 }, 'Custom create message');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Custom create message'
      }));
    });
  });

  describe('error', () => {
    it('should return error response with default 500 status', () => {
      const message = 'Something went wrong';

      error(mockRes, message);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message
      });
    });

    it('should return error response with custom status code', () => {
      error(mockRes, 'Bad input', 400);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };

      error(mockRes, 'Validation error', 400, details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details
      });
    });
  });

  describe('validationError', () => {
    it('should format validation errors from array', () => {
      const errors = [
        { path: 'email', msg: 'Invalid email' },
        { param: 'password', message: 'Too short' }
      ];

      validationError(mockRes, errors);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' }
        ]
      });
    });

    it('should handle single string error', () => {
      validationError(mockRes, 'Single error message');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: [{ message: 'Single error message' }]
      }));
    });
  });

  describe('notFound', () => {
    it('should return 404 with default message', () => {
      notFound(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });

    it('should accept custom resource name', () => {
      notFound(mockRes, 'User');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status', () => {
      unauthorized(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should accept custom message', () => {
      unauthorized(mockRes, 'Invalid token');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid token'
      }));
    });
  });

  describe('forbidden', () => {
    it('should return 403 status', () => {
      forbidden(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('conflict', () => {
    it('should return 409 status', () => {
      conflict(mockRes, 'Email already exists');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already exists'
      });
    });
  });

  describe('serviceUnavailable', () => {
    it('should return 503 status', () => {
      serviceUnavailable(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.SERVICE_UNAVAILABLE);
    });
  });
});