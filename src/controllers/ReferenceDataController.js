const ReferenceDataService = require('../services/ReferenceDataService');
const referenceDataRepository = require('../repositories/ReferenceDataRepository');
const { asyncHandler } = require('../middleware/errorHandler');

class ReferenceDataController {
  constructor(logger) {
    this.referenceDataService = new ReferenceDataService(logger);
    this.logger = logger;
  }

  getInsurers = asyncHandler(async (req, res) => {
    const insurers = await referenceDataRepository.getActiveInsurers();
    res.json(insurers);
  });

  getRoofTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveRoofTypes();
    res.json(types);
  });

  getExternalWallTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveExternalWallTypes();
    res.json(types);
  });

  getFloorTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveFloorTypes();
    res.json(types);
  });

  getBuildingTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveBuildingTypes();
    res.json(types);
  });

  reseedDropdowns = asyncHandler(async (req, res) => {
    const result = await this.referenceDataService.forceReseedDropdowns();
    res.json(result);
  });
}

module.exports = ReferenceDataController;
