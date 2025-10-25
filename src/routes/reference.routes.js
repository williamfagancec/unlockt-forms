const express = require('express');
const ReferenceDataController = require('../controllers/ReferenceDataController');

function createReferenceRoutes(logger) {
  const router = express.Router();
  
  const referenceController = new ReferenceDataController(logger);

  router.get('/insurers', referenceController.getInsurers);
  router.get('/roof-types', referenceController.getRoofTypes);
  router.get('/external-wall-types', referenceController.getExternalWallTypes);
  router.get('/floor-types', referenceController.getFloorTypes);
  router.get('/building-types', referenceController.getBuildingTypes);

  return router;
}

module.exports = createReferenceRoutes;
