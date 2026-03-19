import { describe, expect, it } from "vitest";
import {
	SALVAGE_DEFS,
	getAllSalvageModelIds,
	getSalvageTypeForModel,
} from "../salvageTypes";
import type { SalvageType } from "../../traits/salvage";

const ALL_SALVAGE_TYPES: SalvageType[] = [
	"container",
	"terminal",
	"vessel",
	"machinery",
	"debris",
	"cargo_crate",
	"storage_rack",
	"power_cell",
	"landing_wreck",
	"abyssal_relic",
];

describe("SALVAGE_DEFS", () => {
	it("contains all 10 salvage types", () => {
		const keys = Object.keys(SALVAGE_DEFS);
		expect(keys).toHaveLength(10);
		for (const type of ALL_SALVAGE_TYPES) {
			expect(SALVAGE_DEFS).toHaveProperty(type);
		}
	});

	describe.each(ALL_SALVAGE_TYPES)("%s", (type) => {
		const def = SALVAGE_DEFS[type];

		it("has yields with at least one material", () => {
			expect(Object.keys(def.yields).length).toBeGreaterThanOrEqual(1);
		});

		it("has models array with at least 1 model ID", () => {
			expect(def.models.length).toBeGreaterThanOrEqual(1);
		});

		it("has harvestDuration > 0", () => {
			expect(def.harvestDuration).toBeGreaterThan(0);
		});

		it("has hp > 0", () => {
			expect(def.hp).toBeGreaterThan(0);
		});

		it("has displayName", () => {
			expect(def.displayName).toBeTruthy();
		});
	});
});

describe("getAllSalvageModelIds", () => {
	it("returns all model IDs from all salvage types", () => {
		const allIds = getAllSalvageModelIds();
		const expectedIds = Object.values(SALVAGE_DEFS).flatMap((d) => [
			...d.models,
		]);
		expect(allIds).toEqual(expectedIds);
		expect(allIds.length).toBeGreaterThan(0);
	});
});

describe("getSalvageTypeForModel", () => {
	it("returns correct type for known model", () => {
		for (const [type, def] of Object.entries(SALVAGE_DEFS)) {
			for (const modelId of def.models) {
				expect(getSalvageTypeForModel(modelId)).toBe(type);
			}
		}
	});

	it("returns null for unknown model", () => {
		expect(getSalvageTypeForModel("nonexistent_model")).toBeNull();
	});
});
