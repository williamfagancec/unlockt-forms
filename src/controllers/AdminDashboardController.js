const FormSubmissionService = require('../services/FormSubmissionService');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, notFound } = require('../utils/apiResponse');

class AdminDashboardController {
  constructor(logger) {
    this.formService = new FormSubmissionService(logger);
    this.logger = logger;
  }

  getLetterOfAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await this.formService.getLetterOfAppointmentStats();
    return success(res, stats);
  });

  getQuoteSlipStats = asyncHandler(async (req, res) => {
    const stats = await this.formService.getQuoteSlipStats();
    return success(res, stats);
  });

  getLetterOfAppointmentList = asyncHandler(async (req, res) => {
    const submissions = await this.formService.getLetterOfAppointmentList();
    return success(res, submissions);
  });

  getLetterOfAppointmentById = asyncHandler(async (req, res) => {
    const submission = await this.formService.getLetterOfAppointmentById(parseInt(req.params.id));
    
    if (!submission) {
      return notFound(res, 'Submission');
    }
    
    return success(res, submission);
  });

  getQuoteSlipList = asyncHandler(async (req, res) => {
    const submissions = await this.formService.getQuoteSlipList();
    return success(res, submissions);
  });

  getQuoteSlipById = asyncHandler(async (req, res) => {
    const submission = await this.formService.getQuoteSlipById(parseInt(req.params.id));
    
    if (!submission) {
      return notFound(res, 'Submission');
    }
    
    return success(res, submission);
  });
}

module.exports = AdminDashboardController;
