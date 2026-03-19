import { describe, expect, it } from "vitest";
import type { BuildingType } from "../../traits";
import { BUILDING_DEFS } from "../definitions";

const ALL_BUILDING_TYPES: BuildingType[] = [
	"storm_transmitter",
	"power_box",
	"synthesizer",
	"motor_pool",
	"relay_tower",
	"defense_turret",
	"storage_hub",
	"maintenance_bay",
	"power_plant",
	"research_lab",
	"resource_refinery",
	"solar_array",
	"geothermal_tap",
	"outpost",
	"wormhole_stabilizer",
];

describe("BUILDING_DEFS", () => {
	it("contains all 15 building types", () => {
		const keys = Object.keys(BUILDING_DEFS);
		expect(keys).toHaveLength(15);
		for (const type of ALL_BUILDING_TYPES) {
			expect(BUILDING_DEFS).toHaveProperty(type);
		}
	});

	describe.each(ALL_BUILDING_TYPES)("%s", (type) => {
		const def = BUILDING_DEFS[type];

		it("has displayName", () => {
			expect(def.displayName).toBeTruthy();
		});

		it("has modelId", () => {
			expect(def.modelId).toBeTruthy();
		});

		it("has assetPath", () => {
			expect(def.assetPath).toBeTruthy();
		});

		it("has hp > 0", () => {
			expect(def.hp).toBeGreaterThan(0);
		});

		it("has buildTime > 0", () => {
			expect(def.buildTime).toBeGreaterThan(0);
		});

		it("has buildCost with at least one material", () => {
			expect(Object.keys(def.buildCost).length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("storm_transmitter", () => {
		const def = BUILDING_DEFS.storm_transmitter;

		it("has positive powerDelta", () => {
			expect(def.powerDelta).toBeGreaterThan(0);
		});

		it("has powerRadius > 0", () => {
			expect(def.powerRadius).toBeGreaterThan(0);
		});
	});

	describe("power_box", () => {
		it("has storageCapacity > 0", () => {
			expect(BUILDING_DEFS.power_box.storageCapacity).toBeGreaterThan(0);
		});
	});

	describe("synthesizer", () => {
		it("has negative powerDelta", () => {
			expect(BUILDING_DEFS.synthesizer.powerDelta).toBeLessThan(0);
		});
	});

	describe("defense_turret", () => {
		const def = BUILDING_DEFS.defense_turret;

		it("has turretDamage > 0", () => {
			expect(def.turretDamage).toBeGreaterThan(0);
		});

		it("has turretRange > 0", () => {
			expect(def.turretRange).toBeGreaterThan(0);
		});
	});

	describe("motor_pool", () => {
		it("has fabricationSlots > 0", () => {
			expect(BUILDING_DEFS.motor_pool.fabricationSlots).toBeGreaterThan(0);
		});
	});

	describe("relay_tower", () => {
		it("has signalRange > 0", () => {
			expect(BUILDING_DEFS.relay_tower.signalRange).toBeGreaterThan(0);
		});
	});

	describe("power_plant", () => {
		const def = BUILDING_DEFS.power_plant;

		it("has positive powerDelta", () => {
			expect(def.powerDelta).toBeGreaterThan(0);
		});

		it("has powerRadius > 0", () => {
			expect(def.powerRadius).toBeGreaterThan(0);
		});
	});

	describe("research_lab", () => {
		const def = BUILDING_DEFS.research_lab;

		it("has negative powerDelta", () => {
			expect(def.powerDelta).toBeLessThan(0);
		});

		it("has signalRange > 0", () => {
			expect(def.signalRange).toBeGreaterThan(0);
		});
	});

	describe("resource_refinery", () => {
		it("has storageCapacity > 0", () => {
			expect(BUILDING_DEFS.resource_refinery.storageCapacity).toBeGreaterThan(
				0,
			);
		});
	});

	describe("solar_array", () => {
		const def = BUILDING_DEFS.solar_array;

		it("has positive powerDelta", () => {
			expect(def.powerDelta).toBeGreaterThan(0);
		});

		it("has powerRadius > 0", () => {
			expect(def.powerRadius).toBeGreaterThan(0);
		});
	});

	describe("geothermal_tap", () => {
		const def = BUILDING_DEFS.geothermal_tap;

		it("has positive powerDelta", () => {
			expect(def.powerDelta).toBeGreaterThan(0);
		});

		it("has powerRadius > 0", () => {
			expect(def.powerRadius).toBeGreaterThan(0);
		});
	});

	describe("outpost", () => {
		const def = BUILDING_DEFS.outpost;

		it("has storageCapacity > 0", () => {
			expect(def.storageCapacity).toBeGreaterThan(0);
		});

		it("has signalRange > 0", () => {
			expect(def.signalRange).toBeGreaterThan(0);
		});
	});

	describe("wormhole_stabilizer", () => {
		const def = BUILDING_DEFS.wormhole_stabilizer;

		it("has highest HP of all buildings", () => {
			expect(def.hp).toBe(200);
		});

		it("has heavy power draw", () => {
			expect(def.powerDelta).toBeLessThan(-10);
		});

		it("has signalRange > 0", () => {
			expect(def.signalRange).toBeGreaterThan(0);
		});

		it("costs intact_components", () => {
			expect(def.buildCost.intact_components).toBeGreaterThanOrEqual(50);
		});

		it("has 20-turn build time", () => {
			expect(def.buildTime).toBe(20);
		});
	});
});
