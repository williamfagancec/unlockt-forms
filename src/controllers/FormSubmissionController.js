const FormSubmissionService = require('../services/FormSubmissionService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');

class FormSubmissionController {
  constructor(logger) {
    this.formService = new FormSubmissionService(logger);
    this.logger = logger;
  }

  submitLetterOfAppointment = asyncHandler(async (req, res) => {
    const submission = await this.formService.submitLetterOfAppointment(req.body, req.files);
    return success(res, { submissionId: submission.id }, 'Form submitted successfully');
  });

  submitQuoteSlip = asyncHandler(async (req, res) => {
    const submission = await this.formService.submitQuoteSlip(req.body, req.files);
    return success(res, { submissionId: submission.id }, 'Quote slip submitted successfully');
  });
}

module.exports = FormSubmissionController;
