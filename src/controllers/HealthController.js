const { pool } = require('../infrastructure/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, serviceUnavailable } = require('../utils/apiResponse');

class HealthController {
  constructor(logger) {
    this.logger = logger;
  }

  liveness = asyncHandler(async (req, res) => {
    return success(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  readiness = asyncHandler(async (req, res) => {
    const checks = {
      server: 'ok',
      database: 'unknown',
      timestamp: new Date().toISOString()
    };

    try {
      const result = await pool.query('SELECT 1 as health_check');
      checks.database = result.rows?.[0]?.health_check === 1 ? 'ok' : 'degraded';
    } catch (error) {
      this.logger.error({ err: error }, 'Database health check failed');
      checks.database = 'error';
      return serviceUnavailable(res, 'Service temporarily unavailable', { checks });
    }

    const allHealthy = checks.server === 'ok' && checks.database === 'ok';

    if (!allHealthy) {
      return serviceUnavailable(res, 'Service not ready', { checks });
    }

    return success(res, checks);
  });

  metrics = asyncHandler(async (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metrics = {
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      },
      timestamp: new Date().toISOString()
    };

    return success(res, metrics);
  });
}

module.exports = HealthController;
