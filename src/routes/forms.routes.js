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
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]);

  router.post('/submit-form', letterOfAppointmentFields, formController.submitLetterOfAppointment);
  router.post('/submit-quote-slip', quoteSlipFields, formController.submitQuoteSlip);

  return router;
}

module.exports = createFormsRoutes;
