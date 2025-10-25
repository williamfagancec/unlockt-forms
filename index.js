require('dotenv').config();

const { loadConfig, getConfig } = require('./src/utils/config');
const config = loadConfig();

const { createLogger, addCorrelationId, createRequestLogger } = require('./src/utils/logger');
const logger = createLogger(config);

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const msal = require('@azure/msal-node');
const bcrypt = require('bcryptjs');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { setLogger: setAuthLogger } = require('./src/middleware/auth');

const adminUserRepository = require('./src/repositories/AdminUserRepository');
const ReferenceDataService = require('./src/services/ReferenceDataService');

const createAdminRoutes = require('./src/routes/admin.routes');
const createSubmissionsRoutes = require('./src/routes/submissions.routes');
const createAuthRoutes = require('./src/routes/auth.routes');
const createFormsRoutes = require('./src/routes/forms.routes');
const createReferenceRoutes = require('./src/routes/reference.routes');
const createPagesRoutes = require('./src/routes/pages.routes');

const app = express();
const PORT = config.PORT;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(addCorrelationId);
app.use(createRequestLogger(logger));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.set('trust proxy', true);

const isProduction = config.isProduction;

const { pool: pgPool } = require('./src/infrastructure/database');

const sessionStore = new pgSession({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true
});

sessionStore.on('error', (err) => {
  logger.error({ err }, 'Session store error');
});

logger.info({
  isProduction,
  cookieSettings: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  }
}, 'Session configuration loaded');

app.use(session({
  store: sessionStore,
  secret: (() => {
    if (!process.env.SESSION_SECRET && isProduction) {
      throw new Error('SESSION_SECRET must be set in production');
    }
    return process.env.SESSION_SECRET || 'dev-only-insecure-secret';
  })(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const azureConfigured = !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_SECRET);

let cca = null;

if (azureConfigured) {
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            logger.info({ source: 'MSAL' }, message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Info,
      }
    }
  };

  cca = new msal.ConfidentialClientApplication(msalConfig);
}

setAuthLogger(logger);

async function initializeDefaultAdmin() {
  try {
    if (process.env.SEED_DEFAULT_ADMIN !== 'true') {
      logger.info('Default admin seeding disabled (set SEED_DEFAULT_ADMIN=true to enable)');
      return;
    }
    
    if (isProduction) {
      const requiredEnvVars = ['DEFAULT_ADMIN_FIRST_NAME', 'DEFAULT_ADMIN_LAST_NAME', 'DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_PASSWORD'];
      const missing = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        logger.error({ missing }, 'Cannot seed default admin in production: Missing required environment variables');
        return;
      }
    }
    
    const defaultFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Raj';
    const defaultLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Mendes';
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'raj.mendes@customerexperience.com.au';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'TestPassword123!';
    
    const existingUser = await adminUserRepository.findByEmail(defaultEmail);
    
    if (existingUser) {
      logger.info({ email: defaultEmail }, 'Default admin already exists (skipping creation to preserve existing credentials)');
      return;
    }
    
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await adminUserRepository.create({
      firstName: defaultFirstName,
      lastName: defaultLastName,
      email: defaultEmail,
      passwordHash: passwordHash,
      role: 'administrator',
      isActive: true
    });
    logger.info({ email: defaultEmail }, 'Default admin created');
  } catch (error) {
    logger.error({ err: error }, 'Error initializing admin');
  }
}

async function initializeDropdownData() {
  const referenceDataService = new ReferenceDataService(logger);
  await referenceDataService.initializeDropdowns();
}

app.use('/', createPagesRoutes());
app.use('/api', createReferenceRoutes(logger));
app.use('/api', createFormsRoutes(logger));
app.use('/api', createSubmissionsRoutes(logger));
app.use('/api/admin', createAdminRoutes(logger));
app.use('/api', createAuthRoutes(logger, cca));
app.use('/auth', createAuthRoutes(logger, cca));

app.use(notFoundHandler);
app.use(errorHandler(logger));

async function startServer() {
  await initializeDefaultAdmin();
  await initializeDropdownData();

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info('Public form: /');
    logger.info('Admin dashboard: /admin');
  });
}

startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
