const {
  createLogger,
  generateCorrelationId,
  addCorrelationId,
  createRequestLogger
} = require('../../utils/logger');

describe('logger utility', () => {
  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const config = { NODE_ENV: 'development' };
      const logger = createLogger(config);

      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
    });

    it('should create production logger without pretty transport', () => {
      const config = { NODE_ENV: 'production' };
      const logger = createLogger(config);

      expect(logger).toBeDefined();
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate a unique correlation ID', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(32);
    });
  });

  describe('addCorrelationId', () => {
    it('should add correlation ID to request', () => {
      const req = { headers: {} };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      addCorrelationId(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.correlationId);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      const existingId = 'existing-correlation-id';
      const req = { headers: { 'x-correlation-id': existingId } };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      addCorrelationId(req, res, next);

      expect(req.correlationId).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', existingId);
    });
  });

  describe('createRequestLogger', () => {
    it('should create request logging middleware', () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        })
      };

      const middleware = createRequestLogger(mockLogger);

      expect(middleware).toBeInstanceOf(Function);
    });

    it('should log request on finish', (done) => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        })
      };

      const middleware = createRequestLogger(mockLogger);
      
      const req = {
        method: 'GET',
        url: '/test',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
        correlationId: 'test-id'
      };

      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(() => {
              callback();
              expect(req.log.info).toHaveBeenCalled();
              done();
            }, 10);
          }
        })
      };

      middleware(req, res, () => {});
    });
  });
});