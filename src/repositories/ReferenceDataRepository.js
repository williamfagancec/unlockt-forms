const { db } = require('../infrastructure/database');
const { insurers, roofTypes, externalWallTypes, floorTypes, buildingTypes } = require('../../shared/schema');
const { eq } = require('drizzle-orm');

class ReferenceDataRepository {
  async getActiveInsurers() {
    return await db
      .select()
      .from(insurers)
      .where(eq(insurers.isActive, true))
      .orderBy(insurers.displayOrder, insurers.name);
  }

  async getActiveRoofTypes() {
    return await db
      .select()
      .from(roofTypes)
      .where(eq(roofTypes.isActive, true))
      .orderBy(roofTypes.displayOrder, roofTypes.name);
  }

  async getActiveExternalWallTypes() {
    return await db
      .select()
      .from(externalWallTypes)
      .where(eq(externalWallTypes.isActive, true))
      .orderBy(externalWallTypes.displayOrder, externalWallTypes.name);
  }

  async getActiveFloorTypes() {
    return await db
      .select()
      .from(floorTypes)
      .where(eq(floorTypes.isActive, true))
      .orderBy(floorTypes.displayOrder, floorTypes.name);
  }

  async getActiveBuildingTypes() {
    return await db
      .select()
      .from(buildingTypes)
      .where(eq(buildingTypes.isActive, true))
      .orderBy(buildingTypes.displayOrder, buildingTypes.name);
  }

  async getAllInsurers() {
    return await db.select().from(insurers);
  }

  async getAllRoofTypes() {
    return await db.select().from(roofTypes);
  }

  async getAllExternalWallTypes() {
    return await db.select().from(externalWallTypes);
  }

  async getAllFloorTypes() {
    return await db.select().from(floorTypes);
  }

  async getAllBuildingTypes() {
    return await db.select().from(buildingTypes);
  }

  async seedInsurers(data) {
    await db.insert(insurers).values(data);
  }

  async seedRoofTypes(data) {
    await db.insert(roofTypes).values(data);
  }

  async seedExternalWallTypes(data) {
    await db.insert(externalWallTypes).values(data);
  }

  async seedFloorTypes(data) {
    await db.insert(floorTypes).values(data);
  }

  async seedBuildingTypes(data) {
    await db.insert(buildingTypes).values(data);
  }

  async deleteAllInsurers() {
    await db.delete(insurers);
  }

  async deleteAllRoofTypes() {
    await db.delete(roofTypes);
  }

  async deleteAllExternalWallTypes() {
    await db.delete(externalWallTypes);
  }

  async deleteAllFloorTypes() {
    await db.delete(floorTypes);
  }

  async deleteAllBuildingTypes() {
    await db.delete(buildingTypes);
  }
}

module.exports = new ReferenceDataRepository();
