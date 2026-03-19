import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { movementSystem } from "../systems/movementSystem";
import { Tile, TileHighlight } from "../traits/tile";
import { UnitMove, UnitPos, UnitStats } from "../traits/unit";

describe("movementSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("increases progress over time", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4 }),
		);

		movementSystem(world, 0.1);

		// MOVE_SPEED = 4.0, so 0.1 * 4 = 0.4 progress
		const move = e.get(UnitMove)!;
		expect(move.progress).toBeCloseTo(0.4, 5);
	});

	it("completes move and updates position", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 3, toZ: 5, progress: 0, mpCost: 1 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4 }),
		);

		// 1.0 seconds at speed 4 = progress 4.0, clamped to 1.0
		movementSystem(world, 1.0);

		const pos = e.get(UnitPos)!;
		expect(pos.tileX).toBe(3);
		expect(pos.tileZ).toBe(5);
		expect(e.has(UnitMove)).toBe(false);
	});

	it("deducts MP on move completion", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 2 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4 }),
		);

		movementSystem(world, 1.0);

		const stats = e.get(UnitStats)!;
		expect(stats.mp).toBe(1); // 3 - 2
	});

	it("MP never goes below 0", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 5 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 2, maxMp: 3, scanRange: 4 }),
		);

		movementSystem(world, 1.0);

		const stats = e.get(UnitStats)!;
		expect(stats.mp).toBe(0);
	});

	it("progress clamps to 1.0", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({
				fromX: 0,
				fromZ: 0,
				toX: 1,
				toZ: 0,
				progress: 0.9,
				mpCost: 1,
			}),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4 }),
		);

		// 0.9 + (0.5 * 4) = 2.9, clamp to 1.0 → complete
		movementSystem(world, 0.5);

		expect(e.has(UnitMove)).toBe(false);
		expect(e.get(UnitPos)!.tileX).toBe(1);
	});

	it("reveals fog around destination tile on move completion", () => {
		// Spawn tiles in a small grid
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				world.spawn(
					Tile({ x, z, elevation: 0, passable: true, explored: false, visibility: 0 }),
					TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
				);
			}
		}

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 2, toZ: 2, progress: 0, mpCost: 1 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 2 }),
		);

		// Complete the move
		movementSystem(world, 1.0);

		// Tile at destination (2,2) should be explored
		let destExplored = false;
		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			if (tile.x === 2 && tile.z === 2) {
				destExplored = tile.explored;
			}
		}
		expect(destExplored).toBe(true);

		// Tile within scanRange (2,1) — dist=1 — should be explored
		let nearbyExplored = false;
		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			if (tile.x === 2 && tile.z === 1) {
				nearbyExplored = tile.explored;
			}
		}
		expect(nearbyExplored).toBe(true);
	});

	it("increments movesUsed on move completion", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4, movesUsed: 0 }),
		);

		movementSystem(world, 1.0);

		expect(e.get(UnitStats)!.movesUsed).toBe(1);
	});

	it("does not reveal fog while move is still in progress", () => {
		world.spawn(
			Tile({ x: 1, z: 0, elevation: 0, passable: true, explored: false, visibility: 0 }),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4 }),
		);

		// Only partial progress
		movementSystem(world, 0.1);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			expect(tile.explored).toBe(false);
			expect(tile.visibility).toBe(0);
		}
	});
});
