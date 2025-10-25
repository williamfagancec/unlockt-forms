const schema = require('../../shared/schema');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?'
  );
}

// Detect database type and use appropriate driver
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');
let pool, db;

if (isNeonDatabase) {
  // Use Neon serverless driver
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-serverless');
  const ws = require('ws');
  
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  db = drizzle({ client: pool, schema });
} else {
  // Use standard PostgreSQL driver (for Azure, local, etc.)
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.WEBSITE_INSTANCE_ID
      ? { rejectUnauthorized: false }
      : false,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
  });
  db = drizzle(pool, { schema });
}

module.exports = { pool, db };
