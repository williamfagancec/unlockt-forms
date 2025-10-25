# Unlockt Insurance Form Application

## Overview
This project is a secure, comprehensive form collection system for Unlockt Insurance Solutions, facilitating the submission of "Letter of Appointment" and "Quote Slip & Declaration" forms. Its primary purpose is to provide a robust platform for collecting critical insurance data, enabling efficient processing and management by Unlockt staff. Key capabilities include public form submission, a secure admin portal for managing submissions, data export functionalities (XLSX, PDF), and a design optimized for Azure deployment with future integration into MS Fabric. The system aims to streamline the initial stages of the insurance application process and centralize client data.

## Recent Updates

### Bug Fix: User Activation Logic in Unfreeze and Activate (2025-10-25)
**Fix:** Added missing user activation call when unfreezing and activating accounts.

**Problem:**
The `setUserStatus` method in `UserManagementService` had a logic bug where it would unfreeze a frozen account but never actually activate it, despite logging "User account unfrozen and activated". The code path for `isActive && shouldUnfreeze && user.isFrozen` only called:
- `unfreezeAccount(userId)` - Removes frozen status
- But never called `setActive(userId, true)` - Sets account to active

This meant frozen users requesting activation would be unfrozen but remain inactive, contradicting the log message and user expectations.

**Solution:**
Added the missing activation call immediately after unfreezing:
```javascript
// Before (Bug - user not actually activated)
if (isActive && shouldUnfreeze && user.isFrozen) {
  await adminUserRepository.unfreezeAccount(userId);
  this.logger.info({ userId }, 'User account unfrozen and activated');  // ❌ Misleading log
}

// After (Fixed - user properly activated)
if (isActive && shouldUnfreeze && user.isFrozen) {
  await adminUserRepository.unfreezeAccount(userId);
  await adminUserRepository.setActive(userId, true);  // ✅ Actually activate
  this.logger.info({ userId }, 'User account unfrozen and activated');
}
```

**Impact:**
- ✅ **Correct behavior:** Users are now actually activated when unfrozen
- ✅ **Log accuracy:** Log message matches actual behavior
- ✅ **User experience:** Frozen users can be unfrozen and activated in one action
- ✅ **Error handling preserved:** Maintains proper await and error propagation

**Files Modified:**
- `src/services/UserManagementService.js` - Line 101

### Bug Fix: Signature Upload Data Format (2025-10-25)
**Fix:** Corrected signature upload to pass base64 data and filename separately instead of multer file object.

**Problem:**
The `uploadSignatureToBlob` function expects two parameters `(base64Data, filename)`, but it was being called with a multer file object in both form submission methods. This parameter mismatch would cause:
- Signature uploads to fail or save incorrectly
- Base64 encoding not being applied properly
- Wrong data being written to storage (file object instead of base64 string)

**Solution:**
Extract the buffer as base64 and filename from the multer file object before calling the upload function:
```javascript
// Before (Wrong - passing entire file object)
const signatureUrl = files?.signature?.[0] 
  ? await uploadSignatureToBlob(files.signature[0]) 
  : null;

// After (Correct - passing base64 data and filename)
const signatureUrl = files?.signature?.[0] 
  ? await uploadSignatureToBlob(
      files.signature[0].buffer.toString('base64'), 
      files.signature[0].originalname
    ) 
  : null;
```

**Impact:**
- ✅ **Correct uploads:** Signatures now properly encoded as base64 before storage
- ✅ **Proper filenames:** Original filename preserved in storage
- ✅ **API compliance:** Matches uploadSignatureToBlob function signature
- ✅ **Both forms fixed:** Letter of Appointment and Quote Slip submissions

**Files Modified:**
- `src/services/FormSubmissionService.js` - Lines 36-38 (Letter of Appointment), Lines 89-91 (Quote Slip)

### Bug Fix: PDFKit Color Rendering in PDF Export (2025-10-25)
**Fix:** Corrected invalid PDFKit color usage that would cause PDF misrendering.

**Problem:**
The PDF generation service used `fillColor('rgba(255, 255, 255, 0.9)')` which is not a valid color format for PDFKit. The library doesn't support rgba() strings for color values, which would cause:
- Invalid color rendering or errors
- Potential PDF generation failures
- Opacity being ignored

**Solution:**
Split the rgba() value into separate fillColor() and fillOpacity() calls:
```javascript
// Before (Invalid)
doc.fontSize(8)
   .fillColor('rgba(255, 255, 255, 0.9)')
   .text('ABN 75 684 319 784 | ASIC AR No. 1316562', 50, 90);

// After (Valid)
doc.fontSize(8)
   .fillColor('white')
   .fillOpacity(0.9)
   .text('ABN 75 684 319 784 | ASIC AR No. 1316562', 50, 90);
```

**Impact:**
- ✅ **Correct rendering:** Uses PDFKit's supported color + opacity API
- ✅ **Opacity preserved:** 0.9 opacity properly applied to text
- ✅ **No errors:** Eliminates potential PDF generation issues
- ✅ **Standards compliant:** Follows PDFKit documentation best practices

**Files Modified:**
- `src/services/ExportService.js` - Lines 47-48

### Privacy Enhancement: PII Removal from Error Logs (2025-10-25)
**Privacy fix:** Removed email addresses from error and download logs to prevent PII exposure in log aggregation systems.

**Problem:**
The error handler middleware and download routes were logging `req.session?.adminUser?.email` in error logs and download audit logs. This exposed personally identifiable information (PII) in:
- Server error logs (5xx errors)
- File download audit trails
- Log aggregation systems
- External monitoring tools

**Solution:**
Replaced all email logging with non-PII userId:
```javascript
// Before
user: req.session?.adminUser?.email

// After
userId: req.session?.adminUser?.id
```

**Files Modified:**
- `src/middleware/errorHandler.js` - Line 85 (5xx error logging)
- `src/routes/downloads.routes.js` - Lines 71, 110 (download audit logs)

**Impact:**
- ✅ **Privacy compliance:** No PII in logs (GDPR/CCPA friendly)
- ✅ **Security improvement:** Email addresses can't be harvested from logs
- ✅ **Audit trail maintained:** userId still provides user tracking for debugging
- ✅ **Consistency:** Aligns with logging policy across all controllers and services

**Before:**
```javascript
log.error({
  err,
  user: 'john.doe@example.com',  // PII exposed
}, 'Server error');
```

**After:**
```javascript
log.error({
  err,
  userId: 123,  // No PII, still traceable
}, 'Server error');
```

### Bug Fix: Pagination Safety in Response Utilities (2025-10-25)
**Fix:** Prevented `Infinity` and `NaN` in pagination responses by safely validating limit before division.

**Problem:**
The `paginatedResponse()` function in `src/utils/response.js` calculated `totalPages` using `Math.ceil(total / limit)` without validation. This could produce:
- `Infinity` when `limit` is 0
- `NaN` when `limit` is undefined, null, or non-numeric
- Invalid results for negative limits

**Solution:**
Added safe computation with proper validation:
```javascript
const total = Number(pagination.total) || 0;
const limit = Number(pagination.limit) || 0;
const page = Number(pagination.page) || 1;

const totalPages = (Number.isFinite(limit) && limit > 0) 
  ? Math.ceil(total / limit) 
  : 0;
```

**Impact:**
- ✅ **No Infinity/NaN:** All pagination fields are guaranteed to be valid numbers
- ✅ **Graceful degradation:** Invalid inputs default to safe values (0 or 1)
- ✅ **Type safety:** All inputs coerced to numbers with fallbacks
- ✅ **Negative protection:** Negative limits produce 0 pages instead of errors

**Test Results:**
| Input | Old Behavior | New Behavior |
|-------|-------------|--------------|
| `limit: 0` | `Infinity` | `0` ✅ |
| `limit: undefined` | `NaN` | `0` ✅ |
| `limit: -5` | `-20` | `0` ✅ |
| `limit: "invalid"` | `NaN` | `0` ✅ |
| `limit: 10` | `10` | `10` ✅ |

**Files Modified:**
- `src/utils/response.js` - Lines 25-44

### Code Quality: DRY Refactoring in ReferenceDataService (2025-10-25)
**Improvement:** Eliminated code duplication by extracting seed data arrays to module-level constants.

**Problem:**
The `ReferenceDataService.js` file had duplicate seed arrays in both `initializeDropdowns()` and `forceReseedDropdowns()` methods, violating the DRY (Don't Repeat Yourself) principle. Any changes to seed data required updating in two places, increasing maintenance burden and risk of inconsistencies.

**Solution:**
Extracted all seed arrays to module-level constants at the top of the file:
- `INSURERS` - 11 insurance companies
- `ROOF_TYPES` - 6 roof construction types
- `EXTERNAL_WALL_TYPES` - 11 wall material types
- `FLOOR_TYPES` - 9 floor construction types
- `BUILDING_TYPES` - 5 building classifications

**Impact:**
- ✅ **Single source of truth:** All seed data defined once, used everywhere
- ✅ **Easier maintenance:** Changes to seed data only need to be made in one place
- ✅ **Better readability:** Constants clearly document reference data at file top
- ✅ **Reduced file size:** 178 lines → 136 lines (23% reduction)
- ✅ **No functional changes:** Both methods use identical data as before

**Files Modified:**
- `src/services/ReferenceDataService.js` - Lines 3-58 (constants), 73, 80, 87, 94, 101, 124-128

## Recent Security Updates

### Host Header Injection Prevention (2025-10-25)
**Critical security fix:** Eliminated Host header injection vulnerabilities across all URL-building code by replacing untrusted `req.get('host')` with trusted `config.BASE_URL`.

**Vulnerability Overview:**
Host header injection allows attackers to manipulate URLs in emails and redirects by sending malicious Host headers:
```http
POST /api/password-reset
Host: evil.com
```
This could result in:
- Password reset emails with links to attacker-controlled domains
- OAuth redirects to malicious sites
- Session fixation attacks

**Configuration Changes:**
Added `BASE_URL` to application configuration (`src/utils/config.js`):
- Required in production environments (validated with Zod schema)
- Auto-defaults to `http://localhost:5000` in development
- Trailing slashes removed for consistent URL joining
- Must be a valid URL format (e.g., `https://yourdomain.com`)

**Files Fixed (3 controllers, 4 methods):**

| Controller | Method | Before | After |
|------------|--------|--------|-------|
| **AdminUserController** | create | `${req.protocol}://${req.get('host')}${path}` | `${config.BASE_URL}${path}` |
| **PasswordResetController** | requestReset | `${req.protocol}://${req.get('host')}${path}` | `${config.BASE_URL}${path}` |
| **AzureAuthController** | getSignInUrl | `${req.protocol}://${req.get('host')}${path}` | `${config.BASE_URL}${path}` |
| **AzureAuthController** | handleRedirect | `${req.protocol}://${req.get('host')}${path}` | `${config.BASE_URL}${path}` |

**Security Benefits:**
1. ✅ **Prevents phishing attacks** - Reset/onboarding emails always use trusted domain
2. ✅ **Protects OAuth flow** - Azure AD redirects cannot be hijacked
3. ✅ **Production requirement** - BASE_URL must be set for production deployment
4. ✅ **Consistent URLs** - All generated URLs use same trusted base

**Privacy Improvements (PII Logging Removal):**
Removed email addresses from all log statements to comply with privacy best practices:
- `src/controllers/AdminUserController.js` - Line 36
- `src/controllers/PasswordResetController.js` - Line 71
- `src/controllers/AzureAuthController.js` - Lines 60, 63
- `src/services/UserManagementService.js` - Lines 43, 74
- `src/services/OnboardingService.js` - Line 54

All logs now use `userId` only for audit trails, preventing PII exposure in log aggregation systems.

**Production Deployment Note:**
Set `BASE_URL` environment variable to your production domain:
```bash
BASE_URL=https://yourdomain.com
```

### Input Validation Enhancement (2025-10-25)
**Security improvement:** Fixed improper ID parsing in controllers that could allow NaN values to be passed to services, potentially causing database errors or unexpected behavior.

**Problems Fixed:**
- `parseInt()` used without radix parameter (could misinterpret octal/hex values)
- No validation of parsed IDs before passing to services
- Services could receive `NaN`, `undefined`, or negative values
- Missing `error` response helper in imports

**Changes Applied to All Controllers:**
- Added `error` response helper to imports
- Changed all `parseInt(id)` → `parseInt(id, 10)` for consistent decimal parsing
- Added validation: `if (!Number.isInteger(id) || id <= 0)` before service calls
- Return 400 error response for invalid IDs

**Files Modified:**
- `src/controllers/AdminDashboardController.js` - 2 methods fixed
  - `getLetterOfAppointmentById` (line 29-34)
  - `getQuoteSlipById` (line 50-55)
- `src/controllers/ExportController.js` - 1 method fixed
  - `exportLetterOfAppointmentPDF` (line 14-19)
- `src/controllers/AdminUserController.js` - 4 methods fixed
  - `update` (line 43-48)
  - `toggleStatus` (line 62-67)
  - `setStatus` (line 73-78)
  - `unfreeze` (line 87-92)

**Impact:** 
- Prevents database errors from NaN/invalid ID values
- Better error messages for users (400 Bad Request with "Invalid ID")
- Consistent ID validation across all endpoints
- Protection against edge cases (e.g., `parseInt("0x10")` returning 16 instead of error)

### Button State Management Fix (2025-10-25)
**Bug fix:** Fixed conflicting button state management in forgot-password form that prevented the 10-second anti-spam delay from working correctly.

**Problem:**
- Submit button was disabled with 10-second timeout after successful password reset request (lines 234-235)
- `finally` block immediately re-enabled the button (lines 267-268)
- This canceled the timeout, allowing rapid repeated submissions

**Fix:**
- Removed unconditional button re-enable from `finally` block
- Moved button re-enable logic into `setTimeout` for success case (10s delay preserved)
- Moved button re-enable logic into error/catch handlers for failure cases (immediate)

**Behavior After Fix:**
- **Success**: Button stays disabled for 10 seconds (anti-spam protection)
- **Error/Failure**: Button re-enables immediately (user can retry)

**Impact:** Client-side anti-spam protection now works correctly. Users cannot rapidly submit multiple password reset requests, complementing the server-side rate limiting (3 requests per hour).

**Files Modified:**
- `public/forgot-password.html` - Fixed button state management logic

### Unused Dependency Removal (2025-10-25)
**Maintenance:** Removed unused `csurf` dependency from project to reduce attack surface and dependency bloat.

**Changes:**
- Removed `csurf` package from `package.json` (was line 29)
- Ran `npm uninstall csurf` to update `package-lock.json`
- Removed 11 packages total (csurf + its dependencies)
- Verified no code references to csurf in the codebase

**Background:**
- Project uses `csrf-csrf` (modern CSRF protection library)
- `csurf` is an older, deprecated CSRF library that was never used
- Likely added during initial setup but replaced with `csrf-csrf`

**Impact:** Reduced node_modules size, eliminated unnecessary dependencies, smaller attack surface, faster npm installs.

**Files Modified:**
- `package.json` - Removed csurf dependency
- `package-lock.json` - Automatically updated by npm uninstall

### Rate Limiter Evasion Fix (2025-10-25)
**Security fix:** Removed duplicate auth routes mount that allowed attackers to bypass rate limiting by splitting requests across multiple paths.

**Vulnerability:**
- Auth routes were mounted at both `/api` and `/auth` paths (lines 219-220)
- Rate limiters in `express-rate-limit` track by IP address but not by path
- Attackers could bypass the 5-attempt login limit by alternating paths:
  - 5 attempts at `/api/admin/login` → rate limited
  - 5 more attempts at `/auth/admin/login` → fresh limit (same IP, different path)
  - Effective total: 10 attempts instead of 5

**Fix:**
- Removed redundant `/auth` mount (deleted line 220)
- All authentication endpoints now only accessible via `/api` prefix
- Frontend code confirmed to use `/api` exclusively (no `/auth` references found)
- Rate limiting now properly enforced with no bypass route

**Impact:** Brute-force protection restored to intended 5 login attempts per 15 minutes. Password reset protection restored to 3 attempts per hour. Attack surface reduced by eliminating duplicate endpoints.

**Files Modified:**
- `index.js` - Removed duplicate auth routes mount (deleted line 220)

### Graceful Shutdown Exit Code Fix (2025-10-25)
**Reliability improvement:** Fixed graceful shutdown logic to properly propagate exit codes, preventing crashes from being masked as successful exits.

**Changes:**
- Modified `gracefulShutdown` function to accept `exitCode` parameter (default: 1 for errors)
- Normal shutdowns (SIGTERM, SIGINT) now explicitly use exit code 0
- Error shutdowns (uncaughtException, unhandledRejection) now use exit code 1
- Exit code propagated through all exit paths:
  - Server close callback: `process.exit(exitCode)`
  - Forced timeout handler: `process.exit(exitCode)`
  - No-server fallback: `process.exit(exitCode)`
- Database pool closure errors now ensure exit code remains 1
- Exit code logged in shutdown messages for debugging

**Impact:** Process exit codes now correctly reflect the shutdown reason. Container orchestration systems (Kubernetes, Docker, systemd) can properly detect and respond to crashes vs. normal shutdowns. Monitoring systems can accurately track application failures.

**Exit Code Behavior:**
- Exit 0: Normal shutdown via SIGTERM or SIGINT
- Exit 1: Uncaught exceptions, unhandled rejections, database pool errors, forced timeout
- Exit 1: Server startup failures (already existing behavior)

**Files Modified:**
- `index.js` - Updated graceful shutdown function and process event handlers (lines 253-292)

### PII Logging Removal (2025-10-25)
**Privacy hardening:** Removed personally identifiable information (PII) from admin seeding logs to comply with privacy best practices.

**Changes:**
- Removed email address from admin seeding log statements in `index.js`
- Changed `logger.info({ email: defaultEmail }, '...')` to plain message for existing admin check
- Changed admin creation log to include `{ userId: newUser.id }` instead of `{ email: defaultEmail }`
- Now logs only non-PII identifiers (user ID) for audit purposes

**Impact:** Admin email addresses are no longer exposed in application logs, reducing PII exposure risk and improving compliance with privacy regulations (GDPR, etc.).

**Files Modified:**
- `index.js` - Updated admin seeding logging statements (lines 191, 204)

**Note:** Similar PII logging patterns were identified in other service files (OnboardingService, UserManagementService) that may benefit from the same treatment.

### Secure File Downloads Implementation (2025-10-25)
**Security hardening:** Removed public exposure of uploads directory and implemented authenticated, path-traversal-protected file downloads.

**Changes:**
- Removed `app.use('/uploads', express.static('uploads'))` from index.js (was line 88)
- Created new secure download endpoint at `/uploads/:filename`
- Implemented `authMiddleware` requirement - only authenticated admin users can download files
- Added comprehensive path traversal protection:
  - Filename normalization using `path.basename()`
  - Validation to block `..`, `/`, and `\` characters
  - Resolved path verification to ensure files stay within uploads directory
  - File type verification (ensures path points to actual file, not directory)
- Set security headers on all download responses:
  - `X-Content-Type-Options: nosniff` - prevents MIME-type sniffing
  - `X-Frame-Options: DENY` - prevents clickjacking
  - `Content-Disposition: attachment` - forces download instead of execution
- Supports both storage backends:
  - **Local development**: Files streamed from `uploads/` directory using `res.download()`
  - **Azure production**: Files streamed from Azure Blob Storage
- Added comprehensive logging for security auditing (user ID, email, filename)
- Error handling for missing files, invalid filenames, and download failures

**Impact:** Uploaded files are no longer publicly accessible. All downloads now require authentication and are logged for audit trails. Path traversal attacks are prevented through multiple validation layers. Files are forced to download (not execute) via security headers.

**Files Modified:**
- `index.js` - Removed static uploads middleware, added downloads route
- `src/routes/downloads.routes.js` - New secure download endpoint (created)

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