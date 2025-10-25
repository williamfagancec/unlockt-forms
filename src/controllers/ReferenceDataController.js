const ReferenceDataService = require('../services/ReferenceDataService');
const referenceDataRepository = require('../repositories/ReferenceDataRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');

class ReferenceDataController {
  constructor(logger) {
    this.referenceDataService = new ReferenceDataService(logger);
    this.logger = logger;
  }

  getInsurers = asyncHandler(async (req, res) => {
    const insurers = await referenceDataRepository.getActiveInsurers();
    return success(res, insurers);
  });

  getRoofTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveRoofTypes();
    return success(res, types);
  });

  getExternalWallTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveExternalWallTypes();
    return success(res, types);
  });

  getFloorTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveFloorTypes();
    return success(res, types);
  });

  getBuildingTypes = asyncHandler(async (req, res) => {
    const types = await referenceDataRepository.getActiveBuildingTypes();
    return success(res, types);
  });

  reseedDropdowns = asyncHandler(async (req, res) => {
    const result = await this.referenceDataService.forceReseedDropdowns();
    return success(res, result, 'Dropdowns reseeded successfully');
  });
}

module.exports = ReferenceDataController;
