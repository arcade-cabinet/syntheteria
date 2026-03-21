import { describe, expect, it } from "vitest";
import type { BuildingType } from "../../traits";
import {
	isBuildingUnlocked,
	MOTOR_POOL_MARK_TIERS,
	MOTOR_POOL_UNIT_TIERS,
	STARTER_BUILDINGS,
} from "../buildingUnlockDefs";

describe("buildingUnlockDefs", () => {
	describe("STARTER_BUILDINGS", () => {
		it("contains 6 starter types", () => {
			expect(STARTER_BUILDINGS).toHaveLength(6);
		});

		it.each(
			STARTER_BUILDINGS as unknown as BuildingType[],
		)("%s is always unlocked", (type) => {
			const owned = new Map<BuildingType, number>();
			expect(isBuildingUnlocked(type, owned)).toBe(true);
		});
	});

	describe("isBuildingUnlocked", () => {
		it("synthesizer is always unlocked", () => {
			const owned = new Map<BuildingType, number>();
			expect(isBuildingUnlocked("synthesizer", owned)).toBe(true);
		});

		it("analysis_node is always unlocked", () => {
			const owned = new Map<BuildingType, number>();
			expect(isBuildingUnlocked("analysis_node", owned)).toBe(true);
		});

		it("power_plant is locked without storm_transmitter tier 2", () => {
			const owned = new Map<BuildingType, number>();
			expect(isBuildingUnlocked("power_plant", owned)).toBe(false);
		});

		it("power_plant unlocks with storm_transmitter at tier 2", () => {
			const owned = new Map<BuildingType, number>([["storm_transmitter", 2]]);
			expect(isBuildingUnlocked("power_plant", owned)).toBe(true);
		});

		it("geothermal_tap requires storm_transmitter tier 3", () => {
			const owned2 = new Map<BuildingType, number>([["storm_transmitter", 2]]);
			expect(isBuildingUnlocked("geothermal_tap", owned2)).toBe(false);

			const owned3 = new Map<BuildingType, number>([["storm_transmitter", 3]]);
			expect(isBuildingUnlocked("geothermal_tap", owned3)).toBe(true);
		});

		it("maintenance_bay requires motor_pool tier 2", () => {
			const none = new Map<BuildingType, number>();
			expect(isBuildingUnlocked("maintenance_bay", none)).toBe(false);

			const owned = new Map<BuildingType, number>([["motor_pool", 2]]);
			expect(isBuildingUnlocked("maintenance_bay", owned)).toBe(true);
		});

		it("resource_refinery requires synthesizer tier 2", () => {
			const owned = new Map<BuildingType, number>([["synthesizer", 2]]);
			expect(isBuildingUnlocked("resource_refinery", owned)).toBe(true);
		});

		it("wormhole_stabilizer requires storm_transmitter + synthesizer at tier 3", () => {
			const partial = new Map<BuildingType, number>([["storm_transmitter", 3]]);
			expect(isBuildingUnlocked("wormhole_stabilizer", partial)).toBe(false);

			const full = new Map<BuildingType, number>([
				["storm_transmitter", 3],
				["synthesizer", 3],
			]);
			expect(isBuildingUnlocked("wormhole_stabilizer", full)).toBe(true);
		});
	});

	describe("MOTOR_POOL_UNIT_TIERS", () => {
		it("tier 1 allows scout, worker, infantry", () => {
			expect(MOTOR_POOL_UNIT_TIERS[1]).toEqual(
				expect.arrayContaining(["scout", "worker", "infantry"]),
			);
			expect(MOTOR_POOL_UNIT_TIERS[1]).not.toContain("cavalry");
			expect(MOTOR_POOL_UNIT_TIERS[1]).not.toContain("ranged");
			expect(MOTOR_POOL_UNIT_TIERS[1]).not.toContain("support");
		});

		it("tier 2 adds support, cavalry, ranged", () => {
			expect(MOTOR_POOL_UNIT_TIERS[2]).toContain("support");
			expect(MOTOR_POOL_UNIT_TIERS[2]).toContain("cavalry");
			expect(MOTOR_POOL_UNIT_TIERS[2]).toContain("ranged");
		});

		it("tier 3 has same classes as tier 2", () => {
			expect(MOTOR_POOL_UNIT_TIERS[3]).toEqual(MOTOR_POOL_UNIT_TIERS[2]);
		});
	});

	describe("MOTOR_POOL_MARK_TIERS", () => {
		it("tier 1 max mark is 1", () => {
			expect(MOTOR_POOL_MARK_TIERS[1]).toBe(1);
		});

		it("tier 2 max mark is 2", () => {
			expect(MOTOR_POOL_MARK_TIERS[2]).toBe(2);
		});

		it("tier 3 max mark is 5", () => {
			expect(MOTOR_POOL_MARK_TIERS[3]).toBe(5);
		});
	});
});
