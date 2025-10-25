const express = require('express');
const { validationResult } = require('express-validator');
const AdminUserController = require('../controllers/AdminUserController');
const AdminDashboardController = require('../controllers/AdminDashboardController');
const ExportController = require('../controllers/ExportController');
const ReferenceDataController = require('../controllers/ReferenceDataController');
const { adminAuthMiddleware } = require('../middleware/auth');

function createAdminRoutes(logger) {
  const router = express.Router();
  
  const userController = new AdminUserController(logger);
  const dashboardController = new AdminDashboardController(logger);
  const exportController = new ExportController(logger);
  const referenceController = new ReferenceDataController(logger);

  const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  router.get('/users', adminAuthMiddleware, userController.getAll);
  router.post('/users', adminAuthMiddleware, AdminUserController.createValidation, validate, userController.create);
  router.put('/users/:id', adminAuthMiddleware, AdminUserController.updateValidation, validate, userController.update);
  router.post('/users/:id/toggle', adminAuthMiddleware, userController.toggleStatus);
  router.post('/users/:id/set-status', adminAuthMiddleware, AdminUserController.setStatusValidation, validate, userController.setStatus);
  router.post('/users/:id/unfreeze', adminAuthMiddleware, userController.unfreeze);

  router.get('/letter-of-appointment/stats', adminAuthMiddleware, dashboardController.getLetterOfAppointmentStats);
  router.get('/quote-slip/stats', adminAuthMiddleware, dashboardController.getQuoteSlipStats);

  router.get('/reseed-dropdowns', adminAuthMiddleware, referenceController.reseedDropdowns);

  return router;
}

module.exports = createAdminRoutes;
