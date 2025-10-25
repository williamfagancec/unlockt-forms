const { z } = require('zod');

describe('config utility', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration with required DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.NODE_ENV = 'development';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(config.NODE_ENV).toBe('development');
    });

    it('should default PORT to 5000', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      delete process.env.PORT;

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.PORT).toBe(5000);
    });

    it('should throw error when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;

      const { loadConfig } = require('../../utils/config');

      expect(() => loadConfig()).toThrow();
    });

    it('should detect production environment from NODE_ENV', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'very-secret-key-that-is-long-enough-for-production';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.isProduction).toBe(true);
    });

    it('should detect production environment from WEBSITE_INSTANCE_ID', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.WEBSITE_INSTANCE_ID = 'azure-instance-id';
      process.env.SESSION_SECRET = 'very-secret-key-that-is-long-enough-for-production';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.isProduction).toBe(true);
    });

    it('should detect Azure configuration', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.AZURE_CLIENT_ID = 'client-id';
      process.env.AZURE_TENANT_ID = 'tenant-id';
      process.env.AZURE_CLIENT_SECRET = 'client-secret';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.azureConfigured).toBe(true);
    });

    it('should detect Azure storage configuration in production', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.NODE_ENV = 'production';
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'connection-string';
      process.env.SESSION_SECRET = 'very-secret-key-that-is-long-enough-for-production';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.isAzureProduction).toBe(true);
    });

    it('should detect SendGrid configuration', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.SENDGRID_API_KEY = 'sg-key';
      process.env.SENDGRID_FROM_EMAIL = 'test@example.com';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.sendgridConfigured).toBe(true);
    });

    it('should parse boolean SEED_DEFAULT_ADMIN correctly', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.SEED_DEFAULT_ADMIN = 'true';

      const { loadConfig } = require('../../utils/config');
      const config = loadConfig();

      expect(config.SEED_DEFAULT_ADMIN).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return loaded configuration', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

      const { loadConfig, getConfig } = require('../../utils/config');
      loadConfig();
      const config = getConfig();

      expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    });

    it('should throw error if configuration not loaded', () => {
      const { getConfig } = require('../../utils/config');

      expect(() => getConfig()).toThrow('Configuration not loaded');
    });
  });
});