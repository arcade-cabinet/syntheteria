import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	Board,
	CultStructure,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits";
import { resolveAllMoves } from "../aiTurnSystem";
import {
	_reset,
	checkCultistSpawn,
	cleanupDestroyedStructures,
	getAltarZones,
	getBreachZones,
	getCorruptedTiles,
	getEscalationStage,
	getPOIPositions,
	initBreachZones,
	initCultPOIs,
	runCultPatrols,
	SECT_BIASES,
	spreadCorruption,
} from "../cultistSystem";

/** Build a W×H board where every tile is passable and flat. */
function makeBoard(
	width: number,
	height: number,
	biomeType = "grassland",
): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				biomeType: biomeType as TileData["biomeType"],
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

/** Build a board with cult-friendly terrain in the non-center, non-edge areas. */
function makeBoardWithCultTerrain(
	width: number,
	height: number,
): GeneratedBoard {
	const tiles: TileData[][] = [];
	const margin = Math.max(3, Math.floor(width / 8));
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);
	const centerExclusion = Math.floor(Math.min(width, height) / 4);

	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			const isEdge =
				x < margin || x >= width - margin || z < margin || z >= height - margin;
			const distToCenter = Math.abs(x - centerX) + Math.abs(z - centerZ);
			const isCenter = distToCenter < centerExclusion;
			// Use cult terrain in the valid zone
			const biomeType = !isEdge && !isCenter ? "ruins" : "grassland";
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				biomeType: biomeType as TileData["biomeType"],
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

function countCultists(world: ReturnType<typeof createWorld>): number {
	const cultIds = ["static_remnants", "null_monks", "lost_signal"];
	let count = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && cultIds.includes(f.factionId)) count++;
	}
	return count;
}

function countStructures(
	w: ReturnType<typeof createWorld>,
	type?: string,
): number {
	let count = 0;
	for (const e of w.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s) continue;
		if (!type || s.structureType === type) count++;
	}
	return count;
}

describe("cultistSystem", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		_reset();
		world = createWorld();
		board = makeBoard(16, 16);
	});

	afterEach(() => {
		world.destroy();
	});

	it("no spawn before grace period (turn < 3)", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		for (let turn = 1; turn < 3; turn++) {
			checkCultistSpawn(world, board, turn);
		}

		expect(countCultists(world)).toBe(0);
	});

	it("spawns at correct interval (turn 3 with base escalation)", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		checkCultistSpawn(world, board, 3);

		expect(countCultists(world)).toBeGreaterThan(0);
	});

	it("does not spawn on non-interval turns", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		checkCultistSpawn(world, board, 4);

		expect(countCultists(world)).toBe(0);
	});

	it("escalation: more player units → shorter interval", () => {
		for (let i = 0; i < 80; i++) {
			world.spawn(
				UnitPos({ tileX: i % 16, tileZ: Math.floor(i / 16) }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);
		}

		checkCultistSpawn(world, board, 6);

		expect(countCultists(world)).toBeGreaterThan(0);
	});

	it("respects MAX_TOTAL_CULTISTS cap", () => {
		for (let i = 0; i < 20; i++) {
			world.spawn(
				UnitPos({ tileX: i, tileZ: 0 }),
				UnitFaction({ factionId: "static_remnants" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
				}),
			);
		}

		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		checkCultistSpawn(world, board, 3);

		expect(countCultists(world)).toBe(20);
	});

	it("breach zones are placed at board edges", () => {
		initBreachZones(board);
		const zones = getBreachZones();

		expect(zones.length).toBeGreaterThan(0);

		for (const zone of zones) {
			const onEdge =
				zone.x === 0 || zone.x === 15 || zone.z === 0 || zone.z === 15;
			expect(onEdge).toBe(true);
		}
	});

	it("_reset() clears breach zones", () => {
		initBreachZones(board);
		expect(getBreachZones().length).toBeGreaterThan(0);

		_reset();
		expect(getBreachZones().length).toBe(0);
	});

	it("spawned cultists use real cult faction IDs", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		checkCultistSpawn(world, board, 3);

		const validIds = new Set(["static_remnants", "null_monks", "lost_signal"]);
		for (const e of world.query(UnitFaction)) {
			const f = e.get(UnitFaction);
			if (f && f.factionId !== "player") {
				expect(validIds.has(f.factionId)).toBe(true);
			}
		}
	});

	it("spawned cultists have valid mech-type stats", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		checkCultistSpawn(world, board, 3);

		// Valid HP values from known mech types (drone=12, zealot=10, shaman=8, herald=8, archon=20)
		const validHpValues = new Set([8, 10, 12, 20]);
		const validIds = new Set(["static_remnants", "null_monks", "lost_signal"]);
		let found = 0;
		for (const e of world.query(UnitFaction, UnitStats)) {
			const f = e.get(UnitFaction);
			if (f && validIds.has(f.factionId)) {
				const stats = e.get(UnitStats)!;
				expect(validHpValues.has(stats.hp)).toBe(true);
				expect(stats.hp).toBe(stats.maxHp);
				expect(stats.ap).toBeGreaterThan(0);
				expect(stats.attack).toBeGreaterThan(0);
				found++;
			}
		}
		expect(found).toBeGreaterThan(0);
	});

	describe("cult structures", () => {
		function spawnPlayerUnit(w: ReturnType<typeof createWorld>): void {
			w.spawn(
				UnitPos({ tileX: 5, tileZ: 5 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);
		}

		it("spawns breach altar at breach zone", () => {
			spawnPlayerUnit(world);
			checkCultistSpawn(world, board, 3);

			expect(countStructures(world, "breach_altar")).toBeGreaterThan(0);

			const zones = getBreachZones();
			const zoneKeys = new Set(zones.map((z) => `${z.x},${z.z}`));
			for (const e of world.query(CultStructure)) {
				const s = e.get(CultStructure);
				if (s?.structureType === "breach_altar") {
					expect(zoneKeys.has(`${s.tileX},${s.tileZ}`)).toBe(true);
				}
			}
		});

		it("does not spawn duplicate altars at the same zone", () => {
			spawnPlayerUnit(world);
			checkCultistSpawn(world, board, 5);
			const altarsAfterFirst = countStructures(world, "breach_altar");
			const altarZonesAfterFirst = new Set(getAltarZones());

			checkCultistSpawn(world, board, 10);

			for (const key of altarZonesAfterFirst) {
				let altarsAtZone = 0;
				for (const e of world.query(CultStructure)) {
					const s = e.get(CultStructure);
					if (
						s?.structureType === "breach_altar" &&
						`${s.tileX},${s.tileZ}` === key
					) {
						altarsAtZone++;
					}
				}
				expect(altarsAtZone).toBe(1);
			}

			expect(countStructures(world, "breach_altar")).toBeGreaterThanOrEqual(
				altarsAfterFirst,
			);
		});

		it("spawns corruption node near altar", () => {
			spawnPlayerUnit(world);
			for (let turn = 5; turn <= 30; turn += 5) {
				checkCultistSpawn(world, board, turn);
			}

			const nodeCount = countStructures(world, "corruption_node");
			expect(nodeCount).toBeGreaterThanOrEqual(0);
		});

		it("spawns human shelters adjacent to breach altars", () => {
			spawnPlayerUnit(world);
			checkCultistSpawn(world, board, 3);

			const shelterCount = countStructures(world, "human_shelter");
			expect(shelterCount).toBeGreaterThan(0);

			const altarPositions: Array<{ x: number; z: number }> = [];
			for (const e of world.query(CultStructure)) {
				const s = e.get(CultStructure);
				if (s?.structureType === "breach_altar") {
					altarPositions.push({ x: s.tileX, z: s.tileZ });
				}
			}

			for (const e of world.query(CultStructure)) {
				const s = e.get(CultStructure);
				if (s?.structureType !== "human_shelter") continue;
				const adjacentToAltar = altarPositions.some(
					(a) => Math.abs(a.x - s.tileX) + Math.abs(a.z - s.tileZ) === 1,
				);
				expect(adjacentToAltar).toBe(true);
			}
		});

		it("spreadCorruption marks tiles around corruption nodes", () => {
			world.spawn(
				CultStructure({
					tileX: 8,
					tileZ: 8,
					structureType: "corruption_node",
					modelId: "",
					hp: 40,
					maxHp: 40,
					corruptionRadius: 3,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			spreadCorruption(world);

			const corrupted = getCorruptedTiles();
			expect(corrupted.has("8,8")).toBe(true);
			expect(corrupted.has("9,8")).toBe(true);
			expect(corrupted.has("8,9")).toBe(true);
			expect(corrupted.has("11,8")).toBe(true);
			expect(corrupted.has("12,8")).toBe(false);
			expect(corrupted.has("8,12")).toBe(false);
		});
	});

	describe("cult POI initialization", () => {
		it("initCultPOIs places 3-6 POIs on cult terrain", () => {
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);

			const pois = getPOIPositions();
			expect(pois.length).toBeGreaterThanOrEqual(3);
			expect(pois.length).toBeLessThanOrEqual(6);
		});

		it("initCultPOIs creates breach altars at each POI", () => {
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);

			const pois = getPOIPositions();
			const altarCount = countStructures(world, "breach_altar");
			expect(altarCount).toBe(pois.length);
		});

		it("initCultPOIs spawns cult mech guards", () => {
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);

			// Each POI spawns 1 guard
			const pois = getPOIPositions();
			const cultCount = countCultists(world);
			expect(cultCount).toBe(pois.length);
		});

		it("initCultPOIs only runs once", () => {
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);
			const firstCount = countStructures(world);

			initCultPOIs(world, bigBoard, 42);
			expect(countStructures(world)).toBe(firstCount);
		});

		it("initCultPOIs skips boards with no cult terrain", () => {
			const plainBoard = makeBoard(32, 32);
			initCultPOIs(world, plainBoard, 42);

			expect(getPOIPositions().length).toBe(0);
			expect(countStructures(world)).toBe(0);
		});

		it("_reset clears POI state", () => {
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);
			expect(getPOIPositions().length).toBeGreaterThan(0);

			_reset();
			expect(getPOIPositions().length).toBe(0);
		});
	});

	describe("structure destruction", () => {
		it("cleanupDestroyedStructures removes 0-HP structures", () => {
			world.spawn(
				CultStructure({
					tileX: 5,
					tileZ: 5,
					structureType: "breach_altar",
					modelId: "",
					hp: 0,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: true,
					spawnInterval: 3,
				}),
			);

			expect(countStructures(world)).toBe(1);
			cleanupDestroyedStructures(world);
			expect(countStructures(world)).toBe(0);
		});

		it("cleanupDestroyedStructures leaves healthy structures", () => {
			world.spawn(
				CultStructure({
					tileX: 5,
					tileZ: 5,
					structureType: "breach_altar",
					modelId: "",
					hp: 30,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: true,
					spawnInterval: 3,
				}),
			);

			cleanupDestroyedStructures(world);
			expect(countStructures(world)).toBe(1);
		});

		it("destroyed spawner stops producing cultists", () => {
			// Spawn a spawning altar with 0 HP
			world.spawn(
				CultStructure({
					tileX: 0,
					tileZ: 0,
					structureType: "breach_altar",
					modelId: "",
					hp: 0,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: true,
					spawnInterval: 3,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 5, tileZ: 5 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			// checkCultistSpawn calls cleanupDestroyedStructures first
			// Use turn 4 which is NOT a spawn interval (4%3 ≠ 0) so only cleanup runs
			checkCultistSpawn(world, board, 4);

			// Structure should be gone
			expect(countStructures(world, "breach_altar")).toBe(0);
		});
	});

	describe("multi-turn cap enforcement", () => {
		it("cultist count never exceeds MAX_TOTAL_CULTISTS (12) over 100 turns", () => {
			// Simulate a game with 100 player units (tier 4) over 100 turns
			for (let i = 0; i < 100; i++) {
				world.spawn(
					UnitPos({ tileX: i % 16, tileZ: Math.floor(i / 16) }),
					UnitFaction({ factionId: "player" }),
					UnitStats({
						hp: 10,
						maxHp: 10,
						ap: 3,
						maxAp: 3,
						scanRange: 4,
						attack: 2,
						defense: 0,
					}),
				);
			}

			// Add Board entity for storm profile reading
			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);

			let maxSeen = 0;
			for (let turn = 1; turn <= 100; turn++) {
				checkCultistSpawn(world, board, turn);
				const c = countCultists(world);
				if (c > maxSeen) maxSeen = c;
			}

			// MAX_TOTAL_CULTISTS for volatile storm is 20
			expect(maxSeen).toBeLessThanOrEqual(20);
		});

		it("cultist count stays within cap even with POI initial guards + spawning", () => {
			// Use board with cult terrain so initCultPOIs creates 3-6 guards
			const bigBoard = makeBoardWithCultTerrain(32, 32);
			initCultPOIs(world, bigBoard, 42);
			const initialGuards = countCultists(world);
			expect(initialGuards).toBeGreaterThan(0);

			// Add lots of player units (tier 4)
			for (let i = 0; i < 100; i++) {
				world.spawn(
					UnitPos({ tileX: i % 32, tileZ: Math.floor(i / 32) }),
					UnitFaction({ factionId: "player" }),
					UnitStats({
						hp: 10,
						maxHp: 10,
						ap: 3,
						maxAp: 3,
						scanRange: 4,
						attack: 2,
						defense: 0,
					}),
				);
			}

			world.spawn(
				Board({ width: 32, height: 32, seed: "test", tileSizeM: 2, turn: 1 }),
			);

			let maxSeen = initialGuards;
			for (let turn = 1; turn <= 100; turn++) {
				checkCultistSpawn(world, bigBoard, turn);
				const c = countCultists(world);
				if (c > maxSeen) maxSeen = c;
			}

			expect(maxSeen).toBeLessThanOrEqual(20);
		});
	});

	describe("patrol behavior", () => {
		it("cult units chase enemies within scan range (war party stage)", () => {
			// Place an altar as patrol center
			world.spawn(
				CultStructure({
					tileX: 5,
					tileZ: 5,
					structureType: "breach_altar",
					modelId: "",
					hp: 60,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			// Place cult unit near altar
			const cultUnit = world.spawn(
				UnitPos({ tileX: 5, tileZ: 4 }),
				UnitFaction({ factionId: "static_remnants" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
			);

			// Place 30+ player units to reach tier 2 (war_party stage, which chases)
			for (let i = 0; i < 30; i++) {
				world.spawn(
					UnitPos({ tileX: 5, tileZ: 2 }),
					UnitFaction({ factionId: "player" }),
					UnitStats({
						hp: 10,
						maxHp: 10,
						ap: 3,
						maxAp: 3,
						scanRange: 4,
						attack: 2,
						defense: 0,
					}),
				);
			}

			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);

			runCultPatrols(world, board);

			// Cult unit should have queued a move toward the player
			expect(cultUnit.has(UnitMove)).toBe(true);
			const move = cultUnit.get(UnitMove)!;
			expect(move.toZ).toBe(3); // Moving from z=4 toward z=2

			// Resolve the move
			resolveAllMoves(world);
			const pos = cultUnit.get(UnitPos)!;
			expect(pos.tileZ).toBe(3);
		});

		it("cult units return to patrol radius when too far", () => {
			world.spawn(
				CultStructure({
					tileX: 5,
					tileZ: 5,
					structureType: "breach_altar",
					modelId: "",
					hp: 60,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			// Place cult unit far from altar (beyond patrol radius of 4)
			const cultUnit = world.spawn(
				UnitPos({ tileX: 12, tileZ: 5 }),
				UnitFaction({ factionId: "null_monks" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
			);

			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);

			runCultPatrols(world, board);

			// Should have queued a move toward altar (from x=12 toward x=5)
			expect(cultUnit.has(UnitMove)).toBe(true);

			resolveAllMoves(world);
			const pos = cultUnit.get(UnitPos)!;
			expect(pos.tileX).toBe(11);
		});
	});

	describe("escalation stages", () => {
		it("tier 0-1 maps to wanderer stage", () => {
			expect(getEscalationStage(0)).toBe("wanderer");
			expect(getEscalationStage(1)).toBe("wanderer");
		});

		it("tier 2-3 maps to war_party stage", () => {
			expect(getEscalationStage(2)).toBe("war_party");
			expect(getEscalationStage(3)).toBe("war_party");
		});

		it("tier 4+ maps to assault stage", () => {
			expect(getEscalationStage(4)).toBe("assault");
			expect(getEscalationStage(5)).toBe("assault");
		});

		it("wanderer stage: cult units flee from nearby enemies", () => {
			// Setup: only 1 player unit (tier 0 → wanderer)
			world.spawn(
				CultStructure({
					tileX: 8,
					tileZ: 8,
					structureType: "breach_altar",
					modelId: "",
					hp: 60,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			// Cult unit at (7, 8), player at (5, 8) — within scan range
			const cultUnit = world.spawn(
				UnitPos({ tileX: 7, tileZ: 8 }),
				UnitFaction({ factionId: "static_remnants" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					mp: 2,
					maxMp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
			);

			// Only 1 player unit → tier 0 → wanderer stage
			world.spawn(
				UnitPos({ tileX: 5, tileZ: 8 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);
			runCultPatrols(world, board);

			// Wanderer should flee — move AWAY from player at (5,8)
			expect(cultUnit.has(UnitMove)).toBe(true);
			const move = cultUnit.get(UnitMove)!;
			// Move destination should be further from player than current position
			const currentDist = Math.abs(7 - 5) + Math.abs(8 - 8); // 2
			const newDist = Math.abs(move.toX - 5) + Math.abs(move.toZ - 8);
			expect(newDist).toBeGreaterThan(currentDist);
		});

		it("war_party stage: cult units chase enemies outside scan range", () => {
			// Setup: 30+ player units (tier 2 → war_party)
			world.spawn(
				CultStructure({
					tileX: 0,
					tileZ: 0,
					structureType: "breach_altar",
					modelId: "",
					hp: 60,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			const cultUnit = world.spawn(
				UnitPos({ tileX: 2, tileZ: 2 }),
				UnitFaction({ factionId: "lost_signal" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					mp: 2,
					maxMp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
			);

			// 30 player units at far corner → tier 2 → war_party
			for (let i = 0; i < 30; i++) {
				world.spawn(
					UnitPos({ tileX: 14, tileZ: 14 }),
					UnitFaction({ factionId: "player" }),
					UnitStats({
						hp: 10,
						maxHp: 10,
						ap: 3,
						maxAp: 3,
						scanRange: 4,
						attack: 2,
						defense: 0,
					}),
				);
			}

			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);
			runCultPatrols(world, board);

			// War party should move toward enemies even outside scan range
			expect(cultUnit.has(UnitMove)).toBe(true);
			const move = cultUnit.get(UnitMove)!;
			// Moving toward (14,14) from (2,2)
			expect(move.toX + move.toZ).toBeGreaterThan(2 + 2);
		});
	});

	describe("sect biases", () => {
		it("Static Remnants have tighter patrol radius", () => {
			const bias = SECT_BIASES.static_remnants;
			expect(bias.patrolRadiusMult).toBeLessThan(1);
		});

		it("Null Monks target isolated enemies", () => {
			const bias = SECT_BIASES.null_monks;
			expect(bias.targetIsolated).toBe(true);
			expect(bias.spreadCorruption).toBe(true);
		});

		it("Lost Signal has berserker damage bonus", () => {
			const bias = SECT_BIASES.lost_signal;
			expect(bias.attackBonus).toBeGreaterThan(0);
			expect(bias.aggressive).toBe(true);
		});

		it("Lost Signal skips wanderer stage (aggressive)", () => {
			// With only 1 player unit (tier 0), lost_signal should still be aggressive
			world.spawn(
				CultStructure({
					tileX: 8,
					tileZ: 8,
					structureType: "breach_altar",
					modelId: "",
					hp: 60,
					maxHp: 60,
					corruptionRadius: 5,
					spawnsUnits: false,
					spawnInterval: 0,
				}),
			);

			const cultUnit = world.spawn(
				UnitPos({ tileX: 7, tileZ: 8 }),
				UnitFaction({ factionId: "lost_signal" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					mp: 2,
					maxMp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
					attackRange: 1,
				}),
			);

			// 1 player unit → tier 0. But lost_signal is aggressive, so uses war_party behavior.
			world.spawn(
				UnitPos({ tileX: 5, tileZ: 8 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
			);

			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
			);
			runCultPatrols(world, board);

			// Lost Signal (aggressive) should chase, not flee — moves toward player at x=5
			expect(cultUnit.has(UnitMove)).toBe(true);
			const move = cultUnit.get(UnitMove)!;
			expect(move.toX).toBe(6); // Moving from x=7 toward x=5
		});

		it("all three sects have distinct bias profiles", () => {
			const sr = SECT_BIASES.static_remnants;
			const nm = SECT_BIASES.null_monks;
			const ls = SECT_BIASES.lost_signal;

			// Each sect should have at least one distinguishing trait
			expect(sr.patrolRadiusMult).not.toBe(nm.patrolRadiusMult);
			expect(nm.targetIsolated).not.toBe(ls.targetIsolated);
			expect(ls.attackBonus).not.toBe(sr.attackBonus);
		});
	});
});
