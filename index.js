require('dotenv').config();
const express = require('express');
const session = require('express-session');
const msal = require('@azure/msal-node');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { db } = require('./server/db');
const { formSubmissions, users } = require('./shared/schema');
const { eq, desc } = require('drizzle-orm');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

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

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
  body('submissionDate').isDate().withMessage('Valid date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
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
      confirmationCheckbox: req.body.confirmationCheckbox === 'true',
      submissionDate: req.body.submissionDate,
      commonSealFile: req.files?.commonSealFile?.[0]?.filename || null,
      letterHeadFile: req.files?.letterHeadFile?.[0]?.filename || null
    };

    const [submission] = await db.insert(formSubmissions).values(formData).returning();
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

app.get('/api/submissions', authMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.submittedAt));
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.get('/api/submissions/:id', authMiddleware, async (req, res) => {
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

app.get('/api/export/pdf/:id', authMiddleware, async (req, res) => {
  try {
    const [submission] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, parseInt(req.params.id)));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=unlockt-submission-${submission.id}.pdf`);
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Unlockt Letter of Appointment', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('Issued by: Unlockt Insurance Solutions Pty Ltd | ABN 75 684 319 784 | ASIC Authorised Representative No. 1316562', { align: 'center' });
    doc.text('Authorised representatives of | Resilium Insurance Broking Pty Ltd ABN 92 169 975 973 AFSL No. 480382', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(12).text(`Submission ID: ${submission.id}`, { underline: true });
    doc.moveDown();
    
    doc.fontSize(11).text('Strata Management:', { bold: true });
    doc.fontSize(10).text(submission.strataManagement || 'N/A');
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Strata Plan Number:', { bold: true });
    doc.fontSize(10).text(submission.strataPlanNumber || 'N/A');
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Address:', { bold: true });
    doc.fontSize(10).text(`${submission.streetAddress || ''}`);
    if (submission.streetAddressLine2) {
      doc.text(submission.streetAddressLine2);
    }
    doc.text(`${submission.city || ''}, ${submission.state || ''} ${submission.postal || ''}`);
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Appointment Questions:', { bold: true });
    doc.fontSize(10).text(`1. Representatives appointed: ${submission.questionCheckbox1 ? 'Yes' : 'No'}`);
    doc.text(`2. Seek insurance quotations: ${submission.questionCheckbox2 ? 'Yes' : 'No'}`);
    doc.text(`3. Unlockt will not bind cover: ${submission.questionCheckbox3 ? 'Yes' : 'No'}`);
    doc.text(`4. Financial services authorization: ${submission.questionCheckbox4 ? 'Yes' : 'No'}`);
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Confirmation:', { bold: true });
    doc.fontSize(10).text(`Owners Corporation informed: ${submission.confirmationCheckbox ? 'Yes' : 'No'}`);
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Date:', { bold: true });
    doc.fontSize(10).text(submission.submissionDate || 'N/A');
    doc.moveDown(0.5);
    
    doc.fontSize(11).text('Submitted:', { bold: true });
    doc.fontSize(10).text(new Date(submission.submittedAt).toLocaleString());
    
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.get('/api/export/xlsx', authMiddleware, async (req, res) => {
  try {
    const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.submittedAt));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Form Submissions');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Strata Management', key: 'strataManagement', width: 30 },
      { header: 'Strata Plan Number', key: 'strataPlanNumber', width: 20 },
      { header: 'Street Address', key: 'streetAddress', width: 30 },
      { header: 'Street Address Line 2', key: 'streetAddressLine2', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal', key: 'postal', width: 10 },
      { header: 'Q1: Representatives', key: 'questionCheckbox1', width: 15 },
      { header: 'Q2: Quotations', key: 'questionCheckbox2', width: 15 },
      { header: 'Q3: Not Bind Cover', key: 'questionCheckbox3', width: 15 },
      { header: 'Q4: Financial Services', key: 'questionCheckbox4', width: 20 },
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
        questionCheckbox1: sub.questionCheckbox1 ? 'Yes' : 'No',
        questionCheckbox2: sub.questionCheckbox2 ? 'Yes' : 'No',
        questionCheckbox3: sub.questionCheckbox3 ? 'Yes' : 'No',
        questionCheckbox4: sub.questionCheckbox4 ? 'Yes' : 'No',
        confirmationCheckbox: sub.confirmationCheckbox ? 'Yes' : 'No',
        submissionDate: sub.submissionDate,
        submittedAt: new Date(sub.submittedAt).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=unlockt-submissions.xlsx');
    
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
