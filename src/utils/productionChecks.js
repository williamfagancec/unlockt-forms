const { getConfig } = require('./config');

const REQUIRED_ENV_VARS = {
  production: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL'
  ],
  development: [
    'DATABASE_URL'
  ]
};

const OPTIONAL_ENV_VARS = [
  'AZURE_CLIENT_ID',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_STORAGE_CONTAINER_NAME',
  'SEED_DEFAULT_ADMIN',
  'DEFAULT_ADMIN_FIRST_NAME',
  'DEFAULT_ADMIN_LAST_NAME',
  'DEFAULT_ADMIN_EMAIL',
  'DEFAULT_ADMIN_PASSWORD',
  'PORT',
  'NODE_ENV'
];

function validateEnvironment(logger) {
  const config = getConfig();
  const isProduction = config.isProduction;
  const requiredVars = isProduction ? REQUIRED_ENV_VARS.production : REQUIRED_ENV_VARS.development;
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error({ 
      missingVars, 
      environment: isProduction ? 'production' : 'development' 
    }, 'Missing required environment variables');
    
    return {
      valid: false,
      missingVars,
      message: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  }

  const warnings = [];
  
  if (isProduction && !process.env.AZURE_STORAGE_CONNECTION_STRING) {
    warnings.push('AZURE_STORAGE_CONNECTION_STRING not set - using local file storage');
  }

  if (!process.env.AZURE_CLIENT_ID && !process.env.AZURE_TENANT_ID && !process.env.AZURE_CLIENT_SECRET) {
    warnings.push('Azure AD authentication not configured - only local auth available');
  }

  if (warnings.length > 0) {
    logger.warn({ warnings }, 'Environment configuration warnings');
  }

  logger.info({ 
    environment: isProduction ? 'production' : 'development',
    requiredVars,
    warnings: warnings.length 
  }, 'Environment validation passed');

  return {
    valid: true,
    warnings,
    message: 'All required environment variables present'
  };
}

function validateDatabase(pool, logger) {
  return new Promise((resolve) => {
    pool.query('SELECT NOW() as current_time', (err, result) => {
      if (err) {
        logger.error({ err }, 'Database connection check failed');
        resolve({
          valid: false,
          message: 'Database connection failed',
          error: err.message
        });
      } else {
        logger.info({ serverTime: result.rows[0].current_time }, 'Database connection verified');
        resolve({
          valid: true,
          message: 'Database connection successful',
          serverTime: result.rows[0].current_time
        });
      }
    });
  });
}

async function runProductionChecks(pool, logger) {
  logger.info('Running production readiness checks...');

  const envCheck = validateEnvironment(logger);
  if (!envCheck.valid) {
    throw new Error(envCheck.message);
  }

  const dbCheck = await validateDatabase(pool, logger);
  if (!dbCheck.valid) {
    throw new Error(dbCheck.message);
  }

  logger.info('All production readiness checks passed');
  
  return {
    environment: envCheck,
    database: dbCheck,
    ready: true
  };
}

module.exports = {
  validateEnvironment,
  validateDatabase,
  runProductionChecks,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS
};
