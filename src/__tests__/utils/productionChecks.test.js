const path = require('path');

describe('utils/productionChecks', () => {
  let prodChecks;
  let mockGetConfig;
  let logger;

  const loadModule = () => {
    jest.resetModules();
    jest.doMock('../../utils/config', () => ({
      getConfig: () => mockGetConfig()
    }));
    // Re-require after mocking
    // eslint-disable-next-line global-require
    prodChecks = require('../../utils/productionChecks');
  };

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    mockGetConfig = jest.fn(() => ({ isProduction: true }));
    process.env = { ...process.env };
    delete process.env.DATABASE_URL;
    delete process.env.SESSION_SECRET;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('validateEnvironment should fail in production when required vars are missing', () => {
    loadModule();
    const result = prodChecks.validateEnvironment(logger);

    expect(result.valid).toBe(false);
    expect(result.missingVars).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'SESSION_SECRET', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'])
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('validateEnvironment should pass in development with only DATABASE_URL', () => {
    mockGetConfig = jest.fn(() => ({ isProduction: false }));
    process.env.DATABASE_URL = 'postgres://localhost/db';
    loadModule();

    const result = prodChecks.validateEnvironment(logger);
    expect(result.valid).toBe(true);
    expect(logger.info).toHaveBeenCalled();
  });

  it('validateDatabase should report success when pool query returns a row', async () => {
    loadModule();
    const pool = {
      query: (sql, cb) => cb(null, { rows: [{ current_time: '2025-01-01T00:00:00Z' }] })
    };

    const result = await prodChecks.validateDatabase(pool, logger);
    expect(result.valid).toBe(true);
    expect(result.serverTime).toBe('2025-01-01T00:00:00Z');
    expect(logger.info).toHaveBeenCalled();
  });

  it('validateDatabase should report error on failure', async () => {
    loadModule();
    const pool = {
      query: (sql, cb) => cb(new Error('connect error'))
    };

    const result = await prodChecks.validateDatabase(pool, logger);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Database connection failed/);
    expect(logger.error).toHaveBeenCalled();
  });

  it('runProductionChecks should pass when environment and database are valid', async () => {
    // Production config and all required env vars present
    mockGetConfig = jest.fn(() => ({ isProduction: true }));
    process.env.DATABASE_URL = 'postgres://localhost/db';
    process.env.SESSION_SECRET = 'super-secret-long-value-32-characters-min';
    process.env.SENDGRID_API_KEY = 'SG.fake';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.com';
    loadModule();

    const pool = { query: (sql, cb) => cb(null, { rows: [{ current_time: 'ok' }] }) };

    const result = await prodChecks.runProductionChecks(pool, logger);
    expect(result.ready).toBe(true);
    expect(logger.info).toHaveBeenCalledWith('Running production readiness checks...');
  });
});