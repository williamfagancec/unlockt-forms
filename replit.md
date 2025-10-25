# Unlockt Insurance Form Application

## Overview
This project is a secure, comprehensive form collection system for Unlockt Insurance Solutions, facilitating the submission of "Letter of Appointment" and "Quote Slip & Declaration" forms. Its primary purpose is to provide a robust platform for collecting critical insurance data, enabling efficient processing and management by Unlockt staff. Key capabilities include public form submission, a secure admin portal for managing submissions, data export functionalities (XLSX, PDF), and a design optimized for Azure deployment with future integration into MS Fabric. The system aims to streamline the initial stages of the insurance application process and centralize client data.

## Recent Security Updates

### Content Security Policy Enhancement (2025-10-25)
**Security hardening:** Updated Helmet middleware configuration to implement stricter Content-Security-Policy with cryptographic nonces.

**Changes:**
- Removed deprecated `xssFilter` option from Helmet configuration
- Removed `'unsafe-inline'` from both `scriptSrc` and `styleSrc` CSP directives
- Implemented per-request nonce generation using `crypto.randomBytes(32)` 
- Added nonce-based CSP directives via function callbacks: `(req, res) => 'nonce-${res.locals.cspNonce}'`
- Nonces are attached to `res.locals.cspNonce` for each request
- **Fixed:** Corrected `config.IS_PRODUCTION` to `config.isProduction` in index.js line 53 and src/middleware/csrf.js line 19
  - This ensures `upgradeInsecureRequests` CSP directive is properly enabled in production
  - This ensures CSRF cookie `secure` flag is properly set to `true` in production

**Impact:** Strengthens defense against XSS attacks by allowing only scripts and styles with valid nonces to execute. Modern CSP approach that's more secure than relying on `'unsafe-inline'`. Production mode now correctly enforces HTTPS upgrades and secure cookies.

**Next Steps for Full CSP Compliance:**
- Static HTML files in `/public` directory still contain inline scripts and styles
- These files are served via `express.static` and `res.sendFile()`, which cannot access `res.locals.cspNonce`
- Options to resolve:
  1. Move inline scripts/styles to external files
  2. Implement a template engine (EJS, Pug) to inject nonces dynamically
  3. Add middleware to inject nonces into HTML before sending

**Files Modified:**
- `index.js` - Added crypto import, nonce middleware, updated Helmet CSP configuration, fixed config property reference
- `src/middleware/csrf.js` - Fixed config property reference for secure cookie flag

### XSS Vulnerability Fix (2025-10-25)
**Critical security issue resolved:** Fixed cross-site scripting (XSS) vulnerability in admin detail pages where user-controlled filenames from form submissions were inserted into HTML without proper sanitization.

**Impact:** Without this fix, attackers could upload files with malicious filenames (e.g., `"><script>alert(document.cookie)</script>.pdf`) to execute JavaScript in admin browsers, potentially leading to session hijacking, admin account compromise, or unauthorized data access.

**Solution:** Replaced all unsafe `innerHTML` operations with safe DOM manipulation using `createElement()` and `textContent` for user-controlled data.

**Files Fixed:**
- `public/admin/letter-of-appointment-detail.html` - Added `setFileElement()` and `setSignatureElement()` functions
- `public/admin/quote-slip-detail.html` - Same safe DOM manipulation functions added
- `public/admin/users.html` - Fixed alert message display to use `textContent`

**Security Improvement:** All admin pages now safely handle user-generated content, eliminating XSS attack vectors from file uploads and form submissions.

## User Preferences
- **Authentication**: Local username/password (MS Entra ID SSO for future implementation)
- **Deployment**: Azure App Service (VM mode for stateful sessions)
- **Database**: PostgreSQL (Azure Database for PostgreSQL in production)
- **Export formats**: XLSX (bulk), PDF (individual - LOA only)
- **Design**: Green gradient theme matching Unlockt brand

## System Architecture

### UI/UX Decisions
The application features distinct interfaces for public users and administrators. Public forms are designed for easy, unauthenticated submission. The admin portal provides a dashboard with statistics and detailed views of submissions. Form validation includes visual feedback and auto-scrolling.

### Technical Implementations
- **Backend**: Node.js with Express.js using a layered architecture (Repository → Service → Controller → Route) for scalability and maintainability.
  - **Logging**: Structured logging with Pino, correlation IDs, and environment-specific formatting.
  - **Configuration**: Typed config management with Zod validation for environment variables.
  - **Error Handling**: Centralized error middleware with custom error classes.
  - **Security**: Helmet middleware, rate limiting, and CSRF protection infrastructure.
  - **Production Hardening**: Health check endpoints, graceful shutdown, and production readiness checks.
- **Database**: PostgreSQL is used for data persistence, managed via Drizzle ORM.
- **Authentication**: Local email/password authentication with bcrypt hashing. Session management uses `express-session` with `connect-pg-simple`. Role-based access control and magic link onboarding for admin users are implemented.
- **Form Handling**: Public forms allow file uploads (Multer) and digital signatures (SignaturePad).
- **Admin Dashboard**: Provides real-time statistics and navigation for managing submissions.
- **Data Export**: PDFKit for individual PDF exports and ExcelJS for bulk XLSX exports.
- **File Storage**: Local disk storage in development; Azure Blob Storage for persistent files in production.
- **Deployment Configuration**: Designed for Azure App Service, detecting production environments and automatically configuring services based on Azure environment variables.

### Feature Specifications
- **Public Form Submission**: Supports "Letter of Appointment" and "Quote Slip & Declaration" forms with file uploads and digital signatures.
- **Admin Authentication**: Email/password authentication, bcrypt hashing, role-based access, PostgreSQL-backed sessions, httpOnly cookies, magic link onboarding.
- **Admin Dashboard**: Overview and statistics for both form types, navigation to submission lists.
- **Submission Management**: Searchable list views and detailed views for both form types.
- **Data Export**: Comprehensive XLSX export for all form fields, individual LOA PDF export.
- **Security**: Bcrypt password hashing, httpOnly cookies, input validation, SQL injection protection, XSS protection (safe DOM manipulation), secure file handling, user enumeration protection.
- **Database Schema**: Includes tables for `adminUsers`, `formSubmissions`, `quoteSlipSubmissions`, and various dropdown reference tables.

## External Dependencies
- **Database**: PostgreSQL (Neon for development, Azure Database for PostgreSQL for production)
- **ORM**: Drizzle ORM
- **Authentication**: `bcrypt`, `express-session`, `connect-pg-simple`
- **Email Service**: SendGrid API
- **File Uploads**: Multer
- **Digital Signatures**: SignaturePad
- **PDF Generation**: PDFKit
- **XLSX Export**: ExcelJS
- **Azure Services**: Azure Blob Storage
- **Database Drivers**: `@neondatabase/serverless`, `pg`