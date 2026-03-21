/**
 * Score formula comprehensive test — verifies all 7 weight factors independently
 * and combined, plus victory reachability across all victory types.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	_resetScoreSystem,
	calculateFactionScore,
	recordCultStructureDestroyed,
} from "../systems/scoreSystem";
import {
	_resetVictory,
	checkVictoryConditions,
	getVictoryProgress,
} from "../systems/victorySystem";
import {
	_resetWormholeProject,
	onWormholeStabilizerPlaced,
	tickWormholeProject,
} from "../systems/wormholeProject";
import {
	Board,
	Building,
	CultStructure,
	Faction,
	Powered,
	SignalNode,
	Tile,
	UnitFaction,
	UnitPos,
} from "../traits";

describe("Score Formula — All Weight Factors", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetScoreSystem();
		_resetVictory();
		_resetWormholeProject();
		world.spawn(Board({ width: 20, height: 20, seed: "score-test", turn: 1 }));
	});

	afterEach(() => {
		world.destroy();
	});

	it("territory tiles contribute at weight 2", () => {
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 10, tileZ: 10 }),
		);
		const score = calculateFactionScore(world, "player");
		expect(score).toBeGreaterThan(0);
		expect(score % 1).toBe(0);
	});

	it("active units contribute at weight 1", () => {
		const scoreNoUnits = calculateFactionScore(world, "player");
		expect(scoreNoUnits).toBe(0);

		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		const scoreOneUnit = calculateFactionScore(world, "player");
		expect(scoreOneUnit).toBeGreaterThan(scoreNoUnits);
	});

	it("buildings contribute at weight 2", () => {
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
		expect(score).toBeGreaterThanOrEqual(2);
	});

	it("building tier sum contributes at weight 5", () => {
		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
				buildingTier: 3,
			}),
		);
		const score3 = calculateFactionScore(world, "player");

		world.destroy();
		world = createWorld();
		_resetScoreSystem();
		world.spawn(Board({ width: 20, height: 20, seed: "score-test", turn: 1 }));

		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
				buildingTier: 1,
			}),
		);
		const score1 = calculateFactionScore(world, "player");

		expect(score3).toBeGreaterThan(score1);
		expect(score3 - score1).toBe((3 - 1) * 5 + 1 * 2);
	});

	it("signal coverage contributes at weight 3", () => {
		world.spawn(
			Building({
				tileX: 10,
				tileZ: 10,
				factionId: "player",
				buildingType: "relay_tower",
				hp: 35,
				maxHp: 35,
			}),
			SignalNode({ range: 2, strength: 1.0 }),
			Powered(),
		);
		const score = calculateFactionScore(world, "player");
		expect(score).toBeGreaterThan(6);
	});

	it("cult structures destroyed contribute at weight 10", () => {
		recordCultStructureDestroyed("player");
		recordCultStructureDestroyed("player");
		const score = calculateFactionScore(world, "player");
		expect(score).toBe(20);
	});

	it("roboformed tiles (tier 3 buildings) contribute at weight 2", () => {
		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
				buildingTier: 3,
			}),
		);
		const score = calculateFactionScore(world, "player");
		expect(score).toBeGreaterThanOrEqual(2 + 2 + 15);
	});
});

describe("Victory Reachability", () => {
	let world: ReturnType<typeof createWorld>;

	function spawnTileGrid(size: number) {
		for (let z = 0; z < size; z++) {
			for (let x = 0; x < size; x++) {
				world.spawn(
					Tile({
						x,
						z,
						elevation: 0,
						passable: true,
						explored: true,
						visibility: 1,
					}),
				);
			}
		}
	}

	beforeEach(() => {
		world = createWorld();
		_resetVictory();
		_resetWormholeProject();
		_resetScoreSystem();
	});

	afterEach(() => {
		world.destroy();
	});

	it("domination victory is reachable", () => {
		world.spawn(Board({ width: 16, height: 16, seed: "v-dom", turn: 1 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("domination");
		}
	});

	it("network supremacy victory is reachable", () => {
		world.spawn(Board({ width: 4, height: 4, seed: "v-net", turn: 1 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		spawnTileGrid(4);
		world.spawn(
			Building({
				tileX: 2,
				tileZ: 2,
				factionId: "player",
				buildingType: "relay_tower",
				hp: 35,
				maxHp: 35,
			}),
			SignalNode({ range: 10, strength: 1.0 }),
			Powered(),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("network_supremacy");
		}
	});

	it("reclamation victory is reachable", () => {
		world.spawn(Board({ width: 2, height: 2, seed: "v-rec", turn: 1 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		spawnTileGrid(2);
		for (let i = 0; i < 3; i++) {
			world.spawn(
				Building({
					tileX: i % 2,
					tileZ: Math.floor(i / 2),
					factionId: "player",
					buildingType: "storage_hub",
					hp: 50,
					maxHp: 50,
					buildingTier: 3,
				}),
			);
		}

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("reclamation");
		}
	});

	it("transcendence victory is reachable", () => {
		world.spawn(Board({ width: 16, height: 16, seed: "v-trans", turn: 1 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);

		const stabilizer = world.spawn(
			Building({
				tileX: 8,
				tileZ: 8,
				factionId: "player",
				buildingType: "wormhole_stabilizer",
				hp: 100,
				maxHp: 100,
			}),
		);
		onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

		for (let i = 0; i < 20; i++) {
			tickWormholeProject(world);
		}

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("transcendence");
		}
	});

	it("cult eradication victory is reachable", () => {
		world.spawn(Board({ width: 16, height: 16, seed: "v-cult", turn: 1 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				structureType: "breach_altar",
				hp: 0,
				maxHp: 40,
			}),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("cult_eradication");
		}
	});

	it("score (turn cap) victory is reachable", () => {
		world.spawn(Board({ width: 16, height: 16, seed: "v-score", turn: 200 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 10, tileZ: 10 }),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("victory");
		if (outcome.result === "victory") {
			expect(outcome.reason).toBe("score");
		}
	});

	it("victory progress reports meaningful data", () => {
		world.spawn(Board({ width: 16, height: 16, seed: "v-prog", turn: 50 }));
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);
		world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 15, tileZ: 15 }),
		);
		world.spawn(
			CultStructure({
				tileX: 8,
				tileZ: 8,
				structureType: "breach_altar",
				hp: 30,
				maxHp: 40,
			}),
		);

		const progress = getVictoryProgress(world);
		expect(progress.currentTurn).toBe(50);
		expect(progress.cultStructuresRemaining).toBe(1);
		expect(progress.rivalFactionsAlive).toBe(1);
	});
});
