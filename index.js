require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('@neondatabase/serverless');
const msal = require('@azure/msal-node');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('./server/db');
const { formSubmissions, users, quoteSlipSubmissions, insurers, roofTypes, externalWallTypes, floorTypes, buildingTypes, adminUsers } = require('./shared/schema');
const { eq, desc, and, gt, ne } = require('drizzle-orm');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.set('trust proxy', 1);

const isDevelopment = !process.env.REPLIT_DEPLOYMENT;
const isSecure = !isDevelopment || !!process.env.REPLIT_DOMAINS;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: isSecure ? true : false,
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const azureConfigured = !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_SECRET);

let cca = null;

if (azureConfigured) {
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Info,
      }
    }
  };

  cca = new msal.ConfidentialClientApplication(msalConfig);
}

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
};

app.get('/letter-of-appointment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'letter-of-appointment.html'));
});

app.get('/quote-slip', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quote-slip.html'));
});

app.get('/api/insurers', async (req, res) => {
  try {
    const insurersList = await db.select().from(insurers).where(eq(insurers.isActive, true)).orderBy(insurers.displayOrder, insurers.name);
    res.json(insurersList);
  } catch (error) {
    console.error('Error fetching insurers:', error);
    res.status(500).json({ error: 'Failed to fetch insurers' });
  }
});

app.get('/api/roof-types', async (req, res) => {
  try {
    const types = await db.select().from(roofTypes).where(eq(roofTypes.isActive, true)).orderBy(roofTypes.displayOrder, roofTypes.name);
    res.json(types);
  } catch (error) {
    console.error('Error fetching roof types:', error);
    res.status(500).json({ error: 'Failed to fetch roof types' });
  }
});

app.get('/api/external-wall-types', async (req, res) => {
  try {
    const types = await db.select().from(externalWallTypes).where(eq(externalWallTypes.isActive, true)).orderBy(externalWallTypes.displayOrder, externalWallTypes.name);
    res.json(types);
  } catch (error) {
    console.error('Error fetching external wall types:', error);
    res.status(500).json({ error: 'Failed to fetch external wall types' });
  }
});

app.get('/api/floor-types', async (req, res) => {
  try {
    const types = await db.select().from(floorTypes).where(eq(floorTypes.isActive, true)).orderBy(floorTypes.displayOrder, floorTypes.name);
    res.json(types);
  } catch (error) {
    console.error('Error fetching floor types:', error);
    res.status(500).json({ error: 'Failed to fetch floor types' });
  }
});

app.get('/api/building-types', async (req, res) => {
  try {
    const types = await db.select().from(buildingTypes).where(eq(buildingTypes.isActive, true)).orderBy(buildingTypes.displayOrder, buildingTypes.name);
    res.json(types);
  } catch (error) {
    console.error('Error fetching building types:', error);
    res.status(500).json({ error: 'Failed to fetch building types' });
  }
});

const adminAuthMiddleware = async (req, res, next) => {
  if (!req.session.adminUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUser.id));
  if (!user || !user.isActive) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found or inactive' });
  }
  
  req.adminUser = user;
  next();
};

const adminPageMiddleware = async (req, res, next) => {
  if (!req.session.adminUser) {
    return res.redirect('/admin-login.html');
  }
  
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUser.id));
  if (!user || !user.isActive) {
    req.session.destroy();
    return res.redirect('/admin-login.html');
  }
  
  req.adminUser = user;
  next();
};

app.get('/', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/letter-of-appointment', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'letter-of-appointment.html'));
});

app.get('/admin/letter-of-appointment/:id', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'letter-of-appointment-detail.html'));
});

app.get('/admin/quote-slip', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'quote-slip.html'));
});

app.get('/admin/quote-slip/:id', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'quote-slip-detail.html'));
});

app.get('/admin/users', adminPageMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'users.html'));
});

app.get('/setup-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'setup-password.html'));
});

app.post('/api/admin/login', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;
    
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    await db.update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    
    req.session.adminUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/admin/check-session', async (req, res) => {
  if (!req.session.adminUser) {
    return res.json({ authenticated: false });
  }
  
  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUser.id));
    
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.json({ authenticated: false });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.json({ authenticated: false });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await db.select({
      id: adminUsers.id,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName,
      email: adminUsers.email,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt
    }).from(adminUsers).orderBy(desc(adminUsers.createdAt));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

function generateOnboardingToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generatePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function getSendGridClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }

  sgMail.setApiKey(connectionSettings.settings.api_key);
  return {
    client: sgMail,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function sendOnboardingEmail(email, firstName, lastName, onboardingToken, role) {
  let baseUrl;
  
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    baseUrl = `https://${domains[0]}`;
  } else if (process.env.REPL_SLUG) {
    baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  } else {
    baseUrl = 'http://localhost:5000';
  }
  
  const setupUrl = `${baseUrl}/setup-password?token=${onboardingToken}`;

  const emailContent = `
Welcome to Unlockt Forms Admin Portal

Hello ${firstName} ${lastName},

An administrator has created an account for you in the Unlockt Forms management system.

Your Account Details:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Role: ${role}

To activate your account and create a secure password, please click the link below or copy it into your browser:

${setupUrl}

Important Information:
- This activation link will expire in 24 hours
- You will be prompted to create a password that meets our security requirements
- Once activated, you can login to manage form submissions and user accounts

If you did not expect this account creation, please contact your administrator or ignore this email.

For assistance, contact your system administrator.

Best regards,
Unlockt Insurance Solutions
Form Management System

---
This is an automated message from Unlockt Forms. Please do not reply to this email.
  `.trim();

  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'Unlockt Forms'
      },
      subject: 'Complete Your Account Setup - Unlockt Forms',
      text: emailContent,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr style="background: linear-gradient(135deg, #5fa88a 0%, #4a8b6e 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Unlockt Forms</h1>
              <p style="margin: 5px 0 0 0; color: #e8f5f0; font-size: 14px;">Admin Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px;">Welcome to the Admin Portal</h2>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                Hello ${firstName} ${lastName},
              </p>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                An administrator has created an account for you in the Unlockt Forms management system.
              </p>
              <div style="background-color: #f8f9fa; border-left: 4px solid #5fa88a; padding: 15px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #333333; font-size: 14px; font-weight: 600;">Your Account Details:</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Role:</strong> ${role}</p>
              </div>
              <p style="margin: 20px 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                To activate your account and create a secure password, please click the button below:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" style="display: inline-block; background: linear-gradient(135deg, #5fa88a 0%, #4a8b6e 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">Activate Account</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 10px 0; color: #999999; font-size: 13px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px 0; color: #5fa88a; font-size: 13px; word-break: break-all;">
                ${setupUrl}
              </p>
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                  <strong>Important:</strong> This activation link will expire in 24 hours. You will be prompted to create a password that meets our security requirements.
                </p>
              </div>
              <p style="margin: 20px 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If you did not expect this account creation, please contact your administrator or ignore this email.
              </p>
            </td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                <strong>Unlockt Insurance Solutions</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">
                Form Management System
              </p>
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 11px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        }
      }
    };

    await client.send(msg);
    console.log(`✓ Onboarding email sent to ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    console.log('=== FALLBACK: EMAIL CONTENT ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Welcome to Unlockt Forms - Complete Your Account Setup`);
    console.log('---');
    console.log(emailContent);
    console.log('================================');
    return { success: false, message: 'Failed to send email, logged to console' };
  }
}

async function sendDeactivationEmail(email, firstName, lastName) {
  const textContent = `
Your Account Has Been Deactivated

Hello ${firstName} ${lastName},

Your Unlockt Forms admin account has been deactivated by an administrator.

Account Details:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Status: Inactive

What this means:
- You can no longer access the admin portal
- Your login credentials have been disabled
- If you believe this was done in error, please contact your administrator

If your account needs to be reactivated, an administrator will send you a new activation link.

For assistance, please contact your system administrator.

Best regards,
Unlockt Insurance Solutions
Form Management System

---
This is an automated message from Unlockt Forms. Please do not reply to this email.
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr style="background: linear-gradient(135deg, #5fa88a 0%, #4a8b6e 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Unlockt Forms</h1>
              <p style="margin: 5px 0 0 0; color: #e8f5f0; font-size: 14px;">Admin Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px;">Account Deactivated</h2>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                Hello ${firstName} ${lastName},
              </p>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                Your Unlockt Forms admin account has been deactivated by an administrator.
              </p>
              <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #333333; font-size: 14px; font-weight: 600;">Account Details:</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;"><strong>Status:</strong> Inactive</p>
              </div>
              <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 4px; padding: 12px 15px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24; font-size: 13px; line-height: 1.5;">
                  <strong>What this means:</strong><br>
                  • You can no longer access the admin portal<br>
                  • Your login credentials have been disabled<br>
                  • If you believe this was done in error, please contact your administrator
                </p>
              </div>
              <p style="margin: 20px 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If your account needs to be reactivated, an administrator will send you a new activation link.
              </p>
              <p style="margin: 20px 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                For assistance, please contact your system administrator.
              </p>
            </td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                <strong>Unlockt Insurance Solutions</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">
                Form Management System
              </p>
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 11px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'Unlockt Forms'
      },
      subject: 'Account Deactivated - Unlockt Forms',
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        }
      }
    };

    await client.send(msg);
    console.log(`✓ Deactivation email sent to ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending deactivation email:', error);
    console.log('=== FALLBACK: EMAIL CONTENT ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Account Deactivated - Unlockt Forms`);
    console.log('---');
    console.log(textContent);
    console.log('================================');
    return { success: false, message: 'Failed to send email, logged to console' };
  }
}

app.post('/api/admin/users', adminAuthMiddleware, [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['administrator', 'reviewer', 'read-only']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { firstName, lastName, role } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const existingEmail = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const onboardingToken = generateOnboardingToken();
    const tokenHash = crypto.createHash('sha256').update(onboardingToken).digest('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    const [newUser] = await db.insert(adminUsers).values({
      firstName,
      lastName,
      email,
      role,
      isActive: true,
      onboardingToken: tokenHash,
      onboardingTokenExpiry: tokenExpiry
    }).returning();

    await sendOnboardingEmail(email, firstName, lastName, onboardingToken, role);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role
      },
      message: 'Onboarding email sent successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', [
  adminAuthMiddleware,
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['administrator', 'reviewer', 'read-only']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = parseInt(req.params.id);
    const { firstName, lastName, role } = req.body;
    const email = req.body.email.toLowerCase().trim();
    
    const [existingUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [emailCheck] = await db.select().from(adminUsers).where(
      and(
        eq(adminUsers.email, email),
        ne(adminUsers.id, userId)
      )
    );
    if (emailCheck) {
      return res.status(400).json({ error: 'Email already in use by another user' });
    }

    await db.update(adminUsers)
      .set({ 
        firstName,
        lastName,
        email,
        role,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, userId));

    const [updatedUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/admin/users/:id/toggle', adminAuthMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = !user.isActive;

    if (newStatus) {
      const onboardingToken = generateOnboardingToken();
      const tokenHash = crypto.createHash('sha256').update(onboardingToken).digest('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      await db.update(adminUsers)
        .set({ 
          isActive: true,
          onboardingToken: tokenHash,
          onboardingTokenExpiry: tokenExpiry,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, userId));

      await sendOnboardingEmail(user.email, user.firstName, user.lastName, onboardingToken, user.role);
    } else {
      await db.update(adminUsers)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, userId));

      await sendDeactivationEmail(user.email, user.firstName, user.lastName);
    }

    res.json({ success: true, status: newStatus ? 'activated' : 'deactivated' });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

app.post('/api/verify-onboarding-token', [
  body('token').trim().notEmpty().withMessage('Token is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { token } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const [user] = await db.select().from(adminUsers).where(
      and(
        eq(adminUsers.onboardingToken, tokenHash),
        gt(adminUsers.onboardingTokenExpiry, new Date())
      )
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (user.passwordHash) {
      return res.status(400).json({ error: 'Account already activated' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

app.post('/api/complete-onboarding', [
  body('token').trim().notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('password').matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
  body('password').matches(/[a-z]/).withMessage('Password must contain a lowercase letter'),
  body('password').matches(/[0-9]/).withMessage('Password must contain a number'),
  body('password').matches(/[!@#$%^&*]/).withMessage('Password must contain a special character')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const [user] = await db.select().from(adminUsers).where(
      and(
        eq(adminUsers.onboardingToken, tokenHash),
        gt(adminUsers.onboardingTokenExpiry, new Date())
      )
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (user.passwordHash) {
      return res.status(400).json({ error: 'Account already activated. Please login instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.update(adminUsers)
      .set({
        passwordHash,
        onboardingToken: null,
        onboardingTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, user.id));

    console.log(`✓ User ${user.username} completed onboarding`);

    res.json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to setup password' });
  }
});

app.get('/auth/signin', (req, res) => {
  if (!azureConfigured || !cca) {
    return res.status(503).send('Azure AD authentication is not configured. Please set AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET environment variables.');
  }

  const redirectUri = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/redirect`;
  
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: redirectUri,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters)
    .then((response) => {
      res.redirect(response);
    })
    .catch((error) => {
      console.error('Auth error:', error);
      res.status(500).send('Authentication error. Please configure Azure AD credentials.');
    });
});

app.get('/auth/redirect', async (req, res) => {
  if (!azureConfigured || !cca) {
    return res.status(503).send('Azure AD authentication is not configured.');
  }

  const redirectUri = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/redirect`;
  
  const tokenRequest = {
    code: req.query.code,
    scopes: ['user.read'],
    redirectUri: redirectUri,
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    
    const [existingUser] = await db.select().from(users).where(eq(users.entraId, response.account.homeAccountId));
    
    if (!existingUser) {
      const [newUser] = await db.insert(users).values({
        entraId: response.account.homeAccountId,
        email: response.account.username,
        name: response.account.name || response.account.username
      }).returning();
      
      req.session.user = newUser;
    } else {
      req.session.user = existingUser;
    }
    
    res.redirect('/admin');
  } catch (error) {
    console.error('Token acquisition error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/auth/signout', (req, res) => {
  const logoutUri = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/logout?post_logout_redirect_uri=${process.env.POST_LOGOUT_REDIRECT_URI || `http://localhost:${PORT}`}`;
  
  req.session.destroy(() => {
    res.redirect(logoutUri);
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/submit-form', upload.fields([
  { name: 'commonSealFile', maxCount: 1 },
  { name: 'letterHeadFile', maxCount: 1 }
]), [
  body('strataManagement').trim().notEmpty().withMessage('Strata Management is required'),
  body('strataPlanNumber').trim().notEmpty().withMessage('Strata Plan Number is required'),
  body('confirmationCheckbox').equals('true').withMessage('Confirmation is required'),
  body('submissionDate').isDate().withMessage('Valid date is required'),
  body('signatureData').notEmpty().withMessage('Signature is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let signatureFilename = null;
    
    if (req.body.signatureData) {
      const base64Data = req.body.signatureData.replace(/^data:image\/png;base64,/, '');
      const timestamp = Date.now();
      const randomId = Math.round(Math.random() * 1E9);
      signatureFilename = `signature-${timestamp}-${randomId}.png`;
      const signaturePath = path.join('uploads', signatureFilename);
      
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      
      fs.writeFileSync(signaturePath, base64Data, 'base64');
    }

    const formData = {
      strataManagement: req.body.strataManagement,
      strataPlanNumber: req.body.strataPlanNumber,
      streetAddress: req.body.streetAddress || null,
      streetAddressLine2: req.body.streetAddressLine2 || null,
      city: req.body.city || null,
      state: req.body.state || null,
      postal: req.body.postal || null,
      questionCheckbox1: req.body.questionCheckbox1 === 'true',
      questionCheckbox2: req.body.questionCheckbox2 === 'true',
      questionCheckbox3: req.body.questionCheckbox3 === 'true',
      questionCheckbox4: req.body.questionCheckbox4 === 'true',
      questionCheckbox5: req.body.questionCheckbox5 === 'true',
      confirmationCheckbox: req.body.confirmationCheckbox === 'true',
      submissionDate: req.body.submissionDate,
      commonSealFile: req.files?.commonSealFile?.[0]?.filename || null,
      letterHeadFile: req.files?.letterHeadFile?.[0]?.filename || null,
      signatureFile: signatureFilename
    };

    const [submission] = await db.insert(formSubmissions).values(formData).returning();
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

app.post('/api/submit-quote-slip', upload.fields([
  { name: 'cocFile', maxCount: 1 },
  { name: 'defectsRelevantDocsFile', maxCount: 1 },
  { name: 'whsFile', maxCount: 1 },
  { name: 'claimsHistoryFile', maxCount: 1 },
  { name: 'strataPlansFile', maxCount: 1 },
  { name: 'asbestosReportFile', maxCount: 1 },
  { name: 'commercialTenantListFile', maxCount: 1 },
  { name: 'mostRecentValuationFile', maxCount: 1 },
  { name: 'preventativeMaintenanceProgramFile', maxCount: 1 }
]), [
  body('strataManagementName').trim().notEmpty().withMessage('Strata Management Name is required'),
  body('contactPerson').trim().notEmpty().withMessage('Contact Person is required'),
  body('strataPlanNumber').trim().notEmpty().withMessage('Strata Plan Number is required'),
  body('renewalDate').notEmpty().withMessage('Renewal Date is required'),
  body('signatureData').notEmpty().withMessage('Signature is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let signatureFilename = null;
    
    if (req.body.signatureData) {
      const base64Data = req.body.signatureData.replace(/^data:image\/png;base64,/, '');
      const timestamp = Date.now();
      const randomId = Math.round(Math.random() * 1E9);
      signatureFilename = `signature-${timestamp}-${randomId}.png`;
      const signaturePath = path.join('uploads', signatureFilename);
      
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      
      fs.writeFileSync(signaturePath, base64Data, 'base64');
    }

    const formData = {
      strataManagementName: req.body.strataManagementName,
      contactPerson: req.body.contactPerson,
      strataPlanNumber: req.body.strataPlanNumber,
      currentCocFile: req.files?.cocFile?.[0]?.filename || null,
      address: req.body.address || null,
      streetAddressLine2: req.body.streetAddressLine2 || null,
      city: req.body.city || null,
      state: req.body.state || null,
      postal: req.body.postal || null,
      renewalDate: req.body.renewalDate,
      currentInsurer: req.body.currentInsurer || null,
      currentBuildingSumInsured: req.body.currentBuildingSumInsured || null,
      requestedSumInsured: req.body.requestedSumInsured || null,
      roofType: req.body.roofType || null,
      externalWallType: req.body.externalWallType || null,
      floorType: req.body.floorType || null,
      buildingType: req.body.buildingType || null,
      yearBuilt: req.body.yearBuilt || null,
      numberOfLots: req.body.numberOfLots || null,
      numberOfFloors: req.body.numberOfFloors || null,
      facilityPoolsSpas: req.body.facilityPoolsSpas === 'on',
      facilityJetty: req.body.facilityJetty === 'on',
      facilityFireSafetySystems: req.body.facilityFireSafetySystems === 'on',
      facilityPlayground: req.body.facilityPlayground === 'on',
      facilityLake: req.body.facilityLake === 'on',
      facilitySprinklers: req.body.facilitySprinklers === 'on',
      facilityGym: req.body.facilityGym === 'on',
      facilityWaterFeature: req.body.facilityWaterFeature === 'on',
      facilityEvCharges: req.body.facilityEvCharges === 'on',
      facilityTennisCourt: req.body.facilityTennisCourt === 'on',
      facilityCarStacker: req.body.facilityCarStacker === 'on',
      requiredCoverFlood: req.body.requiredCoverFlood === 'on',
      discloseInsuranceDeclined: req.body.discloseInsuranceDeclined === 'on',
      discloseAsbestosPresent: req.body.discloseAsbestosPresent === 'on',
      discloseHeritageListed: req.body.discloseHeritageListed === 'on',
      numberOfLifts: req.body.numberOfLifts || null,
      acpEpsPresent: req.body.acpEpsPresent || null,
      acpEpsName: req.body.acpEpsName || null,
      currentStandardExcess: req.body.currentStandardExcess || null,
      coverOfficeBearers: req.body.coverOfficeBearers === 'on',
      coverMachineryBreakdown: req.body.coverMachineryBreakdown === 'on',
      coverCatastrophe: req.body.coverCatastrophe === 'on',
      coverOfficeBearersValue: req.body.coverOfficeBearersValue || null,
      coverMachineryBreakdownValue: req.body.coverMachineryBreakdownValue || null,
      coverCatastropheValue: req.body.coverCatastropheValue || null,
      defectsAffectingProperty: req.body.defectsAffectingProperty || null,
      afssCurrent: req.body.afssCurrent || null,
      residentialLessThan20Commercial: req.body.residentialLessThan20Commercial || null,
      majorWorksOver500k: req.body.majorWorksOver500k || null,
      defectsRelevantDocsFile: req.files?.defectsRelevantDocsFile?.[0]?.filename || null,
      whsFile: req.files?.whsFile?.[0]?.filename || null,
      claimsHistoryFile: req.files?.claimsHistoryFile?.[0]?.filename || null,
      strataPlansFile: req.files?.strataPlansFile?.[0]?.filename || null,
      asbestosReportFile: req.files?.asbestosReportFile?.[0]?.filename || null,
      commercialTenantListFile: req.files?.commercialTenantListFile?.[0]?.filename || null,
      mostRecentValuationFile: req.files?.mostRecentValuationFile?.[0]?.filename || null,
      preventativeMaintenanceProgramFile: req.files?.preventativeMaintenanceProgramFile?.[0]?.filename || null,
      declarationAuthorised: req.body.declarationAuthorised === 'on',
      declarationAppointUnlockt: req.body.declarationAppointUnlockt === 'on',
      declarationAccurateInfo: req.body.declarationAccurateInfo === 'on',
      declarationStrataManager: req.body.declarationStrataManager === 'on',
      declarationTrueAnswers: req.body.declarationTrueAnswers === 'on',
      declarationFullName: req.body.declarationFullName || null,
      declarationPosition: req.body.declarationPosition || null,
      confirmDisclosures: req.body.confirmDisclosures || null,
      signatureFile: signatureFilename
    };

    const [submission] = await db.insert(quoteSlipSubmissions).values(formData).returning();
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Quote slip submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

app.get('/api/admin/letter-of-appointment/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allSubmissions = await db.select().from(formSubmissions);
    
    const stats = {
      total: allSubmissions.length,
      today: allSubmissions.filter(s => new Date(s.submittedAt) >= today).length,
      thisWeek: allSubmissions.filter(s => new Date(s.submittedAt) >= weekAgo).length,
      thisMonth: allSubmissions.filter(s => new Date(s.submittedAt) >= monthAgo).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching LOA stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/admin/quote-slip/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allSubmissions = await db.select().from(quoteSlipSubmissions);
    
    const stats = {
      total: allSubmissions.length,
      today: allSubmissions.filter(s => new Date(s.submittedAt) >= today).length,
      thisWeek: allSubmissions.filter(s => new Date(s.submittedAt) >= weekAgo).length,
      thisMonth: allSubmissions.filter(s => new Date(s.submittedAt) >= monthAgo).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching quote slip stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/submissions', adminAuthMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.submittedAt));
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.get('/api/submissions/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const [submission] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, parseInt(req.params.id)));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

app.get('/api/quote-slip-submissions', adminAuthMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(quoteSlipSubmissions).orderBy(desc(quoteSlipSubmissions.submittedAt));
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching quote slip submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.get('/api/quote-slip-submissions/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const [submission] = await db.select().from(quoteSlipSubmissions).where(eq(quoteSlipSubmissions.id, parseInt(req.params.id)));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error fetching quote slip submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

app.get('/api/export/pdf/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const [submission] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, parseInt(req.params.id)));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=unlockt-submission-${submission.id}.pdf`);
    
    doc.pipe(res);
    
    const brandGreen = '#5fa88a';
    const darkGreen = '#4a8b6e';
    const lightGray = '#f5f5f5';
    const darkGray = '#333333';
    const mediumGray = '#666666';
    
    doc.rect(0, 0, doc.page.width, 120).fill(brandGreen);
    
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('Letter of Appointment', 50, 35, { align: 'left' });
    
    doc.fillColor('white')
       .fontSize(10)
       .font('Helvetica')
       .text('Unlockt Insurance Solutions', 50, 75, { align: 'left' });
    
    doc.fontSize(8)
       .fillColor('rgba(255, 255, 255, 0.9)')
       .text('ABN 75 684 319 784 | ASIC AR No. 1316562', 50, 90, { align: 'left', width: 500 });
    
    let y = 150;
    
    doc.rect(50, y, doc.page.width - 100, 40).fill(lightGray);
    doc.fillColor(darkGray)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`Submission ID: #${submission.id}`, 65, y + 12);
    doc.fillColor(mediumGray)
       .fontSize(9)
       .font('Helvetica')
       .text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, 65, y + 27);
    
    y += 60;
    
    const addSection = (title, y) => {
      doc.fillColor(brandGreen)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(title, 50, y);
      doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor(brandGreen).lineWidth(2).stroke();
      return y + 30;
    };
    
    const addField = (label, value, y) => {
      doc.fillColor(mediumGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(label, 50, y);
      doc.fillColor(darkGray)
         .fontSize(10)
         .font('Helvetica')
         .text(value || 'N/A', 50, y + 15, { width: doc.page.width - 100 });
      return y + 38;
    };
    
    y = addSection('Strata Information', y);
    y = addField('Strata Management', submission.strataManagement, y);
    y = addField('Strata Plan Number', submission.strataPlanNumber, y);
    
    y = addSection('Property Address', y);
    const addressLines = [
      submission.streetAddress,
      submission.streetAddressLine2,
      `${submission.city || ''}, ${submission.state || ''} ${submission.postal || ''}`
    ].filter(line => line && line.trim() !== ', ').join('\n');
    y = addField('Address', addressLines, y);
    
    y = addSection('Contact Information', y);
    y = addField('Contact Person', submission.contactPerson, y);
    y = addField('Email', submission.email, y);
    y = addField('Phone', submission.phone, y);
    
    y = addSection('Appointment Questions', y);
    doc.fillColor(darkGray).fontSize(10).font('Helvetica');
    
    const questions = [
      { q: '1. Representatives appointed to negotiate and arrange contracts', a: submission.questionCheckbox1 },
      { q: '2. Seek insurance quotations on behalf of Owner\'s Corporation', a: submission.questionCheckbox2 },
      { q: '3. Unlockt will not bind insurance cover', a: submission.questionCheckbox3 },
      { q: '4. Authorised to provide general financial services advice', a: submission.questionCheckbox4 },
      { q: '5. Confirm appointment and arrangement in writing', a: submission.questionCheckbox5 }
    ];
    
    questions.forEach(item => {
      doc.fillColor(mediumGray).fontSize(9).text(item.q, 50, y, { continued: true });
      doc.fillColor(item.a ? brandGreen : '#999999')
         .font('Helvetica-Bold')
         .text(`  ${item.a ? '✓ Yes' : '✗ No'}`, { align: 'left' });
      y += 20;
    });
    
    y += 10;
    y = addSection('Declaration', y);
    y = addField('Owners Corporation Informed', submission.confirmationCheckbox ? 'Yes' : 'No', y);
    y = addField('Submission Date', submission.submissionDate || 'N/A', y);
    
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(lightGray);
    doc.fillColor(mediumGray)
       .fontSize(8)
       .font('Helvetica')
       .text('Authorised representatives of Resilium Insurance Broking Pty Ltd ABN 92 169 975 973 AFSL No. 480382', 
             50, doc.page.height - 25, { align: 'center', width: doc.page.width - 100 });
    
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.get('/api/export/letter-of-appointment', adminAuthMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.submittedAt));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Letter of Appointment');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Strata Management', key: 'strataManagement', width: 30 },
      { header: 'Strata Plan Number', key: 'strataPlanNumber', width: 20 },
      { header: 'Street Address', key: 'streetAddress', width: 30 },
      { header: 'Street Address Line 2', key: 'streetAddressLine2', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal', key: 'postal', width: 10 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Q1: Representatives', key: 'questionCheckbox1', width: 15 },
      { header: 'Q2: Quotations', key: 'questionCheckbox2', width: 15 },
      { header: 'Q3: Not Bind Cover', key: 'questionCheckbox3', width: 15 },
      { header: 'Q4: Financial Services', key: 'questionCheckbox4', width: 20 },
      { header: 'Q5: Strata Manager Advice', key: 'questionCheckbox5', width: 20 },
      { header: 'Confirmation', key: 'confirmationCheckbox', width: 15 },
      { header: 'Submission Date', key: 'submissionDate', width: 15 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    
    submissions.forEach(sub => {
      worksheet.addRow({
        id: sub.id,
        strataManagement: sub.strataManagement,
        strataPlanNumber: sub.strataPlanNumber,
        streetAddress: sub.streetAddress,
        streetAddressLine2: sub.streetAddressLine2,
        city: sub.city,
        state: sub.state,
        postal: sub.postal,
        contactPerson: sub.contactPerson,
        email: sub.email,
        phone: sub.phone,
        questionCheckbox1: sub.questionCheckbox1 ? 'Yes' : 'No',
        questionCheckbox2: sub.questionCheckbox2 ? 'Yes' : 'No',
        questionCheckbox3: sub.questionCheckbox3 ? 'Yes' : 'No',
        questionCheckbox4: sub.questionCheckbox4 ? 'Yes' : 'No',
        questionCheckbox5: sub.questionCheckbox5 ? 'Yes' : 'No',
        confirmationCheckbox: sub.confirmationCheckbox ? 'Yes' : 'No',
        submissionDate: sub.submissionDate,
        submittedAt: new Date(sub.submittedAt).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=letter-of-appointment-submissions.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('XLSX generation error:', error);
    res.status(500).json({ error: 'Failed to generate XLSX' });
  }
});

app.get('/api/export/quote-slip', adminAuthMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(quoteSlipSubmissions).orderBy(desc(quoteSlipSubmissions.submittedAt));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quote Slip');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Strata Management Name', key: 'strataManagementName', width: 30 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Strata Plan Number', key: 'strataPlanNumber', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal', key: 'postal', width: 10 },
      { header: 'Renewal Date', key: 'renewalDate', width: 15 },
      { header: 'Current Insurer', key: 'currentInsurer', width: 25 },
      { header: 'Current Building Sum Insured', key: 'currentBuildingSumInsured', width: 25 },
      { header: 'Requested Sum Insured', key: 'requestedSumInsured', width: 25 },
      { header: 'Roof Type', key: 'roofType', width: 20 },
      { header: 'External Wall Type', key: 'externalWallType', width: 20 },
      { header: 'Floor Type', key: 'floorType', width: 20 },
      { header: 'Building Type', key: 'buildingType', width: 20 },
      { header: 'Year Built', key: 'yearBuilt', width: 12 },
      { header: 'Number of Lots', key: 'numberOfLots', width: 15 },
      { header: 'Number of Floors', key: 'numberOfFloors', width: 15 },
      { header: 'Number of Lifts', key: 'numberOfLifts', width: 15 },
      { header: 'ACP/EPS Present', key: 'acpEpsPresent', width: 15 },
      { header: 'Current Standard Excess', key: 'currentStandardExcess', width: 20 },
      { header: 'Flood Cover Required', key: 'requiredCoverFlood', width: 15 },
      { header: 'Insurance Declined', key: 'discloseInsuranceDeclined', width: 15 },
      { header: 'Asbestos Present', key: 'discloseAsbestosPresent', width: 15 },
      { header: 'Heritage Listed', key: 'discloseHeritageListed', width: 15 },
      { header: 'Defects Affecting Property', key: 'defectsAffectingProperty', width: 25 },
      { header: 'AFSS Current', key: 'afssCurrent', width: 15 },
      { header: 'Declaration Full Name', key: 'declarationFullName', width: 25 },
      { header: 'Declaration Position', key: 'declarationPosition', width: 25 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    
    submissions.forEach(sub => {
      worksheet.addRow({
        id: sub.id,
        strataManagementName: sub.strataManagementName,
        contactPerson: sub.contactPerson,
        strataPlanNumber: sub.strataPlanNumber,
        address: sub.address,
        city: sub.city,
        state: sub.state,
        postal: sub.postal,
        renewalDate: sub.renewalDate,
        currentInsurer: sub.currentInsurer,
        currentBuildingSumInsured: sub.currentBuildingSumInsured,
        requestedSumInsured: sub.requestedSumInsured,
        roofType: sub.roofType,
        externalWallType: sub.externalWallType,
        floorType: sub.floorType,
        buildingType: sub.buildingType,
        yearBuilt: sub.yearBuilt,
        numberOfLots: sub.numberOfLots,
        numberOfFloors: sub.numberOfFloors,
        numberOfLifts: sub.numberOfLifts,
        acpEpsPresent: sub.acpEpsPresent,
        currentStandardExcess: sub.currentStandardExcess,
        requiredCoverFlood: sub.requiredCoverFlood ? 'Yes' : 'No',
        discloseInsuranceDeclined: sub.discloseInsuranceDeclined ? 'Yes' : 'No',
        discloseAsbestosPresent: sub.discloseAsbestosPresent ? 'Yes' : 'No',
        discloseHeritageListed: sub.discloseHeritageListed ? 'Yes' : 'No',
        defectsAffectingProperty: sub.defectsAffectingProperty,
        afssCurrent: sub.afssCurrent,
        declarationFullName: sub.declarationFullName,
        declarationPosition: sub.declarationPosition,
        submittedAt: new Date(sub.submittedAt).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=quote-slip-submissions.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('XLSX generation error:', error);
    res.status(500).json({ error: 'Failed to generate XLSX' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Public form: /');
  console.log('Admin dashboard: /admin');
  
  if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_TENANT_ID) {
    console.warn('\n⚠️  WARNING: Azure AD credentials not configured!');
    console.warn('Set AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET environment variables.');
  }
});
