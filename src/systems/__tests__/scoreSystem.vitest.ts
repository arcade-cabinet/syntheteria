import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Building,
	Powered,
	SignalNode,
	UnitFaction,
	UnitPos,
} from "../../traits";
import {
	_resetScoreSystem,
	calculateFactionScore,
	recordCultStructureDestroyed,
} from "../scoreSystem";

describe("scoreSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetScoreSystem();
	});

	afterEach(() => {
		world.destroy();
	});

	it("empty world → score 0", () => {
		expect(calculateFactionScore(world, "player")).toBe(0);
	});

	it("territory tiles contribute score at weight 1", () => {
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);
		const score = calculateFactionScore(world, "player");
		// A unit at (5,5) with TERRITORY_UNIT_RADIUS=2 claims tiles in manhattan distance 2
		// + 0.5 for the unit itself
		expect(score).toBeGreaterThan(0);
	});

	it("buildings contribute score at weight 1", () => {
		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
			}),
		);
		const score = calculateFactionScore(world, "player");
		// Building: 1 × weight_buildings + territory tiles × weight_territory
		expect(score).toBeGreaterThan(0);
	});

	it("active units contribute 0.5 each", () => {
		const scoreNone = calculateFactionScore(world, "player");
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		const scoreOne = calculateFactionScore(world, "player");
		// Adding one unit adds: territory tiles × 1 + 1 × 0.5
		expect(scoreOne).toBeGreaterThan(scoreNone);
		expect(scoreOne).toBeGreaterThanOrEqual(0.5);
	});

	it("cult structures destroyed contribute 5 each", () => {
		const scoreBefore = calculateFactionScore(world, "player");
		recordCultStructureDestroyed("player");
		const scoreAfter = calculateFactionScore(world, "player");
		expect(scoreAfter - scoreBefore).toBe(5);
	});

	it("multiple cult destructions accumulate", () => {
		recordCultStructureDestroyed("player");
		recordCultStructureDestroyed("player");
		recordCultStructureDestroyed("player");
		const score = calculateFactionScore(world, "player");
		expect(score).toBe(15); // 3 × 5
	});

	it("combined score calculation", () => {
		// 1 unit (territory + unit) + 1 building (territory + building) + 1 cult destroyed
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);
		world.spawn(
			Building({
				tileX: 10,
				tileZ: 10,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
			}),
		);
		recordCultStructureDestroyed("player");

		const score = calculateFactionScore(world, "player");
		// Should include: territory, units (0.5), buildings (1), cult destroyed (5)
		expect(score).toBeGreaterThan(6.5);
	});

	it("does not count other faction's assets", () => {
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);
		world.spawn(
			Building({
				tileX: 10,
				tileZ: 10,
				factionId: "reclaimers",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
			}),
		);

		expect(calculateFactionScore(world, "player")).toBe(0);
	});

	it("signal coverage contributes at weight 2", () => {
		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "relay_tower",
				hp: 35,
				maxHp: 35,
			}),
			SignalNode({ range: 3, strength: 1.0 }),
			Powered(),
		);

		const score = calculateFactionScore(world, "player");
		// Should include network coverage tiles × 2 + building territory + building
		expect(score).toBeGreaterThan(2);
	});

	it("reset clears destroyed cult structure counts", () => {
		recordCultStructureDestroyed("player");
		expect(calculateFactionScore(world, "player")).toBe(5);
		_resetScoreSystem();
		expect(calculateFactionScore(world, "player")).toBe(0);
	});
});
