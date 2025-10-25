const express = require('express');
const ReferenceDataController = require('../controllers/ReferenceDataController');
const { cacheMiddleware } = require('../middleware/cache');

function createReferenceRoutes(logger) {
  const router = express.Router();
  
  const referenceController = new ReferenceDataController(logger);
  const cacheFor5Min = cacheMiddleware(5 * 60 * 1000);

  router.get('/insurers', cacheFor5Min, referenceController.getInsurers);
  router.get('/roof-types', cacheFor5Min, referenceController.getRoofTypes);
  router.get('/external-wall-types', cacheFor5Min, referenceController.getExternalWallTypes);
  router.get('/floor-types', cacheFor5Min, referenceController.getFloorTypes);
  router.get('/building-types', cacheFor5Min, referenceController.getBuildingTypes);

  return router;
}

module.exports = createReferenceRoutes;
