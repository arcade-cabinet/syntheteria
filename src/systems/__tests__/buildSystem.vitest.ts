import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TileData } from "../../board/types";
import { BUILDING_DEFS } from "../../buildings/definitions";
import {
	BotFabricator,
	Building,
	PowerGrid,
	SignalNode,
	StorageCapacity,
	TurretStats,
} from "../../traits/building";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import {
	_resetBuildSystem,
	cancelBuildPlacement,
	confirmBuildPlacement,
	getPendingBuildType,
	isInBuildPlacementMode,
	startBuildPlacement,
} from "../buildSystem";

function makeTile(x: number, z: number, passable = true): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable,
		floorType: "durasteel_span",
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

function makeBoard(width: number, height: number, passable = true) {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z, passable));
		}
		tiles.push(row);
	}
	return { tiles };
}

describe("buildSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetBuildSystem();
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnPlayerFaction(pool: Partial<Record<string, number>> = {}) {
		return world.spawn(
			Faction({
				id: "player",
				displayName: "Player",
				color: 0xffffff,
				persona: "otter",
				isPlayer: true,
				aggression: 0,
			}),
			ResourcePool(pool),
		);
	}

	describe("startBuildPlacement", () => {
		it("sets the pending build type", () => {
			expect(isInBuildPlacementMode()).toBe(false);
			startBuildPlacement(world, "storm_transmitter");
			expect(isInBuildPlacementMode()).toBe(true);
			expect(getPendingBuildType()).toBe("storm_transmitter");
		});
	});

	describe("cancelBuildPlacement", () => {
		it("clears the pending build type", () => {
			startBuildPlacement(world, "storm_transmitter");
			cancelBuildPlacement();
			expect(isInBuildPlacementMode()).toBe(false);
			expect(getPendingBuildType()).toBeNull();
		});
	});

	describe("confirmBuildPlacement", () => {
		it("spawns a building entity with correct traits", () => {
			spawnPlayerFaction({ ferrous_scrap: 10, conductor_wire: 10 });
			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10);
			const result = confirmBuildPlacement(world, 5, 5, board);

			expect(result).toBe(true);
			expect(isInBuildPlacementMode()).toBe(false);

			const buildings = world.query(Building);
			expect(buildings.length).toBe(1);

			const b = buildings[0].get(Building)!;
			expect(b.buildingType).toBe("storm_transmitter");
			expect(b.tileX).toBe(5);
			expect(b.tileZ).toBe(5);
			expect(b.factionId).toBe("player");
			expect(b.modelId).toBe("antenna_1");
			expect(b.hp).toBe(40);
			expect(b.maxHp).toBe(40);
		});

		it("attaches PowerGrid for storm_transmitter", () => {
			spawnPlayerFaction({ ferrous_scrap: 10, conductor_wire: 10 });
			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 5, 5, board);

			const buildings = world.query(Building);
			expect(buildings[0].has(PowerGrid)).toBe(true);
			const pg = buildings[0].get(PowerGrid)!;
			expect(pg.powerDelta).toBe(5);
			expect(pg.powerRadius).toBe(12);
		});

		it("attaches StorageCapacity for storage_hub", () => {
			spawnPlayerFaction({ ferrous_scrap: 10, polymer_salvage: 10 });
			startBuildPlacement(world, "storage_hub");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 3, 3, board);

			const buildings = world.query(Building);
			expect(buildings[0].has(StorageCapacity)).toBe(true);
			expect(buildings[0].get(StorageCapacity)!.capacity).toBe(50);
		});

		it("attaches SignalNode for relay_tower", () => {
			spawnPlayerFaction({ conductor_wire: 10, silicon_wafer: 10 });
			startBuildPlacement(world, "relay_tower");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 3, 3, board);

			const buildings = world.query(Building);
			expect(buildings[0].has(SignalNode)).toBe(true);
			expect(buildings[0].get(SignalNode)!.range).toBe(10);
			expect(buildings[0].get(SignalNode)!.strength).toBe(1.0);
		});

		it("attaches TurretStats for defense_turret", () => {
			spawnPlayerFaction({
				ferrous_scrap: 10,
				alloy_stock: 10,
				silicon_wafer: 10,
			});
			startBuildPlacement(world, "defense_turret");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 3, 3, board);

			const buildings = world.query(Building);
			expect(buildings[0].has(TurretStats)).toBe(true);
			const ts = buildings[0].get(TurretStats)!;
			expect(ts.attackDamage).toBe(3);
			expect(ts.attackRange).toBe(8);
			expect(ts.cooldownTurns).toBe(2);
		});

		it("attaches BotFabricator for motor_pool", () => {
			spawnPlayerFaction({
				ferrous_scrap: 10,
				alloy_stock: 10,
				conductor_wire: 10,
			});
			startBuildPlacement(world, "motor_pool");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 3, 3, board);

			const buildings = world.query(Building);
			expect(buildings[0].has(BotFabricator)).toBe(true);
			expect(buildings[0].get(BotFabricator)!.fabricationSlots).toBe(2);
		});

		it("deducts resources after placement", () => {
			const entity = spawnPlayerFaction({
				ferrous_scrap: 5,
				conductor_wire: 3,
			});
			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10);
			confirmBuildPlacement(world, 5, 5, board);

			// storm_transmitter costs: ferrous_scrap: 3, conductor_wire: 2
			const pool = entity.get(ResourcePool)!;
			expect(pool.ferrous_scrap).toBe(2);
			expect(pool.conductor_wire).toBe(1);
		});

		it("returns false when can't afford", () => {
			spawnPlayerFaction({ ferrous_scrap: 1 });
			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10);
			const result = confirmBuildPlacement(world, 5, 5, board);

			expect(result).toBe(false);
			// Still in placement mode — can try again
			expect(isInBuildPlacementMode()).toBe(true);
			expect(world.query(Building).length).toBe(0);
		});

		it("returns false on impassable tile", () => {
			spawnPlayerFaction({ ferrous_scrap: 10, conductor_wire: 10 });
			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10, false); // all impassable
			const result = confirmBuildPlacement(world, 5, 5, board);

			expect(result).toBe(false);
			expect(world.query(Building).length).toBe(0);
		});

		it("returns false on tile occupied by another building", () => {
			spawnPlayerFaction({ ferrous_scrap: 20, conductor_wire: 20 });

			// Place a building at (5,5)
			world.spawn(
				Building({
					tileX: 5,
					tileZ: 5,
					buildingType: "storage_hub",
					modelId: "resource_warehouse",
					factionId: "player",
					hp: 40,
					maxHp: 40,
				}),
			);

			startBuildPlacement(world, "storm_transmitter");

			const board = makeBoard(10, 10);
			const result = confirmBuildPlacement(world, 5, 5, board);

			expect(result).toBe(false);
		});

		it("returns false when not in placement mode", () => {
			spawnPlayerFaction({ ferrous_scrap: 10, conductor_wire: 10 });
			const board = makeBoard(10, 10);

			const result = confirmBuildPlacement(world, 5, 5, board);
			expect(result).toBe(false);
		});
	});
});
