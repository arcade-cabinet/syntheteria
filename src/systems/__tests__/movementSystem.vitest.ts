import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { movementSystem } from "../movementSystem";
import { Tile, TileHighlight, UnitMove, UnitPos, UnitStats } from "../../traits";

describe("movementSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("increases progress over time", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
			}),
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
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
			}),
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
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
			}),
		);

		movementSystem(world, 1.0);

		const stats = e.get(UnitStats)!;
		expect(stats.mp).toBe(1); // 3 - 2
	});

	it("MP never goes below 0", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 5 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 2,
				maxMp: 3,
				scanRange: 4,
			}),
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
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
			}),
		);

		// 0.9 + (0.5 * 4) = 2.9, clamp to 1.0 → complete
		movementSystem(world, 0.5);

		expect(e.has(UnitMove)).toBe(false);
		expect(e.get(UnitPos)!.tileX).toBe(1);
	});

	it("movement completion reveals tiles within scan range via fog system", () => {
		// Spawn tiles in a small grid — all start unexplored (default)
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				world.spawn(
					Tile({ x, z, elevation: 0, passable: true }),
					TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
				);
			}
		}

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 2, toZ: 2, progress: 0, mpCost: 1 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 2,
			}),
		);

		movementSystem(world, 1.0);

		// Tiles near destination (2,2) within scanRange=2 are explored
		// Tiles far from destination remain unexplored
		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			const dist = Math.abs(tile.x - 2) + Math.abs(tile.z - 2);
			if (dist <= 2) {
				expect(tile.explored).toBe(true);
			}
		}
	});

	it("increments movesUsed on move completion", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				movesUsed: 0,
			}),
		);

		movementSystem(world, 1.0);

		expect(e.get(UnitStats)!.movesUsed).toBe(1);
	});

	it("tiles remain unexplored during partial move progress (fog not yet cleared)", () => {
		world.spawn(
			Tile({ x: 1, z: 0, elevation: 0, passable: true }),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitMove({ fromX: 0, fromZ: 0, toX: 1, toZ: 0, progress: 0, mpCost: 1 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
			}),
		);

		// Partial move — revealFog hasn't fired yet
		movementSystem(world, 0.1);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			// Tile stays at default (unexplored) until move completes
			expect(tile.explored).toBe(false);
			expect(tile.visibility).toBe(0);
		}
	});
});
