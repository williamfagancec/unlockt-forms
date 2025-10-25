# Environment Variables Documentation

This document describes all environment variables used by the Unlockt Insurance Form Application.

## Required Variables

### Production Environment

These variables **MUST** be set in production:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Secret key for session encryption (min 32 chars) | `your-random-secret-key-here` |
| `SENDGRID_API_KEY` | SendGrid API key for email sending | `SG.xxxxxxxxxxxxx` |
| `SENDGRID_FROM_EMAIL` | Email address for outgoing emails | `noreply@example.com` |

### Development Environment

These variables are required in development:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |

## Optional Variables

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port number for HTTP server | `5000` |
| `NODE_ENV` | Environment mode | `development` |

### Azure Integration

| Variable | Description | Required For |
|----------|-------------|--------------|
| `AZURE_CLIENT_ID` | Azure AD application client ID | Azure AD SSO |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Azure AD SSO |
| `AZURE_CLIENT_SECRET` | Azure AD application secret | Azure AD SSO |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | Production file storage |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure Blob Storage container name | Production file storage |

### Admin Seeding

**⚠️ SECURITY WARNING:** Only enable default admin seeding in development environments. Never use in production with default credentials.

| Variable | Description | Default |
|----------|-------------|---------|
| `SEED_DEFAULT_ADMIN` | Enable default admin creation | `false` |
| `DEFAULT_ADMIN_FIRST_NAME` | Default admin first name | `Raj` |
| `DEFAULT_ADMIN_LAST_NAME` | Default admin last name | `Mendes` |
| `DEFAULT_ADMIN_EMAIL` | Default admin email address | `raj.mendes@customerexperience.com.au` |
| `DEFAULT_ADMIN_PASSWORD` | Default admin password | `TestPassword123!` |

## Azure App Service Configuration

When deploying to Azure App Service, these variables are automatically available:

| Variable | Description | Usage |
|----------|-------------|-------|
| `WEBSITE_INSTANCE_ID` | Azure App Service instance identifier | Auto-detected for production mode |
| `WEBSITE_HOSTNAME` | Azure App Service hostname | URL generation |

## Environment-Specific Behavior

### Production Detection

The application detects production environment when:
- `NODE_ENV=production`, OR
- `WEBSITE_INSTANCE_ID` is set (Azure App Service)

### Production Defaults

When running in production:
- Session cookies: `secure=true`, `sameSite=none`
- HSTS enabled with preload
- File uploads use Azure Blob Storage (if configured)
- Database uses SSL connections
- Logging output: JSON format

### Development Defaults

When running in development:
- Session cookies: `secure=false`, `sameSite=lax`
- File uploads use local disk storage
- Database uses standard connections
- Logging output: Pretty-printed format
- Default SESSION_SECRET: `dev-only-insecure-secret` (auto-generated warning)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong random values** for `SESSION_SECRET` (minimum 32 characters)
3. **Rotate secrets regularly** in production
4. **Disable admin seeding** in production (`SEED_DEFAULT_ADMIN=false`)
5. **Use Azure Key Vault** or App Service Application Settings for production secrets
6. **Restrict SendGrid API key** permissions to sending only

## Example .env Files

### Development

```env
DATABASE_URL=postgresql://localhost:5432/unlockt_dev
SESSION_SECRET=dev-only-insecure-secret-do-not-use-in-production
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=dev@example.com
PORT=5000
NODE_ENV=development

# Optional: Admin seeding for development
SEED_DEFAULT_ADMIN=true
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=DevPassword123!
```

### Production (Azure App Service Application Settings)

```env
DATABASE_URL=postgresql://user:pass@production-db.postgres.database.azure.com:5432/unlockt_prod?ssl=true
SESSION_SECRET=<STRONG-RANDOM-SECRET-32-CHARS-MINIMUM>
SENDGRID_API_KEY=<YOUR-SENDGRID-API-KEY>
SENDGRID_FROM_EMAIL=noreply@unlockt.com.au
NODE_ENV=production

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=<AZURE-STORAGE-CONNECTION-STRING>
AZURE_STORAGE_CONTAINER_NAME=unlockt-uploads

# Optional: Azure AD SSO
AZURE_CLIENT_ID=<YOUR-AZURE-CLIENT-ID>
AZURE_TENANT_ID=<YOUR-AZURE-TENANT-ID>
AZURE_CLIENT_SECRET=<YOUR-AZURE-CLIENT-SECRET>

# ⚠️ NEVER enable this in production ⚠️
SEED_DEFAULT_ADMIN=false
```

## Validation

The application validates required environment variables on startup. Missing required variables will prevent the application from starting in production.

Run validation manually:
```javascript
const { runProductionChecks } = require('./src/utils/productionChecks');
await runProductionChecks(pool, logger);
```

## Health Checks

The application provides health check endpoints for monitoring:

- `/health/liveness` - Server liveness check (always returns 200 if running)
- `/health/readiness` - Readiness check (includes database connectivity)
- `/health/metrics` - Application metrics (uptime, memory usage)

Use these endpoints for:
- Azure App Service health monitoring
- Load balancer health probes
- Container orchestration readiness checks
