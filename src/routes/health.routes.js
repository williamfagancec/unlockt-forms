const express = require('express');
const HealthController = require('../controllers/HealthController');

function createHealthRoutes(logger) {
  const router = express.Router();
  const healthController = new HealthController(logger);

  router.get('/liveness', healthController.liveness);
  router.get('/readiness', healthController.readiness);
  router.get('/metrics', healthController.metrics);

  return router;
}

module.exports = createHealthRoutes;
