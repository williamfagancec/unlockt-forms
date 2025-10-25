const referenceDataRepository = require('../repositories/ReferenceDataRepository');

const INSURERS = [
  { name: 'CHU Underwriting Agencies', displayOrder: 1, isActive: true },
  { name: 'Strata Unit Underwriters (SUU)', displayOrder: 2, isActive: true },
  { name: 'Longitude Insurance', displayOrder: 3, isActive: true },
  { name: 'SCI - Strata Community Insurance', displayOrder: 4, isActive: true },
  { name: 'Flex Insurance', displayOrder: 5, isActive: true },
  { name: 'Chubb', displayOrder: 6, isActive: true },
  { name: 'QUS', displayOrder: 7, isActive: true },
  { name: 'Axis', displayOrder: 8, isActive: true },
  { name: 'Hutch', displayOrder: 9, isActive: true },
  { name: 'Insurance Investment Solutions', displayOrder: 10, isActive: true },
  { name: 'Other', displayOrder: 11, isActive: true }
];

const ROOF_TYPES = [
  { name: 'Concrete Slab (Often used in high-rise apartments; durable and fire-resistant.)', displayOrder: 1, isActive: true },
  { name: 'Metal Roof (Includes Colorbond or zincalume steel common in newer strata buildings.)', displayOrder: 2, isActive: true },
  { name: 'Tiled Roof (Usually terracotta or concrete tiles; typical for low-rise residential blocks.)', displayOrder: 3, isActive: true },
  { name: 'Asbestos Roof (Found in older buildings)', displayOrder: 4, isActive: true },
  { name: 'Membrane Roof A waterproof membrane (e.g., bitumen or synthetic); often on flat concrete roofs.', displayOrder: 5, isActive: true },
  { name: 'Slate Roof Rare in modern strata but may exist in heritage-listed buildings.', displayOrder: 6, isActive: true }
];

const EXTERNAL_WALL_TYPES = [
  { name: 'Brick Veneer Brick exterior over a timber/steel frame; common in low-rise strata buildings.', displayOrder: 1, isActive: true },
  { name: 'Double Brick / Solid Brick Two layers of brick; found in older or premium residential buildings.', displayOrder: 2, isActive: true },
  { name: 'Concrete / Precast Concrete Common in high-rise developments; strong fire and impact resistance.', displayOrder: 3, isActive: true },
  { name: 'Cladding - Aluminium Composite Panels (ACP) A known fire risk; subject to underwriting scrutiny.', displayOrder: 4, isActive: true },
  { name: 'Cladding - Non-Combustible Includes fibre cement or approved composite materials (e.g. CSR, James Hardie).', displayOrder: 5, isActive: true },
  { name: 'Lightweight Panels / EPS Expanded Polystyrene; cost-effective but high-risk if not fire-rated.', displayOrder: 6, isActive: true },
  { name: 'Timber Weatherboard Rare in strata but seen in older or coastal buildings.', displayOrder: 7, isActive: true },
  { name: 'Tilt-Up Panels Concrete panels cast on site; common in mixed-use or commercial strata.', displayOrder: 8, isActive: true },
  { name: 'Stone / Masonry Veneer Aesthetic finish with stone or stone-look panels over a frame.', displayOrder: 9, isActive: true },
  { name: 'Rendered Masonry Cement-rendered blockwork or brick, usually painted.', displayOrder: 10, isActive: true },
  { name: 'Glass Curtain Wall Full-glass façade; common in commercial or premium residential towers.', displayOrder: 11, isActive: true }
];

const FLOOR_TYPES = [
  { name: 'Concrete Slab Most common in medium-to-high rise strata buildings; provides fire resistance.', displayOrder: 1, isActive: true },
  { name: 'Timber Flooring (Suspended) Typically found in older low-rise buildings; may increase noise transmission risk.', displayOrder: 2, isActive: true },
  { name: 'Particleboard Flooring Often used in timber-framed buildings; less durable and may swell when wet.', displayOrder: 3, isActive: true },
  { name: 'Tile over Concrete Standard in bathrooms, kitchens, and balconies; durable and water-resistant.', displayOrder: 4, isActive: true },
  { name: 'Vinyl / Laminate over Concrete Modern finish; cost-effective but may not perform well with moisture exposure.', displayOrder: 5, isActive: true },
  { name: 'Carpet over Concrete Common in older apartments or budget-conscious builds.', displayOrder: 6, isActive: true },
  { name: 'Floating Floor Systems Installed over underlay; can be timber, laminate, or vinyl — may be sensitive to water.', displayOrder: 7, isActive: true },
  { name: 'Raised Access Flooring Found in commercial strata; allows for cabling or airflow underneath.', displayOrder: 8, isActive: true },
  { name: 'Tiled Timber Base Tiles laid over a timber or particleboard subfloor; risk of cracking/movement.', displayOrder: 9, isActive: true }
];

const BUILDING_TYPES = [
  { name: 'Residential', displayOrder: 1, isActive: true },
  { name: 'Mixed Use', displayOrder: 2, isActive: true },
  { name: 'Commercial', displayOrder: 3, isActive: true },
  { name: 'Industrial', displayOrder: 4, isActive: true },
  { name: 'Other', displayOrder: 5, isActive: true }
];

class ReferenceDataService {
  constructor(logger) {
    this.logger = logger;
  }

  async initializeDropdowns() {
    try {
      const existingInsurers = await referenceDataRepository.getAllInsurers();
      if (existingInsurers.length === 0) {
        this.logger.info('Seeding insurers...');
        await referenceDataRepository.seedInsurers(INSURERS);
        this.logger.info('Insurers seeded successfully');
      }

      const existingRoofTypes = await referenceDataRepository.getAllRoofTypes();
      if (existingRoofTypes.length === 0) {
        this.logger.info('Seeding roof types...');
        await referenceDataRepository.seedRoofTypes(ROOF_TYPES);
        this.logger.info('Roof types seeded successfully');
      }

      const existingWallTypes = await referenceDataRepository.getAllExternalWallTypes();
      if (existingWallTypes.length === 0) {
        this.logger.info('Seeding external wall types...');
        await referenceDataRepository.seedExternalWallTypes(EXTERNAL_WALL_TYPES);
        this.logger.info('External wall types seeded successfully');
      }

      const existingFloorTypes = await referenceDataRepository.getAllFloorTypes();
      if (existingFloorTypes.length === 0) {
        this.logger.info('Seeding floor types...');
        await referenceDataRepository.seedFloorTypes(FLOOR_TYPES);
        this.logger.info('Floor types seeded successfully');
      }

      const existingBuildingTypes = await referenceDataRepository.getAllBuildingTypes();
      if (existingBuildingTypes.length === 0) {
        this.logger.info('Seeding building types...');
        await referenceDataRepository.seedBuildingTypes(BUILDING_TYPES);
        this.logger.info('Building types seeded successfully');
      }

      this.logger.info('All dropdown data initialized');
    } catch (error) {
      this.logger.error({ err: error }, 'Error initializing dropdowns');
      throw error;
    }
  }

  async forceReseedDropdowns() {
    try {
      this.logger.info('Starting force reseed of all dropdown data...');
      
      await referenceDataRepository.deleteAllInsurers();
      await referenceDataRepository.deleteAllRoofTypes();
      await referenceDataRepository.deleteAllExternalWallTypes();
      await referenceDataRepository.deleteAllFloorTypes();
      await referenceDataRepository.deleteAllBuildingTypes();
      
      this.logger.info('Cleared all existing dropdown data');
      
      await referenceDataRepository.seedInsurers(INSURERS);
      await referenceDataRepository.seedRoofTypes(ROOF_TYPES);
      await referenceDataRepository.seedExternalWallTypes(EXTERNAL_WALL_TYPES);
      await referenceDataRepository.seedFloorTypes(FLOOR_TYPES);
      await referenceDataRepository.seedBuildingTypes(BUILDING_TYPES);
      
      this.logger.info('All dropdown data reseeded successfully!');
      return { success: true, message: 'All dropdown data reseeded successfully' };
    } catch (error) {
      this.logger.error({ err: error }, 'Error reseeding dropdown data');
      throw error;
    }
  }
}

module.exports = ReferenceDataService;
