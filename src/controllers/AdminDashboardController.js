const FormSubmissionService = require('../services/FormSubmissionService');
const { asyncHandler } = require('../middleware/errorHandler');

class AdminDashboardController {
  constructor(logger) {
    this.formService = new FormSubmissionService(logger);
    this.logger = logger;
  }

  getLetterOfAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await this.formService.getLetterOfAppointmentStats();
    res.json(stats);
  });

  getQuoteSlipStats = asyncHandler(async (req, res) => {
    const stats = await this.formService.getQuoteSlipStats();
    res.json(stats);
  });

  getLetterOfAppointmentList = asyncHandler(async (req, res) => {
    const submissions = await this.formService.getLetterOfAppointmentList();
    res.json(submissions);
  });

  getLetterOfAppointmentById = asyncHandler(async (req, res) => {
    const submission = await this.formService.getLetterOfAppointmentById(parseInt(req.params.id));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  });

  getQuoteSlipList = asyncHandler(async (req, res) => {
    const submissions = await this.formService.getQuoteSlipList();
    res.json(submissions);
  });

  getQuoteSlipById = asyncHandler(async (req, res) => {
    const submission = await this.formService.getQuoteSlipById(parseInt(req.params.id));
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  });
}

module.exports = AdminDashboardController;
