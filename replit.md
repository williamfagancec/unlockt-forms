# Unlockt Insurance Form Application

## Project Overview

This is a secure form collection system for Unlockt Insurance Solutions that features:
- **Public form submission** - No authentication required for Letter of Appointment and Quote Slip & Declaration forms
- **Local admin authentication** - Username/password based admin portal (MS Entra ID SSO postponed for future implementation)
- **Comprehensive admin dashboard** - View and manage all form submissions with statistics
- **Export capabilities** - XLSX export for bulk data analysis
- **Azure-ready deployment** - Configured for Azure App Service with future MS Fabric integration planned

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon-backed on Replit, Azure Database for PostgreSQL in production)
- **Authentication**: Email/password with bcrypt hashing (case-insensitive email matching)
- **ORM**: Drizzle ORM
- **Session Management**: Express Session with PostgreSQL session store (connect-pg-simple)
- **Export Libraries**: PDFKit (PDF), ExcelJS (XLSX)
- **File Uploads**: Multer for document handling
- **Signature Capture**: SignaturePad for digital signatures

## Project Structure

```
/
├── index.js                      # Main Express server
├── server/
│   └── db.js                    # Database connection
├── shared/
│   └── schema.js                # Drizzle ORM schema (all tables)
├── public/
│   ├── index.html               # Landing page
│   ├── letter-of-appointment.html   # Letter of Appointment form
│   ├── quote-slip.html          # Quote Slip & Declaration form
│   ├── admin-login.html         # Admin login page
│   ├── admin.html               # Admin dashboard
│   └── admin/
│       ├── letter-of-appointment.html       # LOA submissions list
│       ├── letter-of-appointment-detail.html # LOA detail view
│       ├── quote-slip.html      # Quote Slip submissions list
│       └── quote-slip-detail.html # Quote Slip detail view
├── scripts/
│   └── create-admin.js          # Script to create admin users
├── uploads/                     # Uploaded files and signatures
├── drizzle.config.ts            # Drizzle configuration
└── package.json                 # Dependencies
```

## Recent Changes

**Date: October 4, 2025**
- **CRITICAL FIX**: Set `trust proxy: true` to trust Replit's multi-layer proxy chain - this allows Express to mark requests as secure and send session cookies in published deployments
- **CRITICAL FIX**: Implemented PostgreSQL-backed session store (connect-pg-simple) to replace MemoryStore - sessions now persist in published deployments
- Fixed session authentication for published apps (sameSite: 'none' for iframe compatibility, credentials: 'include' on all fetch requests)
- Migrated authentication from username to email-based login with case-insensitive email handling
- Replaced username field with firstName/lastName across entire application
- Added user editing functionality (edit firstName, lastName, email, role - passwords excluded)
- Implemented magic link onboarding system with SHA-256 token hashing and 24-hour expiry
- Enhanced email deliverability with professional HTML templates and SendGrid integration
- Updated UI: smaller action buttons in horizontal layout
- Fixed email normalization: all emails are lowercased before storage and lookup to prevent case-sensitivity issues

**Date: October 3, 2025**
- Implemented local username/password authentication for admin portal
- Created adminUsers database table with role-based access (administrator/reviewer/read-only)
- Built comprehensive admin dashboard with statistics for both form types
- Created submission list views for Letter of Appointment and Quote Slip forms
- Added detailed submission view pages with all fields displayed
- Implemented XLSX export for both form types
- Added Quote Slip & Declaration form with 8 document upload widgets
- Integrated SignaturePad library for digital signature capture
- Set up admin user creation script with bcrypt password hashing

**Previous Updates (October 2, 2025)**
- Created PostgreSQL database with Drizzle ORM
- Built public-facing Letter of Appointment form
- Built Quote Slip & Declaration form
- Added database-driven dropdowns (insurers, roof types, wall types, floor types, building types)
- Configured Azure deployment structure

## Key Features

### 1. Public Form Submission
Both forms are publicly accessible without authentication:

**Letter of Appointment**
- Strata management and property information
- 5 appointment questions with checkboxes
- Contact information
- Digital signature with SignaturePad
- File upload for common seal and letterhead

**Quote Slip & Declaration**
- Comprehensive building and insurance information
- Database-driven dropdown selections
- 8 document upload widgets in 2-column grid layout
- Facilities checkboxes (pools, gym, EV chargers, etc.)
- Cover options (office bearers, machinery breakdown, catastrophe)
- Disclosure questions
- Digital signature and declaration section
- Drag-and-drop file upload functionality

### 2. Admin Authentication
- Local email/password authentication (case-insensitive)
- Password hashing with bcrypt (12 salt rounds)
- Role-based access control (administrator, reviewer, read-only)
- PostgreSQL-backed session store for persistence in production deployments
- Session-based authentication with httpOnly cookies
- Active/inactive user management
- Last login tracking
- Magic link onboarding for new admin users

**Default Admin Credentials:**
- Email: `admin@unlockt.com` (case-insensitive)
- Password: `Admin@123456`
- Role: `administrator`

### 3. Admin Dashboard
- Overview of all submissions across both form types
- Real-time statistics:
  - Total submissions (combined)
  - Today's submissions
  - This week's submissions
  - This month's submissions
- Form-specific statistics for each type
- Navigation to submission lists
- Export buttons for XLSX downloads

### 4. Submission Management
**List Views:**
- Searchable table of all submissions
- Filter by strata plan, management name, address, etc.
- Click to view detailed submission

**Detail Views:**
- Complete display of all form fields
- Formatted display of checkboxes, dates, and currency
- Links to view uploaded documents
- Download PDF for Letter of Appointment submissions

### 5. Data Export
- **XLSX Export**: Comprehensive spreadsheet export for both form types
  - All form fields included
  - Boolean values converted to Yes/No
  - Formatted for data analysis

### 6. Security
- Bcrypt password hashing (12 rounds)
- Session management with httpOnly cookies
- Input validation and sanitization
- Prepared statements (SQL injection protection via ORM)
- Admin authentication required for all admin routes
- Secure file upload handling

## Database Schema

### adminUsers Table
- `id`: Serial primary key
- `username`: Unique username for login
- `email`: User email address
- `passwordHash`: Bcrypt hashed password
- `role`: administrator, reviewer, or read-only
- `isActive`: Boolean flag for account status
- `createdAt`: Account creation timestamp
- `lastLoginAt`: Last login timestamp

### formSubmissions Table (Letter of Appointment)
- All Letter of Appointment form fields
- Contact information
- 5 appointment question checkboxes
- Signature and document files
- Submission timestamp

### quoteSlipSubmissions Table (Quote Slip & Declaration)
- Strata and building information
- Insurance details (current insurer, sum insured, renewal date)
- Building characteristics (roof, walls, floors, type, year built)
- Facilities checkboxes (11 types)
- Cover options with values
- Disclosure questions
- 8 document upload fields
- Declaration checkboxes and signature
- Submission timestamp

### Dropdown Data Tables
- `insurers`: Insurance company names
- `roofTypes`: Building roof types
- `externalWallTypes`: External wall materials
- `floorTypes`: Floor construction types
- `buildingTypes`: Building classifications

All dropdown tables include:
- `name`, `displayOrder`, `isActive` fields for easy management

## Admin User Management

### Creating Admin Users
Use the admin creation script:
```bash
node scripts/create-admin.js [username] [password] [email] [role]
```

Example:
```bash
node scripts/create-admin.js reviewer Pass@123 reviewer@unlockt.com reviewer
```

### Roles
- **administrator**: Full access (view, export, user management)
- **reviewer**: View and export submissions (future implementation)
- **read-only**: View submissions only (future implementation)

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/check-session` - Check authentication status
- `POST /api/admin/logout` - Admin logout

### Statistics
- `GET /api/admin/letter-of-appointment/stats` - LOA statistics
- `GET /api/admin/quote-slip/stats` - Quote Slip statistics

### Submissions
- `GET /api/submissions` - List all Letter of Appointment submissions
- `GET /api/submissions/:id` - Get specific LOA submission
- `GET /api/quote-slip-submissions` - List all Quote Slip submissions
- `GET /api/quote-slip-submissions/:id` - Get specific Quote Slip submission

### Exports
- `GET /api/export/letter-of-appointment` - Export LOA submissions to XLSX
- `GET /api/export/quote-slip` - Export Quote Slip submissions to XLSX
- `GET /api/export/pdf/:id` - Export individual LOA submission as PDF

### Dropdowns
- `GET /api/insurers` - Get active insurers
- `GET /api/roof-types` - Get active roof types
- `GET /api/external-wall-types` - Get active wall types
- `GET /api/floor-types` - Get active floor types
- `GET /api/building-types` - Get active building types

## Running Locally

1. Database is already configured (Replit PostgreSQL)
2. Install dependencies: `npm install`
3. Run server: `npm start`
4. Access forms:
   - Landing: `http://localhost:5000/`
   - Letter of Appointment: `http://localhost:5000/letter-of-appointment`
   - Quote Slip: `http://localhost:5000/quote-slip`
5. Access admin portal: `http://localhost:5000/admin-login.html`
   - Login with: `admin` / `Admin@123456`

## Future Enhancements

### Planned Features
1. **MS Entra ID SSO Integration** - Replace local authentication
2. **Microsoft Fabric Data Lake** - Export submissions for analytics
3. **Role-based permissions** - Implement reviewer and read-only access levels
4. **Email notifications** - Notify admins of new submissions
5. **Submission status tracking** - Mark submissions as reviewed/processed
6. **Advanced filtering** - Filter submissions by date range, status, etc.
7. **Bulk actions** - Select multiple submissions for bulk export/deletion
8. **User management UI** - Admin interface to create/manage admin users

## User Preferences

- **Authentication**: Local username/password (MS Entra ID SSO for future implementation)
- **Deployment**: Azure App Service (VM mode for stateful sessions)
- **Database**: PostgreSQL (Azure Database for PostgreSQL in production)
- **Export formats**: XLSX (bulk), PDF (individual - LOA only)
- **Design**: Green gradient theme matching Unlockt brand

## Notes

- Form submissions are public (anyone can submit)
- Only authenticated admin users can view submissions
- Uploaded files stored in `/uploads` directory
- Signatures stored as PNG images
- All admin routes protected with authentication middleware
- Session expires after 24 hours of inactivity
- Password changes should be implemented after first login
- Application designed for Azure deployment with Key Vault integration
