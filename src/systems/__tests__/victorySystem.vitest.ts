import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
} from "../../traits";
import {
	_resetScoreSystem,
	recordCultStructureDestroyed,
} from "../scoreSystem";
import {
	_resetVictory,
	checkVictoryConditions,
	getVictoryProgress,
} from "../victorySystem";
import { _resetWormholeProject } from "../wormholeProject";

function spawnBoard(
	world: ReturnType<typeof createWorld>,
	turn = 1,
	w = 16,
	h = 16,
) {
	return world.spawn(
		Board({ width: w, height: h, seed: "test", tileSizeM: 2, turn }),
	);
}

function spawnTileGrid(world: ReturnType<typeof createWorld>, size: number) {
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

describe("victorySystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetVictory();
		_resetWormholeProject();
		_resetScoreSystem();
		spawnBoard(world);
	});

	afterEach(() => {
		world.destroy();
	});

	it("returns 'playing' when player and AI units both exist", () => {
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);
		world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("playing");
	});

	it("returns defeat when no player units or buildings remain", () => {
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome).toEqual({ result: "defeat", reason: "elimination" });
	});

	it("defeat: player with only building (hp=0) counts as eliminated", () => {
		world.spawn(
			Building({
				tileX: 0,
				tileZ: 0,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 0,
				maxHp: 50,
			}),
		);
		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("defeat");
	});

	it("no defeat when player has a building with hp > 0 but no units", () => {
		world.spawn(
			Building({
				tileX: 0,
				tileZ: 0,
				factionId: "player",
				buildingType: "storage_hub",
				hp: 50,
				maxHp: 50,
			}),
		);
		const outcome = checkVictoryConditions(world);
		expect(outcome.result).not.toBe("defeat");
	});

	describe("domination victory", () => {
		it("triggers when all rival machine factions have no units or buildings", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// Rival faction entity exists (was in game) but has no units/buildings
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("victory");
			if (outcome.result === "victory") {
				expect(outcome.reason).toBe("domination");
				expect(outcome.winnerId).toBe("player");
			}
		});

		it("does not trigger when a rival still has units", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 5, tileZ: 5 }),
			);
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});

		it("does not trigger when a rival still has buildings with hp > 0", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				Building({
					tileX: 5,
					tileZ: 5,
					factionId: "reclaimers",
					buildingType: "storage_hub",
					hp: 50,
					maxHp: 50,
				}),
			);
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});

		it("does not trigger if no rival faction ever existed", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// No rival Faction entities

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});

		it("cult factions do not count as rivals for domination", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "null_monks" }),
				UnitPos({ tileX: 5, tileZ: 5 }),
			);
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("victory");
			if (outcome.result === "victory") {
				expect(outcome.reason).toBe("domination");
			}
		});
	});

	describe("network supremacy victory", () => {
		it("triggers when signal coverage >= 80% of passable tiles", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// Create a small 4x4 tile grid = 16 passable tiles
			spawnTileGrid(world, 4);
			// A single relay with range 10 covers all 16 tiles easily
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

		it("does not trigger when coverage < 80%", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// Large grid, small relay
			spawnTileGrid(world, 20);
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

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});
	});

	describe("reclamation victory", () => {
		it("triggers when >= 60% of passable tiles have tier 3+ buildings", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// 2x2 grid = 4 passable tiles. Need 60% = 3 tiles with tier 3+ buildings.
			spawnTileGrid(world, 2);
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

		it("does not trigger when buildings are below tier 3", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			spawnTileGrid(world, 2);
			for (let i = 0; i < 3; i++) {
				world.spawn(
					Building({
						tileX: i % 2,
						tileZ: Math.floor(i / 2),
						factionId: "player",
						buildingType: "storage_hub",
						hp: 50,
						maxHp: 50,
						buildingTier: 2,
					}),
				);
			}

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});
	});

	describe("transcendence victory", () => {
		it("triggers when wormhole project is completed", async () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// Manually set wormhole project state to completed
			const { _resetWormholeProject: reset } = await import(
				"../wormholeProject"
			);
			reset();
			// We need to manipulate the internal state — use the tick mechanism
			// Instead, we'll import and call the relevant functions
			const { onWormholeStabilizerPlaced, tickWormholeProject } = await import(
				"../wormholeProject"
			);

			// Place a stabilizer building
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

			// Tick 20 times to complete
			for (let i = 0; i < 20; i++) {
				tickWormholeProject(world);
			}

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("victory");
			if (outcome.result === "victory") {
				expect(outcome.reason).toBe("transcendence");
			}
		});
	});

	describe("cult eradication victory", () => {
		it("triggers when all cult structures have hp <= 0", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			// Cult structures exist but all destroyed (hp = 0)
			world.spawn(
				CultStructure({
					tileX: 5,
					tileZ: 5,
					structureType: "breach_altar",
					hp: 0,
					maxHp: 40,
				}),
			);
			world.spawn(
				CultStructure({
					tileX: 7,
					tileZ: 7,
					structureType: "corruption_node",
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

		it("does not trigger when a cult structure has hp > 0", () => {
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
			world.spawn(
				CultStructure({
					tileX: 7,
					tileZ: 7,
					structureType: "corruption_node",
					hp: 10,
					maxHp: 40,
				}),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});

		it("does not trigger when no cult structures ever existed", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);

			const outcome = checkVictoryConditions(world);
			// Should not be cult_eradication since cult never existed
			if (outcome.result === "victory") {
				expect(outcome.reason).not.toBe("cult_eradication");
			}
		});
	});

	describe("score (turn cap) victory", () => {
		it("triggers at turn 200 — highest score wins", () => {
			world.destroy();
			world = createWorld();
			spawnBoard(world, 200);
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
				expect(outcome.score).toBeDefined();
			}
		});

		it("does not trigger before turn 200", () => {
			world.destroy();
			world = createWorld();
			spawnBoard(world, 199);
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
			expect(outcome.result).toBe("playing");
		});
	});

	describe("no victory — none met → null/playing", () => {
		it("returns playing when conditions partially met", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));
			// One cult structure alive
			world.spawn(
				CultStructure({
					tileX: 8,
					tileZ: 8,
					structureType: "breach_altar",
					hp: 30,
					maxHp: 40,
				}),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});
	});

	describe("victoryProgress", () => {
		it("returns progress snapshot with new fields", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 5, tileZ: 5 }),
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
			world.spawn(Faction({ id: "reclaimers", displayName: "Reclaimers" }));
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);

			const progress = getVictoryProgress(world);
			expect(progress.networkCoveragePercent).toBe(0);
			expect(progress.reclamationPercent).toBe(0);
			expect(progress.currentTurn).toBe(1);
			expect(progress.wormholeTurnsRemaining).toBeNull();
			expect(progress.cultStructuresRemaining).toBe(1);
			expect(progress.rivalFactionsAlive).toBe(1);
		});
	});
});
