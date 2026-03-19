import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../../board/types";
import { FACTION_DEFINITIONS } from "../../factions/definitions";
import {
	computeSpawnCenters,
	type SimpleBoardInfo,
} from "../../robots/placement";
import { Building, PowerGrid, StorageCapacity } from "../../traits/building";
import { placeStarterBuildings } from "../buildingPlacement";

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

function makePassableBoard(
	width: number,
	height: number,
	seed = "test-seed",
): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z, true));
		}
		tiles.push(row);
	}
	const board: GeneratedBoard = {
		config: { width, height, seed, difficulty: "normal" },
		tiles,
	};
	// Pre-compute spawn centers so placeStarterBuildings can find faction locations
	computeSpawnCenters({
		width,
		height,
		isPassable: (x, z) => board.tiles[z]?.[x]?.passable ?? false,
		getFloorType: (x, z) => board.tiles[z]?.[x]?.floorType,
	});
	return board;
}

describe("placeStarterBuildings", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("places buildings for all factions", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		const buildings = world.query(Building);
		// Each faction gets 2 buildings (storm_transmitter + storage_hub)
		expect(buildings.length).toBe(FACTION_DEFINITIONS.length * 2);
	});

	it("each faction gets a storm_transmitter and storage_hub", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		for (const faction of FACTION_DEFINITIONS) {
			const factionBuildings = world
				.query(Building)
				.filter((e) => e.get(Building)!.factionId === faction.id);

			expect(factionBuildings.length).toBe(2);

			const types = factionBuildings.map((e) => e.get(Building)!.buildingType);
			expect(types).toContain("storm_transmitter");
			expect(types).toContain("storage_hub");
		}
	});

	it("storm_transmitter has PowerGrid trait", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		const transmitters = world
			.query(Building)
			.filter((e) => e.get(Building)!.buildingType === "storm_transmitter");

		for (const t of transmitters) {
			expect(t.has(PowerGrid)).toBe(true);
			const pg = t.get(PowerGrid)!;
			expect(pg.powerDelta).toBe(5);
			expect(pg.powerRadius).toBe(12);
		}
	});

	it("storage_hub has StorageCapacity trait", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		const hubs = world
			.query(Building)
			.filter((e) => e.get(Building)!.buildingType === "storage_hub");

		for (const h of hubs) {
			expect(h.has(StorageCapacity)).toBe(true);
			const sc = h.get(StorageCapacity)!;
			expect(sc.capacity).toBe(50);
		}
	});

	it("buildings are placed at valid tile coordinates", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		for (const entity of world.query(Building)) {
			const b = entity.get(Building)!;
			expect(b.tileX).toBeGreaterThanOrEqual(0);
			expect(b.tileX).toBeLessThan(30);
			expect(b.tileZ).toBeGreaterThanOrEqual(0);
			expect(b.tileZ).toBeLessThan(30);
		}
	});

	it("no two buildings share the same tile", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		const positions = new Set<string>();
		for (const entity of world.query(Building)) {
			const b = entity.get(Building)!;
			const key = `${b.tileX},${b.tileZ}`;
			expect(positions.has(key)).toBe(false);
			positions.add(key);
		}
	});

	it("buildings have correct hp from BUILDING_DEFS", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		for (const entity of world.query(Building)) {
			const b = entity.get(Building)!;
			if (b.buildingType === "storm_transmitter") {
				expect(b.hp).toBe(40);
				expect(b.maxHp).toBe(40);
			} else if (b.buildingType === "storage_hub") {
				expect(b.hp).toBe(40);
				expect(b.maxHp).toBe(40);
			}
		}
	});

	it("buildings have correct modelId from BUILDING_DEFS", () => {
		const board = makePassableBoard(30, 30);
		placeStarterBuildings(world, board);

		for (const entity of world.query(Building)) {
			const b = entity.get(Building)!;
			if (b.buildingType === "storm_transmitter") {
				expect(b.modelId).toBe("antenna_1");
			} else if (b.buildingType === "storage_hub") {
				expect(b.modelId).toBe("resource_warehouse");
			}
		}
	});
});
