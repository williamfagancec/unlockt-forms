# Unlockt Insurance Form Application

## Project Overview

This is a secure form collection system for Unlockt Insurance Solutions that allows:
- **Public form submission** (no authentication required)
- **Authenticated admin dashboard** using MS Entra ID SSO
- **Export capabilities** (PDF and XLSX) for authenticated users
- **Azure-ready deployment** configuration

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon-backed on Replit, Azure Database for PostgreSQL in production)
- **Authentication**: Microsoft Entra ID (Azure AD) using MSAL Node
- **ORM**: Drizzle ORM
- **Session Management**: Express Session
- **Export Libraries**: PDFKit (PDF), ExcelJS (XLSX)

## Project Structure

```
/
├── index.js                 # Main Express server
├── server/
│   └── db.js               # Database connection
├── shared/
│   └── schema.js           # Drizzle ORM schema
├── public/
│   ├── index.html          # Public form
│   └── admin.html          # Admin dashboard
├── azure-deployment.md     # Azure deployment guide
├── .env.example            # Environment variables template
├── drizzle.config.ts       # Drizzle configuration
└── package.json           # Dependencies
```

## Recent Changes

**Date: October 2, 2025**
- Created PostgreSQL database with Drizzle ORM
- Built public-facing Unlockt Letter of Appointment form
- Implemented MS Entra ID SSO authentication
- Created authenticated admin dashboard
- Added PDF export for individual submissions
- Added XLSX export for bulk data
- Configured Azure deployment (App Service + PostgreSQL)
- Set up GitHub Actions workflow for CI/CD

## Key Features

### 1. Public Form Submission
- No authentication required for form submission
- Client-side and server-side validation
- Stores in PostgreSQL database
- Matches Unlockt brand design with green gradient

### 2. Admin Dashboard
- Requires MS Entra ID authentication
- View all form submissions
- Real-time statistics (total, today, this week)
- Export individual submissions as PDF
- Export all submissions as XLSX

### 3. Data Export
- **PDF**: Individual submission letters with full formatting
- **XLSX**: Bulk export of all submissions with all fields

### 4. Security
- MS Entra ID SSO for admin access
- Session management with httpOnly cookies
- Input validation and sanitization
- Prepared statements (SQL injection protection via ORM)

## Environment Variables

Required for production:

```
DATABASE_URL=postgresql://...
AZURE_CLIENT_ID=your_client_id
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=https://your-domain/auth/redirect
POST_LOGOUT_REDIRECT_URI=https://your-domain
SESSION_SECRET=random_secret_key
NODE_ENV=production
```

## Running Locally

1. Database is already configured (Replit PostgreSQL)
2. Install dependencies: `npm install`
3. Run server: `npm start`
4. Access public form: `http://localhost:5000/`
5. Access admin: `http://localhost:5000/admin` (requires Azure credentials)

## Database Schema

### Users Table
- Stores authenticated users from MS Entra ID
- Links Entra ID to local user record

### Form Submissions Table
- All form fields from the Letter of Appointment
- Anonymous submissions (no user association)
- Timestamps for submission tracking

## Azure Deployment

See `azure-deployment.md` for complete deployment guide including:
- MS Entra ID app registration
- Azure App Service setup
- Azure Database for PostgreSQL configuration
- Key Vault integration
- GitHub Actions CI/CD

## Future Integrations

### Microsoft Fabric Data Lake
- Export submissions to Azure Data Lake Storage
- Set up Fabric workspace for analytics
- Create transformation pipelines
- Build Power BI reports

## User Preferences

- **Authentication**: MS Entra ID SSO only (no other auth methods)
- **Deployment**: Azure App Service (VM mode for stateful sessions)
- **Database**: PostgreSQL (Azure Database for PostgreSQL in production)
- **Export formats**: PDF (individual), XLSX (bulk)

## Notes

- Form submissions are public (anyone can submit)
- Only authenticated users can view submissions
- Azure credentials must be configured for authentication to work
- Application uses session-based authentication (not JWT)
- Designed for Azure deployment with Key Vault integration
