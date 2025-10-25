const ExportService = require('../services/ExportService');
const { asyncHandler } = require('../middleware/errorHandler');

class ExportController {
  constructor(logger) {
    this.exportService = new ExportService(logger);
    this.logger = logger;
  }

  exportLetterOfAppointmentPDF = asyncHandler(async (req, res) => {
    const submissionId = parseInt(req.params.id);
    const result = await this.exportService.generateLetterOfAppointmentPDF(submissionId, res);
    
    if (!result) {
      return res.status(404).json({ error: 'Submission not found' });
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
