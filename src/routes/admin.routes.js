const express = require('express');
const AdminUserController = require('../controllers/AdminUserController');
const AdminDashboardController = require('../controllers/AdminDashboardController');
const ExportController = require('../controllers/ExportController');
const ReferenceDataController = require('../controllers/ReferenceDataController');
const { adminAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { csrfProtection } = require('../middleware/csrf');

function createAdminRoutes(logger) {
  const router = express.Router();
  
  const userController = new AdminUserController(logger);
  const dashboardController = new AdminDashboardController(logger);
  const exportController = new ExportController(logger);
  const referenceController = new ReferenceDataController(logger);

  router.get('/users', adminAuthMiddleware, userController.getAll);
  router.post('/users', adminAuthMiddleware, csrfProtection, AdminUserController.createValidation, validate, userController.create);
  router.put('/users/:id', adminAuthMiddleware, csrfProtection, AdminUserController.updateValidation, validate, userController.update);
  router.post('/users/:id/toggle', adminAuthMiddleware, csrfProtection, userController.toggleStatus);
  router.post('/users/:id/set-status', adminAuthMiddleware, csrfProtection, AdminUserController.setStatusValidation, validate, userController.setStatus);
  router.post('/users/:id/unfreeze', adminAuthMiddleware, csrfProtection, userController.unfreeze);

  router.get('/letter-of-appointment/stats', adminAuthMiddleware, dashboardController.getLetterOfAppointmentStats);
  router.get('/quote-slip/stats', adminAuthMiddleware, dashboardController.getQuoteSlipStats);

  router.get('/reseed-dropdowns', adminAuthMiddleware, referenceController.reseedDropdowns);

  return router;
}

module.exports = createAdminRoutes;
