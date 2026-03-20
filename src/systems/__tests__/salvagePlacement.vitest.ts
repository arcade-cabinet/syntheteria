import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import { SALVAGE_DEFS } from "../../resources";
import type { FloorType } from "../../terrain/types";
import { SalvageProp } from "../../traits";
import { placeSalvageProps, TERRAIN_SALVAGE } from "../salvagePlacement";

function makeTile(
	x: number,
	z: number,
	floorType: FloorType,
	passable = true,
): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable,
		floorType,
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

function makeBoard(tiles: TileData[][], seed = "test-seed"): GeneratedBoard {
	const height = tiles.length;
	const width = tiles[0]?.length ?? 0;
	return {
		config: { width, height, seed, difficulty: "normal" },
		tiles,
	};
}

/** Create a uniform board of one floor type. */
function uniformBoard(
	floorType: FloorType,
	width: number,
	height: number,
	seed = "test-seed",
): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z, floorType));
		}
		tiles.push(row);
	}
	return makeBoard(tiles, seed);
}

describe("placeSalvageProps", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("places no salvage on void_pit tiles", () => {
		const board = uniformBoard("void_pit", 20, 20);
		const count = placeSalvageProps(world, board);
		expect(count).toBe(0);
		expect(world.query(SalvageProp).length).toBe(0);
	});

	it("places salvage on structural_mass tiles", () => {
		const board = uniformBoard("structural_mass", 30, 30);
		const count = placeSalvageProps(world, board);
		expect(count).toBeGreaterThan(0);
		expect(world.query(SalvageProp).length).toBe(count);
	});

	it("structural_mass has highest density among passable terrain", () => {
		const size = 50;

		// Use the beforeEach world for structural_mass
		const structuralBoard = uniformBoard("structural_mass", size, size);
		const structuralCount = placeSalvageProps(world, structuralBoard);

		// Create + destroy temp worlds for comparison
		const transitWorld = createWorld();
		const transitBoard = uniformBoard("transit_deck", size, size);
		const transitCount = placeSalvageProps(transitWorld, transitBoard);
		transitWorld.destroy();

		const bioWorld = createWorld();
		const bioBoard = uniformBoard("bio_district", size, size);
		const bioCount = placeSalvageProps(bioWorld, bioBoard);
		bioWorld.destroy();

		expect(structuralCount).toBeGreaterThan(transitCount);
		expect(structuralCount).toBeGreaterThan(bioCount);
	});

	it("is deterministic with the same seed", () => {
		// First run uses the beforeEach world
		const board1 = uniformBoard("collapsed_zone", 20, 20, "deterministic");
		const count1 = placeSalvageProps(world, board1);

		const entities1 = world.query(SalvageProp);
		const props1 = entities1
			.map((e) => e.get(SalvageProp)!)
			.sort((a, b) => a.tileX - b.tileX || a.tileZ - b.tileZ)
			.map((p) => ({
				salvageType: p.salvageType,
				modelId: p.modelId,
				tileX: p.tileX,
				tileZ: p.tileZ,
			}));

		// Second run in a temp world
		const world2 = createWorld();
		const board2 = uniformBoard("collapsed_zone", 20, 20, "deterministic");
		const count2 = placeSalvageProps(world2, board2);

		const entities2 = world2.query(SalvageProp);
		const props2 = entities2
			.map((e) => e.get(SalvageProp)!)
			.sort((a, b) => a.tileX - b.tileX || a.tileZ - b.tileZ)
			.map((p) => ({
				salvageType: p.salvageType,
				modelId: p.modelId,
				tileX: p.tileX,
				tileZ: p.tileZ,
			}));
		world2.destroy();

		expect(count1).toBe(count2);
		expect(count1).toBeGreaterThan(0);
		expect(props1).toEqual(props2);
	});

	it("different seeds produce different results", () => {
		const boardA = uniformBoard("collapsed_zone", 20, 20, "seed-alpha");
		const countA = placeSalvageProps(world, boardA);

		const propsA = world
			.query(SalvageProp)
			.map((e) => e.get(SalvageProp)!)
			.sort((a, b) => a.tileX - b.tileX || a.tileZ - b.tileZ);

		const worldB = createWorld();
		const boardB = uniformBoard("collapsed_zone", 20, 20, "seed-beta");
		const countB = placeSalvageProps(worldB, boardB);

		const propsB = worldB
			.query(SalvageProp)
			.map((e) => e.get(SalvageProp)!)
			.sort((a, b) => a.tileX - b.tileX || a.tileZ - b.tileZ);
		worldB.destroy();

		// At least one difference in position or type
		const anyDiff =
			countA !== countB ||
			propsA.some(
				(p, i) =>
					p.tileX !== propsB[i]?.tileX ||
					p.tileZ !== propsB[i]?.tileZ ||
					p.salvageType !== propsB[i]?.salvageType,
			);
		expect(anyDiff).toBe(true);
	});

	it("spawned salvage props have valid modelId from SALVAGE_DEFS", () => {
		const board = uniformBoard("dust_district", 30, 30);
		placeSalvageProps(world, board);

		const entities = world.query(SalvageProp);
		expect(entities.length).toBeGreaterThan(0);

		for (const entity of entities) {
			const prop = entity.get(SalvageProp)!;
			const def = SALVAGE_DEFS[prop.salvageType];
			expect(def).toBeDefined();
			expect(def.models).toContain(prop.modelId);
			expect(prop.harvestDuration).toBe(def.harvestDuration);
			expect(prop.hp).toBe(def.hp);
			expect(prop.maxHp).toBe(def.hp);
			expect(prop.consumed).toBe(false);
		}
	});

	it("respects terrain-specific salvage type distributions", () => {
		const board = uniformBoard("structural_mass", 50, 50);
		placeSalvageProps(world, board);

		const entities = world.query(SalvageProp);
		const types = entities.map((e) => e.get(SalvageProp)!.salvageType);

		const machineryCount = types.filter((t) => t === "machinery").length;
		const terminalCount = types.filter((t) => t === "terminal").length;

		// machinery (0.4) + terminal (0.3) should dominate
		expect(machineryCount + terminalCount).toBeGreaterThan(types.length * 0.5);
	});

	it("each terrain type only produces configured salvage types", () => {
		const floorTypes: FloorType[] = [
			"structural_mass",
			"collapsed_zone",
			"transit_deck",
			"durasteel_span",
			"dust_district",
			"bio_district",
			"aerostructure",
			"abyssal_platform",
		];

		// Reuse a single world, resetting between floor types
		for (const floorType of floorTypes) {
			const board = uniformBoard(floorType, 40, 40);
			const w = createWorld();
			placeSalvageProps(w, board);

			const cfg = TERRAIN_SALVAGE[floorType];
			const allowedTypes = new Set(cfg.weights.map(([t]) => t));

			for (const entity of w.query(SalvageProp)) {
				const prop = entity.get(SalvageProp)!;
				expect(allowedTypes.has(prop.salvageType)).toBe(true);
			}
			w.destroy();
		}
	});

	it("sets correct tile coordinates on spawned props", () => {
		const board = uniformBoard("collapsed_zone", 20, 20);
		placeSalvageProps(world, board);

		for (const entity of world.query(SalvageProp)) {
			const prop = entity.get(SalvageProp)!;
			expect(prop.tileX).toBeGreaterThanOrEqual(0);
			expect(prop.tileX).toBeLessThan(20);
			expect(prop.tileZ).toBeGreaterThanOrEqual(0);
			expect(prop.tileZ).toBeLessThan(20);
		}
	});
});
