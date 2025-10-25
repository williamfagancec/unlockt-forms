const pino = require('pino');
const crypto = require('crypto');

function createLogger(config) {
  const isDevelopment = config.NODE_ENV === 'development';
  
  const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      },
    }),
  });

  return logger;
}

function generateCorrelationId() {
  return crypto.randomBytes(16).toString('hex');
}

function addCorrelationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

function createRequestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    req.log = logger.child({
      correlationId: req.correlationId,
      requestId: req.correlationId,
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 500 ? 'error' : 
                      res.statusCode >= 400 ? 'warn' : 'info';
      
      req.log[logLevel]({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      }, 'HTTP Request');
    });

    next();
  };
}

module.exports = {
  createLogger,
  generateCorrelationId,
  addCorrelationId,
  createRequestLogger,
};
