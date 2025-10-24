# Unlockt Insurance Form Application

## Recent Changes
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
- **Backend**: Node.js with Express.js handles API routes, form submissions, and authentication.
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