const express = require('express');
const FormSubmissionController = require('../controllers/FormSubmissionController');
const { upload } = require('../infrastructure/storage');

function createFormsRoutes(logger) {
  const router = express.Router();
  
  const formController = new FormSubmissionController(logger);

  const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]);

  router.post('/submit-form', uploadFields, formController.submitLetterOfAppointment);
  router.post('/submit-quote-slip', uploadFields, formController.submitQuoteSlip);

  return router;
}

module.exports = createFormsRoutes;
