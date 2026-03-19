import { getCityModelById } from "../city/catalog/cityCatalog";
import { getCityFamilyMaterial } from "../rendering/materials/MaterialFactory";
import { resolveAssetUri } from "./assetUri";

describe("fail-hard asset audit", () => {
	describe("resolveAssetUri", () => {
		it("throws on empty string instead of returning empty URI", () => {
			expect(() => resolveAssetUri("")).toThrow();
		});
	});

	describe("getCityModelById", () => {
		it("throws when looking up a non-existent model ID", () => {
			expect(() => getCityModelById("nonexistent_asset_id_xyz")).toThrow(
				/no city model found with id "nonexistent_asset_id_xyz"/,
			);
		});
	});

	describe("getCityFamilyMaterial", () => {
		it("throws for unknown material family instead of returning null", () => {
			expect(() => getCityFamilyMaterial("nonexistent_family")).toThrow(
				/getCityFamilyMaterial: no material definition for family "nonexistent_family"/,
			);
		});
	});
});
