const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const formSubmissionRepository = require('../repositories/FormSubmissionRepository');
const quoteSlipRepository = require('../repositories/QuoteSlipRepository');

class ExportService {
  constructor(logger) {
    this.logger = logger;
  }

  async generateLetterOfAppointmentPDF(submissionId, res) {
    try {
      const submission = await formSubmissionRepository.findById(submissionId);
      
      if (!submission) {
        return null;
      }

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=unlockt-submission-${submission.id}.pdf`);
      
      doc.pipe(res);
      
      const brandGreen = '#5fa88a';
      const lightGray = '#f5f5f5';
      const darkGray = '#333333';
      const mediumGray = '#666666';
      
      doc.rect(0, 0, doc.page.width, 120).fill(brandGreen);
      
      doc.fillColor('white')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('Letter of Appointment', 50, 35, { align: 'left' });
      
      doc.fillColor('white')
         .fontSize(10)
         .font('Helvetica')
         .text('Unlockt Insurance Solutions', 50, 75, { align: 'left' });
      
      doc.fontSize(8)
         .fillColor('rgba(255, 255, 255, 0.9)')
         .text('ABN 75 684 319 784 | ASIC AR No. 1316562', 50, 90, { align: 'left', width: 500 });
      
      let y = 150;
      
      doc.rect(50, y, doc.page.width - 100, 40).fill(lightGray);
      doc.fillColor(darkGray)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`Submission ID: #${submission.id}`, 65, y + 12);
      doc.fillColor(mediumGray)
         .fontSize(9)
         .font('Helvetica')
         .text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, 65, y + 27);
      
      y += 60;
      
      const addSection = (title, y) => {
        doc.fillColor(brandGreen)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(title, 50, y);
        doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor(brandGreen).lineWidth(2).stroke();
        return y + 30;
      };
      
      const addField = (label, value, y) => {
        doc.fillColor(mediumGray)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(label, 50, y);
        doc.fillColor(darkGray)
           .fontSize(10)
           .font('Helvetica')
           .text(value || 'N/A', 50, y + 15, { width: doc.page.width - 100 });
        return y + 38;
      };
      
      y = addSection('Strata Information', y);
      y = addField('Strata Management', submission.strataManagement, y);
      y = addField('Strata Plan Number', submission.strataPlanNumber, y);
      
      y = addSection('Property Address', y);
      const addressLines = [
        submission.streetAddress,
        submission.streetAddressLine2,
        `${submission.city || ''}, ${submission.state || ''} ${submission.postal || ''}`
      ].filter(line => line && line.trim() !== ', ').join('\n');
      y = addField('Address', addressLines, y);
      
      y = addSection('Contact Information', y);
      y = addField('Contact Person', submission.contactPerson, y);
      y = addField('Email', submission.email, y);
      y = addField('Phone', submission.phone, y);
      
      y = addSection('Appointment Questions', y);
      doc.fillColor(darkGray).fontSize(10).font('Helvetica');
      
      const questions = [
        { q: '1. Representatives appointed to negotiate and arrange contracts', a: submission.questionCheckbox1 },
        { q: '2. Seek insurance quotations on behalf of Owner\'s Corporation', a: submission.questionCheckbox2 },
        { q: '3. Unlockt will not bind insurance cover', a: submission.questionCheckbox3 },
        { q: '4. Authorised to provide general financial services advice', a: submission.questionCheckbox4 },
        { q: '5. Confirm appointment and arrangement in writing', a: submission.questionCheckbox5 }
      ];
      
      questions.forEach(item => {
        doc.fillColor(mediumGray).fontSize(9).text(item.q, 50, y, { continued: true });
        doc.fillColor(item.a ? brandGreen : '#999999')
           .font('Helvetica-Bold')
           .text(`  ${item.a ? '✓ Yes' : '✗ No'}`, { align: 'left' });
        y += 20;
      });
      
      y += 10;
      y = addSection('Declaration', y);
      y = addField('Owners Corporation Informed', submission.confirmationCheckbox ? 'Yes' : 'No', y);
      y = addField('Submission Date', submission.submissionDate || 'N/A', y);
      
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(lightGray);
      doc.fillColor(mediumGray)
         .fontSize(8)
         .font('Helvetica')
         .text('Authorised representatives of Resilium Insurance Broking Pty Ltd ABN 92 169 975 973 AFSL No. 480382', 
               50, doc.page.height - 25, { align: 'center', width: doc.page.width - 100 });
      
      doc.end();
      return true;
    } catch (error) {
      this.logger.error({ err: error, submissionId }, 'PDF generation error');
      throw error;
    }
  }

  async generateLetterOfAppointmentExcel(res) {
    try {
      const submissions = await formSubmissionRepository.findAll();
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Letter of Appointment');
      
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Strata Management', key: 'strataManagement', width: 30 },
        { header: 'Strata Plan Number', key: 'strataPlanNumber', width: 20 },
        { header: 'Street Address', key: 'streetAddress', width: 30 },
        { header: 'Street Address Line 2', key: 'streetAddressLine2', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Postal', key: 'postal', width: 10 },
        { header: 'Contact Person', key: 'contactPerson', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Q1: Representatives', key: 'questionCheckbox1', width: 15 },
        { header: 'Q2: Quotations', key: 'questionCheckbox2', width: 15 },
        { header: 'Q3: Not Bind Cover', key: 'questionCheckbox3', width: 15 },
        { header: 'Q4: Financial Services', key: 'questionCheckbox4', width: 20 },
        { header: 'Q5: Strata Manager Advice', key: 'questionCheckbox5', width: 20 },
        { header: 'Confirmation', key: 'confirmationCheckbox', width: 15 },
        { header: 'Submission Date', key: 'submissionDate', width: 15 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      
      submissions.forEach(sub => {
        worksheet.addRow({
          id: sub.id,
          strataManagement: sub.strataManagement,
          strataPlanNumber: sub.strataPlanNumber,
          streetAddress: sub.streetAddress,
          streetAddressLine2: sub.streetAddressLine2,
          city: sub.city,
          state: sub.state,
          postal: sub.postal,
          contactPerson: sub.contactPerson,
          email: sub.email,
          phone: sub.phone,
          questionCheckbox1: sub.questionCheckbox1 ? 'Yes' : 'No',
          questionCheckbox2: sub.questionCheckbox2 ? 'Yes' : 'No',
          questionCheckbox3: sub.questionCheckbox3 ? 'Yes' : 'No',
          questionCheckbox4: sub.questionCheckbox4 ? 'Yes' : 'No',
          questionCheckbox5: sub.questionCheckbox5 ? 'Yes' : 'No',
          confirmationCheckbox: sub.confirmationCheckbox ? 'Yes' : 'No',
          submissionDate: sub.submissionDate,
          submittedAt: new Date(sub.submittedAt).toLocaleString()
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=letter-of-appointment-submissions.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      this.logger.error({ err: error }, 'Excel generation error for letter of appointment');
      throw error;
    }
  }

  async generateQuoteSlipExcel(res) {
    try {
      const submissions = await quoteSlipRepository.findAll();
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quote Slip');
      
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Strata Management Name', key: 'strataManagementName', width: 30 },
        { header: 'Contact Person', key: 'contactPerson', width: 25 },
        { header: 'Strata Plan Number', key: 'strataPlanNumber', width: 20 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Postal', key: 'postal', width: 10 },
        { header: 'Renewal Date', key: 'renewalDate', width: 15 },
        { header: 'Current Insurer', key: 'currentInsurer', width: 25 },
        { header: 'Current Building Sum Insured', key: 'currentBuildingSumInsured', width: 25 },
        { header: 'Requested Sum Insured', key: 'requestedSumInsured', width: 25 },
        { header: 'Roof Type', key: 'roofType', width: 20 },
        { header: 'External Wall Type', key: 'externalWallType', width: 20 },
        { header: 'Floor Type', key: 'floorType', width: 20 },
        { header: 'Building Type', key: 'buildingType', width: 20 },
        { header: 'Year Built', key: 'yearBuilt', width: 12 },
        { header: 'Number of Lots', key: 'numberOfLots', width: 15 },
        { header: 'Number of Floors', key: 'numberOfFloors', width: 15 },
        { header: 'Number of Lifts', key: 'numberOfLifts', width: 15 },
        { header: 'ACP/EPS Present', key: 'acpEpsPresent', width: 15 },
        { header: 'Current Standard Excess', key: 'currentStandardExcess', width: 20 },
        { header: 'Flood Cover Required', key: 'requiredCoverFlood', width: 15 },
        { header: 'Insurance Declined', key: 'discloseInsuranceDeclined', width: 15 },
        { header: 'Asbestos Present', key: 'discloseAsbestosPresent', width: 15 },
        { header: 'Heritage Listed', key: 'discloseHeritageListed', width: 15 },
        { header: 'Defects Affecting Property', key: 'defectsAffectingProperty', width: 25 },
        { header: 'AFSS Current', key: 'afssCurrent', width: 15 },
        { header: 'Declaration Full Name', key: 'declarationFullName', width: 25 },
        { header: 'Declaration Position', key: 'declarationPosition', width: 25 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      
      submissions.forEach(sub => {
        worksheet.addRow({
          id: sub.id,
          strataManagementName: sub.strataManagementName,
          contactPerson: sub.contactPerson,
          strataPlanNumber: sub.strataPlanNumber,
          address: sub.address,
          city: sub.city,
          state: sub.state,
          postal: sub.postal,
          renewalDate: sub.renewalDate,
          currentInsurer: sub.currentInsurer,
          currentBuildingSumInsured: sub.currentBuildingSumInsured,
          requestedSumInsured: sub.requestedSumInsured,
          roofType: sub.roofType,
          externalWallType: sub.externalWallType,
          floorType: sub.floorType,
          buildingType: sub.buildingType,
          yearBuilt: sub.yearBuilt,
          numberOfLots: sub.numberOfLots,
          numberOfFloors: sub.numberOfFloors,
          numberOfLifts: sub.numberOfLifts,
          acpEpsPresent: sub.acpEpsPresent ? 'Yes' : 'No',
          currentStandardExcess: sub.currentStandardExcess,
          requiredCoverFlood: sub.requiredCoverFlood ? 'Yes' : 'No',
          discloseInsuranceDeclined: sub.discloseInsuranceDeclined ? 'Yes' : 'No',
          discloseAsbestosPresent: sub.discloseAsbestosPresent ? 'Yes' : 'No',
          discloseHeritageListed: sub.discloseHeritageListed ? 'Yes' : 'No',
          defectsAffectingProperty: sub.defectsAffectingProperty,
          afssCurrent: sub.afssCurrent ? 'Yes' : 'No',
          declarationFullName: sub.declarationFullName,
          declarationPosition: sub.declarationPosition,
          submittedAt: new Date(sub.submittedAt).toLocaleString()
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=quote-slip-submissions.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      this.logger.error({ err: error }, 'Excel generation error for quote slip');
      throw error;
    }
  }
}

module.exports = ExportService;
