jest.mock('../../repositories/ReferenceDataRepository', () => ({
  getAllInsurers: jest.fn(),
  getAllRoofTypes: jest.fn(),
  getAllExternalWallTypes: jest.fn(),
  getAllFloorTypes: jest.fn(),
  getAllBuildingTypes: jest.fn(),
  seedInsurers: jest.fn(),
  seedRoofTypes: jest.fn(),
  seedExternalWallTypes: jest.fn(),
  seedFloorTypes: jest.fn(),
  seedBuildingTypes: jest.fn(),
  deleteAllInsurers: jest.fn(),
  deleteAllRoofTypes: jest.fn(),
  deleteAllExternalWallTypes: jest.fn(),
  deleteAllFloorTypes: jest.fn(),
  deleteAllBuildingTypes: jest.fn()
}));

const repo = require('../../repositories/ReferenceDataRepository');
const ReferenceDataService = require('../../services/ReferenceDataService');

describe('ReferenceDataService', () => {
  let service;
  let logger;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    service = new ReferenceDataService(logger);
    jest.clearAllMocks();
  });

  it('initializeDropdowns seeds when empty', async () => {
    repo.getAllInsurers.mockResolvedValue([]);
    repo.getAllRoofTypes.mockResolvedValue([]);
    repo.getAllExternalWallTypes.mockResolvedValue([]);
    repo.getAllFloorTypes.mockResolvedValue([]);
    repo.getAllBuildingTypes.mockResolvedValue([]);

    await service.initializeDropdowns();

    expect(repo.seedInsurers).toHaveBeenCalled();
    expect(repo.seedRoofTypes).toHaveBeenCalled();
    expect(repo.seedExternalWallTypes).toHaveBeenCalled();
    expect(repo.seedFloorTypes).toHaveBeenCalled();
    expect(repo.seedBuildingTypes).toHaveBeenCalled();
  });

  it('initializeDropdowns skips seeding when data exists', async () => {
    repo.getAllInsurers.mockResolvedValue([{}]);
    repo.getAllRoofTypes.mockResolvedValue([{}]);
    repo.getAllExternalWallTypes.mockResolvedValue([{}]);
    repo.getAllFloorTypes.mockResolvedValue([{}]);
    repo.getAllBuildingTypes.mockResolvedValue([{}]);

    await service.initializeDropdowns();

    expect(repo.seedInsurers).not.toHaveBeenCalled();
    expect(repo.seedRoofTypes).not.toHaveBeenCalled();
  });

  it('forceReseedDropdowns clears and seeds all tables', async () => {
    await service.forceReseedDropdowns();

    expect(repo.deleteAllInsurers).toHaveBeenCalled();
    expect(repo.deleteAllRoofTypes).toHaveBeenCalled();
    expect(repo.deleteAllExternalWallTypes).toHaveBeenCalled();
    expect(repo.deleteAllFloorTypes).toHaveBeenCalled();
    expect(repo.deleteAllBuildingTypes).toHaveBeenCalled();

    expect(repo.seedInsurers).toHaveBeenCalled();
    expect(repo.seedRoofTypes).toHaveBeenCalled();
    expect(repo.seedExternalWallTypes).toHaveBeenCalled();
    expect(repo.seedFloorTypes).toHaveBeenCalled();
    expect(repo.seedBuildingTypes).toHaveBeenCalled();
  });
});