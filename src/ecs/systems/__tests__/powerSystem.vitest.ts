import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, Powered, PowerGrid } from "../../traits/building";
import { isPowered, runPowerGrid } from "../powerSystem";

function spawnBuilding(
	world: ReturnType<typeof createWorld>,
	type: string,
	x: number,
	z: number,
	powerDelta: number,
	powerRadius: number,
	storageCapacity: number,
	currentCharge = 0,
) {
	const entity = world.spawn(
		Building({
			tileX: x,
			tileZ: z,
			buildingType: type as any,
			modelId: "test",
			factionId: "player",
			hp: 50,
			maxHp: 50,
		}),
		PowerGrid({
			powerDelta,
			storageCapacity,
			currentCharge,
			powerRadius,
		}),
	);
	return entity;
}

describe("runPowerGrid", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("transmitter charges nearby power box", () => {
		// Transmitter at (5, 5) with radius 12
		spawnBuilding(world, "storm_transmitter", 5, 5, 5, 12, 0);
		// Power box at (10, 5) — distance 5, within radius 12
		spawnBuilding(world, "power_box", 10, 5, 0, 0, 20, 0);

		runPowerGrid(world);

		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		expect(boxes.length).toBe(1);
		const pg = boxes[0]!.get(PowerGrid)!;
		expect(pg.currentCharge).toBe(5);
	});

	it("power box charge is capped at storageCapacity", () => {
		spawnBuilding(world, "storm_transmitter", 5, 5, 5, 12, 0);
		// Power box already nearly full
		spawnBuilding(world, "power_box", 6, 5, 0, 0, 20, 18);

		runPowerGrid(world);

		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		const pg = boxes[0]!.get(PowerGrid)!;
		expect(pg.currentCharge).toBe(20); // Capped, not 23
	});

	it("consumer in transmitter range is powered without draining a box", () => {
		// Transmitter at (5, 5), radius 12
		spawnBuilding(world, "storm_transmitter", 5, 5, 5, 12, 0);
		// Power box at (6, 5), charge 10
		spawnBuilding(world, "power_box", 6, 5, 0, 0, 20, 10);
		// Synthesizer at (8, 5), powerDelta -4, within transmitter range
		spawnBuilding(world, "synthesizer", 8, 5, -4, 0, 0);

		runPowerGrid(world);

		// Consumer should be powered
		const consumers = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "synthesizer");
		expect(consumers[0]!.has(Powered)).toBe(true);

		// Power box should not have been drained by the consumer
		// (only charged by transmitter: 10 + 5 = 15)
		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		expect(boxes[0]!.get(PowerGrid)!.currentCharge).toBe(15);
	});

	it("consumer draws from power box when out of transmitter range", () => {
		// Transmitter at (0, 0), radius 3
		spawnBuilding(world, "storm_transmitter", 0, 0, 5, 3, 0);
		// Power box at (2, 0) — in transmitter range, starts with 10 charge
		spawnBuilding(world, "power_box", 2, 0, 0, 0, 20, 10);
		// Consumer at (20, 0) — out of transmitter range, powerDelta -4
		spawnBuilding(world, "synthesizer", 20, 0, -4, 0, 0);

		runPowerGrid(world);

		// Consumer powered from box
		const consumers = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "synthesizer");
		expect(consumers[0]!.has(Powered)).toBe(true);

		// Box charge: started 10, gained 5 from transmitter = 15, then consumer drew 4 = 11
		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		expect(boxes[0]!.get(PowerGrid)!.currentCharge).toBe(11);
	});

	it("out-of-range building is unpowered", () => {
		// Transmitter at (0, 0), radius 3
		spawnBuilding(world, "storm_transmitter", 0, 0, 5, 3, 0);
		// No power box — consumer at (50, 50), far away
		spawnBuilding(world, "synthesizer", 50, 50, -4, 0, 0);

		runPowerGrid(world);

		const consumers = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "synthesizer");
		expect(consumers[0]!.has(Powered)).toBe(false);
	});

	it("power box depletes when consumed", () => {
		// No transmitter nearby — box starts with 6 charge
		spawnBuilding(world, "power_box", 5, 5, 0, 0, 20, 6);
		// Two consumers near the box, each drawing 3
		spawnBuilding(world, "motor_pool", 6, 5, -3, 0, 0);
		spawnBuilding(world, "maintenance_bay", 7, 5, -2, 0, 0);

		runPowerGrid(world);

		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		// 6 - 3 - 2 = 1
		expect(boxes[0]!.get(PowerGrid)!.currentCharge).toBe(1);

		// Both should be powered
		const consumers = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(PowerGrid)!.powerDelta < 0);
		for (const c of consumers) {
			expect(c.has(Powered)).toBe(true);
		}
	});

	it("consumer unpowered when box has insufficient charge", () => {
		// Box with only 2 charge
		spawnBuilding(world, "power_box", 5, 5, 0, 0, 20, 2);
		// Consumer drawing 4 — not enough
		spawnBuilding(world, "synthesizer", 6, 5, -4, 0, 0);

		runPowerGrid(world);

		const consumers = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "synthesizer");
		expect(consumers[0]!.has(Powered)).toBe(false);

		// Box should not have been drained (demand > supply)
		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		expect(boxes[0]!.get(PowerGrid)!.currentCharge).toBe(2);
	});

	it("Powered trait is removed when power is lost", () => {
		// Box with 5 charge, consumer drawing 4
		spawnBuilding(world, "power_box", 5, 5, 0, 0, 20, 5);
		const consumer = spawnBuilding(world, "synthesizer", 6, 5, -4, 0, 0);

		// First run — powered
		runPowerGrid(world);
		expect(consumer.has(Powered)).toBe(true);

		// Drain box manually to 0
		const boxes = world
			.query(Building, PowerGrid)
			.filter((e) => e.get(Building)!.buildingType === "power_box");
		boxes[0]!.set(PowerGrid, {
			...boxes[0]!.get(PowerGrid)!,
			currentCharge: 0,
		});

		// Second run — no power available
		runPowerGrid(world);
		expect(consumer.has(Powered)).toBe(false);
	});
});

describe("isPowered", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("tile within transmitter radius is powered", () => {
		spawnBuilding(world, "storm_transmitter", 10, 10, 5, 12, 0);

		expect(isPowered(world, 10, 10)).toBe(true); // Same tile
		expect(isPowered(world, 15, 10)).toBe(true); // Distance 5
		expect(isPowered(world, 22, 10)).toBe(true); // Distance 12
		expect(isPowered(world, 23, 10)).toBe(false); // Distance 13
	});

	it("tile near charged power box is powered", () => {
		spawnBuilding(world, "power_box", 10, 10, 0, 0, 20, 5);

		expect(isPowered(world, 10, 10)).toBe(true); // Same tile
		expect(isPowered(world, 14, 10)).toBe(true); // Distance 4
		expect(isPowered(world, 16, 10)).toBe(true); // Distance 6
		expect(isPowered(world, 17, 10)).toBe(false); // Distance 7
	});

	it("tile near empty power box is not powered", () => {
		spawnBuilding(world, "power_box", 10, 10, 0, 0, 20, 0);

		expect(isPowered(world, 10, 10)).toBe(false);
		expect(isPowered(world, 11, 10)).toBe(false);
	});

	it("tile with no nearby power sources is not powered", () => {
		expect(isPowered(world, 50, 50)).toBe(false);
	});
});
