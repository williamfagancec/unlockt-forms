const FormSubmissionService = require('../../services/FormSubmissionService');
const formSubmissionRepository = require('../../repositories/FormSubmissionRepository');
const quoteSlipRepository = require('../../repositories/QuoteSlipRepository');
const { uploadFileToBlob, uploadSignatureToBlob } = require('../../infrastructure/storage');

jest.mock('../../repositories/FormSubmissionRepository');
jest.mock('../../repositories/QuoteSlipRepository');
jest.mock('../../infrastructure/storage');

describe('FormSubmissionService', () => {
  let service;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    service = new FormSubmissionService(mockLogger);

    jest.clearAllMocks();
  });

  describe('submitLetterOfAppointment', () => {
    it('should submit letter of appointment successfully', async () => {
      const formData = {
        strataManagement: 'Test Strata',
        strataPlanNumber: 'SP12345',
        streetAddress: '123 Test St',
        email: 'test@example.com',
        questionCheckbox1: 'true',
        confirmationCheckbox: 'true',
        submissionDate: '2024-01-01'
      };

      const files = {
        file: [{ filename: 'test.pdf' }],
        signature: [{ filename: 'sig.png' }]
      };

      const mockSubmission = { id: 1, ...formData };

      uploadFileToBlob.mockResolvedValue('http://blob.url/test.pdf');
      uploadSignatureToBlob.mockResolvedValue('http://blob.url/sig.png');
      formSubmissionRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submitLetterOfAppointment(formData, files);

      expect(result).toEqual(mockSubmission);
      expect(formSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          strataManagement: 'Test Strata',
          questionCheckbox1: true,
          confirmationCheckbox: true
        })
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle submission without files', async () => {
      const formData = {
        strataManagement: 'Test Strata',
        strataPlanNumber: 'SP12345',
        confirmationCheckbox: 'true',
        submissionDate: '2024-01-01'
      };

      const mockSubmission = { id: 1 };
      formSubmissionRepository.create.mockResolvedValue(mockSubmission);

      await service.submitLetterOfAppointment(formData, {});

      expect(formSubmissionRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          fileUrl: expect.anything()
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const formData = { strataManagement: 'Test' };
      const error = new Error('Database error');

      formSubmissionRepository.create.mockRejectedValue(error);

      await expect(service.submitLetterOfAppointment(formData, {}))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('submitQuoteSlip', () => {
    it('should submit quote slip with all fields', async () => {
      const formData = {
        strataManagementName: 'Test Management',
        contactPerson: 'John Doe',
        strataPlanNumber: 'SP12345',
        yearBuilt: '2000',
        numberOfLots: '50',
        numberOfFloors: '10',
        numberOfLifts: '2',
        acpEpsPresent: 'true',
        requiredCoverFlood: 'true',
        declarationFullName: 'John Doe'
      };

      const mockSubmission = { id: 1 };
      quoteSlipRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submitQuoteSlip(formData, {});

      expect(result).toEqual(mockSubmission);
      expect(quoteSlipRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          yearBuilt: 2000,
          numberOfLots: 50,
          acpEpsPresent: true
        })
      );
    });
  });

  describe('getLetterOfAppointmentStats', () => {
    it('should calculate statistics correctly', async () => {
      const now = Date.now();
      const mockSubmissions = [
        { id: 1, submittedAt: new Date(now) },
        { id: 2, submittedAt: new Date(now - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { id: 3, submittedAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }, // 10 days ago
        { id: 4, submittedAt: new Date(now - 40 * 24 * 60 * 60 * 1000) }  // 40 days ago
      ];

      formSubmissionRepository.getAllForStats.mockResolvedValue(mockSubmissions);

      const stats = await service.getLetterOfAppointmentStats();

      expect(stats).toEqual({
        totalSubmissions: 4,
        last30Days: 3,
        last7Days: 2
      });
    });

    it('should handle empty submissions', async () => {
      formSubmissionRepository.getAllForStats.mockResolvedValue([]);

      const stats = await service.getLetterOfAppointmentStats();

      expect(stats).toEqual({
        totalSubmissions: 0,
        last30Days: 0,
        last7Days: 0
      });
    });
  });

  describe('getLetterOfAppointmentById', () => {
    it('should retrieve submission by ID', async () => {
      const mockSubmission = { id: 1, strataManagement: 'Test' };
      formSubmissionRepository.findById.mockResolvedValue(mockSubmission);

      const result = await service.getLetterOfAppointmentById(1);

      expect(result).toEqual(mockSubmission);
      expect(formSubmissionRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent ID', async () => {
      formSubmissionRepository.findById.mockResolvedValue(null);

      const result = await service.getLetterOfAppointmentById(999);

      expect(result).toBeNull();
    });
  });
});