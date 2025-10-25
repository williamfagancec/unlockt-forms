const {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  errorHandler,
  asyncHandler,
  notFoundHandler
} = require('../../middleware/errorHandler');

describe('errorHandler middleware', () => {
  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create ValidationError', () => {
      const errors = [{ field: 'email', message: 'Invalid' }];
      const error = new ValidationError('Validation failed', errors);

      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(errors);
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
    });
  });

  describe('errorHandler', () => {
    let mockReq, mockRes, mockNext, mockLogger;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        url: '/test',
        body: {},
        correlationId: 'test-correlation-id'
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockNext = jest.fn();

      mockLogger = {
        error: jest.fn(),
        warn: jest.fn()
      };
    });

    it('should handle operational errors with correct status', () => {
      const error = new AppError('Test error', 400);
      const handler = errorHandler(mockLogger);

      handler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error'
      });
    });

    it('should handle server errors and mask message', () => {
      const error = new Error('Internal error');
      error.statusCode = 500;
      const handler = errorHandler(mockLogger);

      handler(error, mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'An unexpected error occurred'
      });
    });

    it('should include validation errors array', () => {
      const errors = [{ field: 'email', message: 'Invalid' }];
      const error = new ValidationError('Validation failed', errors);
      const handler = errorHandler(mockLogger);

      handler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'email' })
        ])
      }));
    });

    it('should log warnings for client errors', () => {
      const error = new AppError('Client error', 400);
      const handler = errorHandler(mockLogger);

      handler(error, mockReq, mockRes, mockNext);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('asyncHandler', () => {
    it('should handle async function that resolves', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(asyncFn);

      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      await wrapped(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next middleware', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncFn);

      const mockNext = jest.fn();

      await wrapped({}, {}, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 response', () => {
      const mockReq = { url: '/not-found' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint not found',
        path: '/not-found'
      });
    });
  });
});