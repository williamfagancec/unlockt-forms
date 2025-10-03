require('dotenv').config();
const express = require('express');
const session = require('express-session');
const msal = require('@azure/msal-node');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { db } = require('./server/db');
const { formSubmissions, users, quoteSlipSubmissions, insurers, roofTypes, externalWallTypes, floorTypes, buildingTypes } = require('./shared/schema');
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

app.get('/letter-of-appointment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'letter-of-appointment.html'));
});

app.get('/quote-slip', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quote-slip.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
  body('renewalDate').notEmpty().withMessage('Renewal Date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
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
      preventativeMaintenanceProgramFile: req.files?.preventativeMaintenanceProgramFile?.[0]?.filename || null
    };

    const [submission] = await db.insert(quoteSlipSubmissions).values(formData).returning();
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Quote slip submission error:', error);
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
    doc.text(`5. Strata Manager insurance advice confirmation: ${submission.questionCheckbox5 ? 'Yes' : 'No'}`);
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
