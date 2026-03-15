/**
 * Ensures BUILDING_MODEL_MAP has a real city model for every placeable building type.
 * Zero placeholders: every building type must resolve to a city catalog model.
 */

import { getCityModelById } from "../../city/catalog/cityCatalog";
import type { PlaceableType } from "../../systems/buildingPlacement";
import { BUILDING_MODEL_MAP, getBuildingModelId } from "../buildingModelMap";

const PLACEABLE_TYPES: Exclude<PlaceableType, null>[] = [
	"lightning_rod",
	"fabrication_unit",
	"motor_pool",
	"relay_tower",
	"defense_turret",
	"power_sink",
	"storage_hub",
	"habitat_module",
];

describe("buildingModelMap", () => {
	it("maps every placeable building type to a city model", () => {
		for (const type of PLACEABLE_TYPES) {
			const modelId = getBuildingModelId(type);
			expect(modelId).toBeTruthy();
			expect(typeof modelId).toBe("string");
		}
	});

	it("every mapped model ID exists in city catalog", () => {
		for (const type of PLACEABLE_TYPES) {
			const modelId = getBuildingModelId(type);
			expect(modelId).toBeTruthy();
			expect(() => getCityModelById(modelId!)).not.toThrow();
		}
	});

	it("BUILDING_MODEL_MAP has no placeholder keys", () => {
		for (const [key, value] of Object.entries(BUILDING_MODEL_MAP)) {
			expect(key).not.toMatch(/^building_/);
			expect(value).toBeTruthy();
			expect(typeof value).toBe("string");
		}
	});

	it("returns null for unknown building type", () => {
		expect(getBuildingModelId("unknown_type")).toBeNull();
	});
});
