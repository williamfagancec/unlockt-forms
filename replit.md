# Unlockt Insurance Form Application

## Recent Changes
- **2025-10-25**: **Phase 4: API Standardization** - Implemented consistent response formats and validation patterns across all endpoints:
  - **Standardized Response Utilities** (`src/utils/apiResponse.js`): Created success(), error(), created(), notFound(), unauthorized(), forbidden(), validationError() helpers with HTTP_STATUS constants
  - **Centralized Validation Middleware** (`src/middleware/validation.js`): Single validate() function replaces duplicate validation logic across route files
  - **Updated All Controllers** (8 files): All endpoints now use standardized response helpers for consistent {success: true/false, data/error} format
  - **Updated Auth Middleware**: All auth flows (login, logout, check session, change password) use standardized responses
  - **Updated Error Handler**: Consistent error format with {success: false, error, errors (optional)} structure, correlation IDs for 500 errors
  - **Consistent HTTP Status Codes**: 200 (success), 201 (created), 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error), 503 (service unavailable)
  - All API responses verified: success responses, validation errors, auth errors, not found errors all properly formatted
  - Architect reviewed and approved with Pass status
- **2025-10-25**: **Phase 3: Separation of Concerns** - Completed transformation of monolithic 1,964-line index.js into clean layered architecture:
  - **Repository Layer** (5 files): Isolated all database access (AdminUserRepository, FormSubmissionRepository, QuoteSlipRepository, ReferenceDataRepository, UserRepository)
  - **Service Layer** (5 files): Extracted business logic into domain services (UserManagementService, FormSubmissionService, ExportService, OnboardingService, ReferenceDataService)
  - **Controller Layer** (8 files): Created thin HTTP handlers delegating to services (AdminUserController, AdminDashboardController, ExportController, OnboardingController, PasswordResetController, FormSubmissionController, ReferenceDataController, AzureAuthController)
  - **Route Layer** (6 files): Organized routes by domain using Express Router (admin.routes.js, submissions.routes.js, auth.routes.js, forms.routes.js, reference.routes.js, pages.routes.js)
  - **Refactored index.js**: Reduced from 1,964 lines to ~200 lines minimal orchestration file
  - Fixed storage.js lazy-loading for config, added adminAuthMiddleware export alias
  - All endpoints tested and verified working, no regressions observed
- **2025-10-25**: **Phase 1 & 2: Foundation & Structure Refactoring** - Reorganized codebase for production scalability and maintainability:
  - Added typed configuration management with Zod validation (`src/utils/config.js`)
  - Implemented structured logging with Pino, correlation IDs, and request tracking (`src/utils/logger.js`)
  - Created centralized error handling middleware with custom error classes (`src/middleware/errorHandler.js`)
  - Added Helmet security middleware for HTTP headers
  - Moved server modules to new `src/` structure: `server/auth.js` → `src/middleware/auth.js`, `server/password-reset.js` → `src/services/PasswordResetService.js`, `server/storage.js` → `src/infrastructure/storage.js`, `server/db.js` → `src/infrastructure/database.js`
  - Created folder structure for future separation: `src/routes`, `src/controllers`, `src/services`, `src/repositories`, `src/jobs`
- **2025-10-24**: Fixed duplicate click handlers on profile dropdown in admin.html that caused toggle to fire twice. Updated outside click handler to properly sync ARIA attributes (aria-expanded, aria-hidden) for improved accessibility.
- **2025-10-24**: Added validation guard for SENDGRID_FROM_EMAIL in password reset email function. Fails fast with explicit error message if environment variable is not configured, preventing unclear SendGrid errors.
- **2025-10-24**: Refactored password reset token consumption to use .returning() instead of rowCount for database driver portability. Ensures single-use token semantics work consistently across PostgreSQL drivers (Neon serverless and standard pg).
- **2025-10-24**: Updated session check endpoint to verify user.isFrozen status. Frozen accounts are now treated the same as inactive accounts - session is destroyed and user is logged out, preventing frozen users from maintaining active sessions.
- **2025-10-24**: Added defensive guards to prevent bcrypt.compare runtime errors when passwordHash is null/undefined in login and change-password flows. Returns appropriate error messages while maintaining user enumeration protection.
- **2025-10-24**: Fixed user enumeration vulnerability in login flow by validating credentials before revealing account status. All authentication failures now return generic "Invalid email or password" message while detailed status (inactive, frozen, non-existent) is logged server-side only for auditing.
- **2025-10-23**: Aligned password reset email tracking settings with onboarding (disabled click/open tracking) and gated URL logging to non-production environments to prevent security leaks.
- **2025-10-23**: Improved error handling in forgot-password.html to properly display API validation errors from express-validator ({errors:[{msg}]}), with graceful JSON parsing and fallback messages.
- **2025-10-23**: Added ARIA attributes and focus management to forgot-password.html for improved screen reader accessibility (role, aria-live regions, programmatic focus).
- **2025-10-23**: Refactored user status change logic to use atomic backend endpoint, eliminating partial failure risk where unfreeze could succeed but status toggle could fail.
- **2025-10-23**: Created shared password validation module (public/js/password-validation.js) to eliminate code duplication across change-password.html, setup-password.html, and admin/reset-password.html.
- **2025-10-23**: Fixed critical security vulnerability in admin seeding that was resetting passwords and elevating roles on every server restart. Default admin creation now gated behind `SEED_DEFAULT_ADMIN=true` and only creates if missing, never updates existing admins.
- **2025-10-23**: Added atomic token consumption to password reset flow to prevent double-use attacks via race conditions.
- **2025-10-23**: Added defensive null/undefined checks in admin dashboard UI to prevent crashes on incomplete API responses.

## Overview
This project is a secure, comprehensive form collection system for Unlockt Insurance Solutions. It facilitates the submission of "Letter of Appointment" and "Quote Slip & Declaration" forms. Its primary purpose is to provide a robust platform for collecting critical insurance data, enabling efficient processing and management by Unlockt staff. Key capabilities include public form submission, a secure admin portal for managing submissions, data export functionalities (XLSX, PDF), and a design optimized for Azure deployment with future integration into MS Fabric. The system aims to streamline the initial stages of the insurance application process and centralize client data.

## User Preferences
- **Authentication**: Local username/password (MS Entra ID SSO for future implementation)
- **Deployment**: Azure App Service (VM mode for stateful sessions)
- **Database**: PostgreSQL (Azure Database for PostgreSQL in production)
- **Export formats**: XLSX (bulk), PDF (individual - LOA only)
- **Design**: Green gradient theme matching Unlockt brand

## System Architecture

### UI/UX Decisions
The application features distinct interfaces for public users and administrators. Public forms (`letter-of-appointment.html`, `quote-slip.html`) are designed for easy, unauthenticated submission. The admin portal (`admin-login.html`, `admin.html`) provides a dashboard with statistics and detailed views of submissions. Form validation includes visual feedback (red borders, background highlights) and auto-scrolling to improve user experience.

### Technical Implementations
- **Backend**: Node.js with Express.js using layered architecture for scalability and maintainability.
  - **Architecture**: Clean separation of concerns with Repository → Service → Controller → Route layers
  - **Logging**: Structured logging with Pino, correlation IDs for request tracking, environment-specific formatting (pretty in dev, JSON in prod)
  - **Configuration**: Typed config management with Zod validation for environment variables
  - **Error Handling**: Centralized error middleware with custom error classes (ValidationError, AuthenticationError, etc.)
  - **Security**: Helmet middleware for security headers, CSRF protection (planned), rate limiting
  - **Code Organization**: 
    - `src/repositories/`: Database access layer (5 repositories)
    - `src/services/`: Business logic layer (5 services)
    - `src/controllers/`: HTTP request handlers (8 controllers)
    - `src/routes/`: Express route modules (6 domain-organized routes)
    - `src/middleware/`: Custom middleware (auth, error handling, logging)
    - `src/infrastructure/`: Database, storage, and external service integrations
    - `src/utils/`: Shared utilities (config, logger, async handlers)
- **Database**: PostgreSQL is used for data persistence, managed via Drizzle ORM.
  - Development: Neon-backed PostgreSQL on Replit.
  - Production: Azure Database for PostgreSQL.
- **Authentication**: Local email/password authentication with bcrypt hashing. Session management uses `express-session` with `connect-pg-simple` for persistent sessions. Role-based access control (administrator, reviewer, read-only) is implemented. Magic link onboarding for admin users.
- **Form Handling**: Public forms allow file uploads (Multer) and digital signatures (SignaturePad).
- **Admin Dashboard**: Provides real-time statistics and navigation for managing submissions.
- **Data Export**: PDFKit for individual PDF exports (LOA) and ExcelJS for bulk XLSX exports.
- **File Storage**: Local disk storage in development; Azure Blob Storage for persistent files in production, configurable via connection strings.
- **Deployment Configuration**: Designed for Azure App Service, detecting production environments and automatically configuring database drivers (Neon or pg with SSL), SendGrid API, and URL generation based on Azure environment variables.

### Feature Specifications
- **Public Form Submission**:
    - **Letter of Appointment**: Strata management/property info, appointment questions, contact, digital signature, file uploads (common seal, letterhead).
    - **Quote Slip & Declaration**: Building/insurance info, database-driven dropdowns, 8 document uploads, facilities, cover options, disclosure, digital signature, declaration.
- **Admin Authentication**: Email/password (case-insensitive), bcrypt hashing, role-based access, PostgreSQL-backed sessions, httpOnly cookies, magic link onboarding.
  - Note: In development, you may seed a default admin via environment variables. Do not hardcode or publish real credentials in documentation.
- **Admin Dashboard**: Overview and statistics for both form types, navigation to submission lists.
- **Submission Management**: Searchable list views and detailed views for both form types.
- **Data Export**: Comprehensive XLSX export for all form fields, individual LOA PDF export.
- **Security**: Bcrypt password hashing, httpOnly cookies, input validation, SQL injection protection (ORM), secure file handling, user enumeration protection (credentials validated before revealing account status).
- **Database Schema**:
    - `adminUsers`: Stores admin login details, roles, and status.
    - `formSubmissions`: Letter of Appointment form data.
    - `quoteSlipSubmissions`: Quote Slip & Declaration form data.
    - `dropdown tables`: `insurers`, `roofTypes`, `externalWallTypes`, `floorTypes`, `buildingTypes` for dynamic form options.

## External Dependencies
- **Database**: PostgreSQL (Neon for development, Azure Database for PostgreSQL for production)
- **ORM**: Drizzle ORM
- **Authentication**: `bcrypt` (password hashing), `express-session`, `connect-pg-simple` (PostgreSQL session store)
- **Email Service**: SendGrid API (for magic links, notifications)
- **File Uploads**: Multer
- **Digital Signatures**: SignaturePad
- **PDF Generation**: PDFKit
- **XLSX Export**: ExcelJS
- **Azure Services**: Azure Blob Storage (for persistent file storage in production)
- **Database Drivers**: `@neondatabase/serverless` (for Neon), `pg` (for standard PostgreSQL)