import { createStartingRoster } from "./startingRoster";

describe("startingRoster", () => {
	it("spawns the 5-unit starting roster per BOT_AND_ECONOMY_REDESIGN", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });

		// 5 units + lightning_rod + motor_pool = 7 entities
		expect(roster).toHaveLength(7);
		expect(roster.filter((entity) => entity.unitType !== null)).toHaveLength(5);
		expect(
			roster.filter((entity) => entity.buildingType !== null),
		).toHaveLength(2);
	});

	it("includes a motor pool building", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const motorPool = roster.find((e) => e.buildingType === "motor_pool");
		expect(motorPool).toMatchObject({
			powered: true,
			operational: true,
			rodCapacity: null,
			currentOutput: null,
			protectionRadius: null,
		});
	});

	it("starts with Technician selected and camera broken", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const technician = roster.find(
			(entity) => entity.unitType === "maintenance_bot",
		);
		expect(technician).toMatchObject({
			unitType: "maintenance_bot",
			botArchetypeId: "field_technician",
			selected: true,
		});
		const camera = technician?.components.find((c) => c.name === "camera");
		expect(camera?.functional).toBe(false);
	});

	it("includes the 5 canonical starting roles", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const unitTypes = roster.map((entity) => entity.unitType).filter(Boolean);

		expect(unitTypes).toContain("maintenance_bot"); // Technician
		expect(unitTypes).toContain("mecha_scout"); // Scout
		expect(unitTypes).toContain("field_fighter"); // Striker
		expect(unitTypes).toContain("fabrication_unit"); // Fabricator
		expect(unitTypes).toContain("mecha_golem"); // Guardian
	});

	it("does not include Hauler in starting roster (must be fabricated)", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const unitTypes = roster.map((entity) => entity.unitType).filter(Boolean);
		expect(unitTypes).not.toContain("utility_drone");
	});

	it("Fabricator is now a mobile unit (not a building)", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const fabricator = roster.find(
			(entity) => entity.unitType === "fabrication_unit",
		);
		expect(fabricator).toBeDefined();
		// Fabricator is a mobile unit, not a stationary building
		expect(fabricator?.buildingType).toBeNull();
	});

	it("includes a lightning rod building", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		const rod = roster.find(
			(entity) => entity.buildingType === "lightning_rod",
		);
		expect(rod).toMatchObject({
			powered: true,
			operational: true,
		});
	});

	it("all starting bots are Mark 1 player faction", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });
		for (const entity of roster.filter((e) => e.unitType !== null)) {
			expect(entity.markLevel).toBe(1);
			expect(entity.faction).toBe("player");
		}
	});
});
