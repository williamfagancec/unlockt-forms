const FormSubmissionService = require('../services/FormSubmissionService');
const { asyncHandler } = require('../middleware/errorHandler');

class FormSubmissionController {
  constructor(logger) {
    this.formService = new FormSubmissionService(logger);
    this.logger = logger;
  }

  submitLetterOfAppointment = asyncHandler(async (req, res) => {
    const submission = await this.formService.submitLetterOfAppointment(req.body, req.files);
    res.json({
      success: true,
      submissionId: submission.id,
      message: 'Form submitted successfully'
    });
  });

  submitQuoteSlip = asyncHandler(async (req, res) => {
    const submission = await this.formService.submitQuoteSlip(req.body, req.files);
    res.json({
      success: true,
      submissionId: submission.id,
      message: 'Quote slip submitted successfully'
    });
  });
}

module.exports = FormSubmissionController;
