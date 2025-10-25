const express = require('express');
const AdminDashboardController = require('../controllers/AdminDashboardController');
const ExportController = require('../controllers/ExportController');
const { adminAuthMiddleware } = require('../middleware/auth');

function createSubmissionsRoutes(logger) {
  const router = express.Router();
  
  const dashboardController = new AdminDashboardController(logger);
  const exportController = new ExportController(logger);

  router.get('/submissions', adminAuthMiddleware, dashboardController.getLetterOfAppointmentList);
  router.get('/submissions/:id', adminAuthMiddleware, dashboardController.getLetterOfAppointmentById);
  
  router.get('/quote-slip-submissions', adminAuthMiddleware, dashboardController.getQuoteSlipList);
  router.get('/quote-slip-submissions/:id', adminAuthMiddleware, dashboardController.getQuoteSlipById);

  router.get('/export/pdf/:id', adminAuthMiddleware, exportController.exportLetterOfAppointmentPDF);
  router.get('/export/letter-of-appointment', adminAuthMiddleware, exportController.exportLetterOfAppointmentExcel);
  router.get('/export/quote-slip', adminAuthMiddleware, exportController.exportQuoteSlipExcel);

  return router;
}

module.exports = createSubmissionsRoutes;
