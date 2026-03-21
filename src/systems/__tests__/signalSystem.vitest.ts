import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Building,
	Powered,
	SignalNode,
	UnitPos,
	UnitStats,
} from "../../traits";
import { isInSignalRange, runSignalNetwork } from "../signalSystem";

function spawnRelay(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
	range: number,
	powered: boolean,
) {
	const traits = [
		Building({
			tileX: x,
			tileZ: z,
			buildingType: "relay_tower" as any,
			modelId: "test",
			factionId: "player",
			hp: 35,
			maxHp: 35,
		}),
		SignalNode({ range, strength: 1.0 }),
	];
	const entity = world.spawn(...traits);
	if (powered) {
		entity.add(Powered);
	}
	return entity;
}

function spawnUnit(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
	scanRange: number,
) {
	return world.spawn(
		UnitPos({ tileX: x, tileZ: z }),
		UnitStats({
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
			scanRange,
			attack: 2,
			defense: 0,
		}),
	);
}

describe("runSignalNetwork", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("powered relay covers tiles within tier-scaled range", () => {
		spawnRelay(world, 5, 5, 3, true);

		expect(isInSignalRange(world, 5, 5)).toBe(true); // Same tile
		expect(isInSignalRange(world, 7, 5)).toBe(true); // Distance 2
		expect(isInSignalRange(world, 8, 5)).toBe(true); // Distance 3
		// Tier 1 relay has effective range 10, so distance 4 is still covered
		expect(isInSignalRange(world, 9, 5)).toBe(true); // Distance 4
		expect(isInSignalRange(world, 15, 5)).toBe(true); // Distance 10
		expect(isInSignalRange(world, 16, 5)).toBe(false); // Distance 11
	});

	it("unpowered relay provides no coverage", () => {
		spawnRelay(world, 5, 5, 10, false);

		expect(isInSignalRange(world, 5, 5)).toBe(false);
		expect(isInSignalRange(world, 6, 5)).toBe(false);
	});

	it("relay chaining extends coverage", () => {
		// Relay A at (0, 0) with base range 5
		spawnRelay(world, 0, 0, 5, true);
		// Relay B at (4, 0) with base range 5 — within A's range, extends from B
		spawnRelay(world, 4, 0, 5, true);

		// Both relays are tier 1 with effective range 10
		// A covers up to distance 10 from (0,0) = tiles up to (10, 0)
		expect(isInSignalRange(world, 10, 0)).toBe(true);
		// B covers up to distance 10 from (4,0) = tiles up to (14, 0)
		expect(isInSignalRange(world, 14, 0)).toBe(true);
		// Beyond B's effective range
		expect(isInSignalRange(world, 15, 0)).toBe(false);
	});

	it("unit outside signal range has halved scanRange and -1 AP", () => {
		spawnRelay(world, 0, 0, 3, true);
		const unit = spawnUnit(world, 50, 50, 8);

		runSignalNetwork(world);

		expect(unit.get(UnitStats)!.scanRange).toBe(4);
		expect(unit.get(UnitStats)!.ap).toBe(2); // 3 - 1 = 2
	});

	it("unit inside signal range keeps full scanRange and AP", () => {
		spawnRelay(world, 5, 5, 3, true);
		const unit = spawnUnit(world, 5, 5, 8);

		runSignalNetwork(world);

		expect(unit.get(UnitStats)!.scanRange).toBe(8);
		expect(unit.get(UnitStats)!.ap).toBe(3); // unchanged
	});

	it("AP penalty clamps at 0 for units with 0 AP", () => {
		spawnRelay(world, 0, 0, 3, true);
		const unit = world.spawn(
			UnitPos({ tileX: 50, tileZ: 50 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		runSignalNetwork(world);

		expect(unit.get(UnitStats)!.ap).toBe(0); // max(0, 0-1) = 0
	});

	it("isInSignalRange returns correct values for edge cases", () => {
		// No relays at all
		expect(isInSignalRange(world, 0, 0)).toBe(false);

		// Relay with range 0 covers nothing (range <= 0 is skipped)
		spawnRelay(world, 10, 10, 0, true);
		expect(isInSignalRange(world, 10, 10)).toBe(false);
	});

	it("odd scanRange halves with floor rounding", () => {
		spawnRelay(world, 0, 0, 3, true);
		const unit = spawnUnit(world, 50, 50, 7);

		runSignalNetwork(world);

		expect(unit.get(UnitStats)!.scanRange).toBe(3); // floor(7/2) = 3
	});
});
