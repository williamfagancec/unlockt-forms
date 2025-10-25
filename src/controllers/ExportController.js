const ExportService = require('../services/ExportService');
const { asyncHandler } = require('../middleware/errorHandler');
const { notFound, error } = require('../utils/apiResponse');

class ExportController {
  constructor(logger) {
    this.exportService = new ExportService(logger);
    this.logger = logger;
  }

  exportLetterOfAppointmentPDF = asyncHandler(async (req, res) => {
    const submissionId = parseInt(req.params.id, 10);
    
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return error(res, 'Invalid submission ID', 400);
    }
    
    const result = await this.exportService.generateLetterOfAppointmentPDF(submissionId, res);
    
    if (!result) {
      return notFound(res, 'Submission');
    }
  });

  exportLetterOfAppointmentExcel = asyncHandler(async (req, res) => {
    await this.exportService.generateLetterOfAppointmentExcel(res);
  });

  exportQuoteSlipExcel = asyncHandler(async (req, res) => {
    await this.exportService.generateQuoteSlipExcel(res);
  });
}

module.exports = ExportController;
