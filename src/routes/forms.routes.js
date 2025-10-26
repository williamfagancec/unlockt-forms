const express = require('express');
const FormSubmissionController = require('../controllers/FormSubmissionController');
const { upload } = require('../infrastructure/storage');

function createFormsRoutes(logger) {
  const router = express.Router();
  
  const formController = new FormSubmissionController(logger);

  const letterOfAppointmentFields = upload.fields([
    { name: 'commonSealFile', maxCount: 1 },
    { name: 'letterHeadFile', maxCount: 1 }
  ]);

  const quoteSlipFields = upload.fields([
    { name: 'cocFile', maxCount: 1 },
    { name: 'claimsHistoryFile', maxCount: 1 },
    { name: 'whsFile', maxCount: 1 },
    { name: 'strataPlansFile', maxCount: 1 },
    { name: 'asbestosReportFile', maxCount: 1 },
    { name: 'commercialTenantListFile', maxCount: 1 },
    { name: 'mostRecentValuationFile', maxCount: 1 },
    { name: 'preventativeMaintenanceProgramFile', maxCount: 1 },
    { name: 'defectsRelevantDocsFile', maxCount: 1 },
    { name: 'signatureData', maxCount: 1 }
  ]);

  router.post('/submit-form', letterOfAppointmentFields, formController.submitLetterOfAppointment);
  router.post('/submit-quote-slip', quoteSlipFields, formController.submitQuoteSlip);

  return router;
}

module.exports = createFormsRoutes;
