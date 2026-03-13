jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

import { getCityModelById } from "../city/catalog/cityCatalog";
import { resolveAssetUri } from "./assetUri";

describe("fail-hard asset audit", () => {
	describe("resolveAssetUri", () => {
		it("throws on empty string instead of returning empty URI", () => {
			expect(() => resolveAssetUri("")).toThrow(
				"resolveAssetUri received an empty string",
			);
		});
	});

	describe("getCityModelById", () => {
		it("throws when looking up a non-existent model ID", () => {
			expect(() => getCityModelById("nonexistent_asset_id_xyz")).toThrow(
				/no city model found with id "nonexistent_asset_id_xyz"/,
			);
		});
	});
});
