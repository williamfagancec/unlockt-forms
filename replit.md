# Unlockt Insurance Form Application

## Overview
This project is a secure, comprehensive form collection system for Unlockt Insurance Solutions, facilitating the submission of "Letter of Appointment" and "Quote Slip & Declaration" forms. Its primary purpose is to provide a robust platform for collecting critical insurance data, enabling efficient processing and management by Unlockt staff. Key capabilities include public form submission, a secure admin portal for managing submissions, data export functionalities (XLSX, PDF), and a design optimized for Azure deployment with future integration into MS Fabric. The system aims to streamline the initial stages of the insurance application process and centralize client data.

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
- **Security**: Bcrypt password hashing, httpOnly cookies, input validation, SQL injection protection, secure file handling, user enumeration protection.
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