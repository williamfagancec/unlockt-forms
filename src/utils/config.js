const { z } = require('zod');

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  BASE_URL: z.string().url().optional().refine(
    (val) => {
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.WEBSITE_INSTANCE_ID || 
                          process.env.REPLIT_DEPLOYMENT;
      return !isProduction || val;
    },
    { message: 'BASE_URL is required in production (e.g., https://yourdomain.com)' }
  ),
  
  SESSION_SECRET: z.string().min(32).optional().refine(
    (val) => {
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.WEBSITE_INSTANCE_ID || 
                          process.env.REPLIT_DEPLOYMENT;
      return !isProduction || val;
    },
    { message: 'SESSION_SECRET is required in production' }
  ),
  
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_REDIRECT_URI: z.string().optional(),
  
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().default('uploads'),
  
  WEBSITE_INSTANCE_ID: z.string().optional(),
  REPLIT_DEPLOYMENT: z.string().optional(),
  
  RESET_RL_PER_EMAIL_HOURLY: z.string().default('3').transform(Number),
  RESET_RL_PER_IP_HOURLY: z.string().default('5').transform(Number),
  
  SEED_DEFAULT_ADMIN: z.string().optional().transform(val => val === 'true'),
});

let config = null;

function loadConfig() {
  if (config) {
    return config;
  }

  try {
    const rawConfig = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL,
      BASE_URL: process.env.BASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
      AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
      AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
      AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
      AZURE_REDIRECT_URI: process.env.AZURE_REDIRECT_URI,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
      AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
      WEBSITE_INSTANCE_ID: process.env.WEBSITE_INSTANCE_ID,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      RESET_RL_PER_EMAIL_HOURLY: process.env.RESET_RL_PER_EMAIL_HOURLY,
      RESET_RL_PER_IP_HOURLY: process.env.RESET_RL_PER_IP_HOURLY,
      SEED_DEFAULT_ADMIN: process.env.SEED_DEFAULT_ADMIN,
    };

    config = configSchema.parse(rawConfig);
    
    config.isProduction = config.NODE_ENV === 'production' || 
                          !!config.WEBSITE_INSTANCE_ID || 
                          !!config.REPLIT_DEPLOYMENT;
    
    config.azureConfigured = !!(config.AZURE_CLIENT_ID && 
                                config.AZURE_TENANT_ID && 
                                config.AZURE_CLIENT_SECRET);
    
    config.isAzureProduction = config.isProduction && !!config.AZURE_STORAGE_CONNECTION_STRING;
    
    config.sendgridConfigured = !!(config.SENDGRID_API_KEY && config.SENDGRID_FROM_EMAIL);
    
    // Set default BASE_URL for development if not provided
    if (!config.BASE_URL) {
      config.BASE_URL = `http://localhost:${config.PORT}`;
    }
    
    // Remove trailing slash from BASE_URL for consistent URL joining
    config.BASE_URL = config.BASE_URL.replace(/\/$/, '');

    return Object.freeze(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration. Please check your environment variables.');
    }
    throw error;
  }
}

function getConfig() {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}

module.exports = {
  loadConfig,
  getConfig,
};
