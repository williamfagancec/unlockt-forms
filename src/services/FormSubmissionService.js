const formSubmissionRepository = require('../repositories/FormSubmissionRepository');
const quoteSlipRepository = require('../repositories/QuoteSlipRepository');
const { uploadFileToBlob, uploadSignatureToBlob } = require('../infrastructure/storage');

class FormSubmissionService {
  constructor(logger) {
    this.logger = logger;
  }

  async submitLetterOfAppointment(formData, files) {
    try {
      const submissionData = {
        strataManagement: formData.strataManagement,
        strataPlanNumber: formData.strataPlanNumber,
        streetAddress: formData.streetAddress,
        streetAddressLine2: formData.streetAddressLine2,
        city: formData.city,
        state: formData.state,
        postal: formData.postal,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        questionCheckbox1: formData.questionCheckbox1 === 'true',
        questionCheckbox2: formData.questionCheckbox2 === 'true',
        questionCheckbox3: formData.questionCheckbox3 === 'true',
        questionCheckbox4: formData.questionCheckbox4 === 'true',
        questionCheckbox5: formData.questionCheckbox5 === 'true',
        confirmationCheckbox: formData.confirmationCheckbox === 'true',
        submissionDate: formData.submissionDate
      };

      const fileUrl = files?.file?.[0] ? await uploadFileToBlob(files.file[0]) : null;
      const signatureUrl = files?.signature?.[0] 
        ? await uploadSignatureToBlob(files.signature[0].buffer.toString('base64'), files.signature[0].originalname) 
        : null;

      if (fileUrl) submissionData.fileUrl = fileUrl;
      if (signatureUrl) submissionData.signatureUrl = signatureUrl;

      const submission = await formSubmissionRepository.create(submissionData);

      this.logger.info({ submissionId: submission.id }, 'Letter of appointment submitted successfully');

      return submission;
    } catch (error) {
      this.logger.error({ err: error }, 'Error submitting letter of appointment');
      throw error;
    }
  }

  async submitQuoteSlip(formData, files) {
    try {
      const submissionData = {
        strataManagementName: formData.strataManagementName,
        contactPerson: formData.contactPerson,
        strataPlanNumber: formData.strataPlanNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal: formData.postal,
        renewalDate: formData.renewalDate,
        currentInsurer: formData.currentInsurer,
        currentBuildingSumInsured: formData.currentBuildingSumInsured,
        requestedSumInsured: formData.requestedSumInsured,
        roofType: formData.roofType,
        externalWallType: formData.externalWallType,
        floorType: formData.floorType,
        buildingType: formData.buildingType,
        yearBuilt: parseInt(formData.yearBuilt),
        numberOfLots: parseInt(formData.numberOfLots),
        numberOfFloors: parseInt(formData.numberOfFloors),
        numberOfLifts: parseInt(formData.numberOfLifts),
        acpEpsPresent: formData.acpEpsPresent === 'true',
        currentStandardExcess: formData.currentStandardExcess,
        requiredCoverFlood: formData.requiredCoverFlood === 'true',
        discloseInsuranceDeclined: formData.discloseInsuranceDeclined === 'true',
        discloseAsbestosPresent: formData.discloseAsbestosPresent === 'true',
        discloseHeritageListed: formData.discloseHeritageListed === 'true',
        defectsAffectingProperty: formData.defectsAffectingProperty,
        afssCurrent: formData.afssCurrent === 'true',
        declarationFullName: formData.declarationFullName,
        declarationPosition: formData.declarationPosition
      };

      const fileUrl = files?.file?.[0] ? await uploadFileToBlob(files.file[0]) : null;
      const signatureUrl = files?.signature?.[0] 
        ? await uploadSignatureToBlob(files.signature[0].buffer.toString('base64'), files.signature[0].originalname) 
        : null;

      if (fileUrl) submissionData.fileUrl = fileUrl;
      if (signatureUrl) submissionData.signatureUrl = signatureUrl;

      const submission = await quoteSlipRepository.create(submissionData);

      this.logger.info({ submissionId: submission.id }, 'Quote slip submitted successfully');

      return submission;
    } catch (error) {
      this.logger.error({ err: error }, 'Error submitting quote slip');
      throw error;
    }
  }

  async getLetterOfAppointmentList() {
    return await formSubmissionRepository.findAll();
  }

  async getLetterOfAppointmentById(id) {
    return await formSubmissionRepository.findById(id);
  }

  async getQuoteSlipList() {
    return await quoteSlipRepository.findAll();
  }

  async getQuoteSlipById(id) {
    return await quoteSlipRepository.findById(id);
  }

  async getLetterOfAppointmentStats() {
    const submissions = await formSubmissionRepository.getAllForStats();
    return this._calculateStats(submissions);
  }

  async getQuoteSlipStats() {
    const submissions = await quoteSlipRepository.getAllForStats();
    return this._calculateStats(submissions);
  }

  _calculateStats(submissions) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const total = submissions.length;
    const today = submissions.filter(s => 
      new Date(s.submittedAt) >= startOfToday
    ).length;
    const thisWeek = submissions.filter(s => 
      new Date(s.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const thisMonth = submissions.filter(s => 
      new Date(s.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      total,
      today,
      thisWeek,
      thisMonth
    };
  }
}

module.exports = FormSubmissionService;
