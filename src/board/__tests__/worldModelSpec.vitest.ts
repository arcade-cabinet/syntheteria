/**
 * SPEC TESTS — GAME_DESIGN.md Section 2: World Model
 *
 * Each test asserts a specific claim from the design doc.
 * Tests that FAIL indicate gaps between spec and implementation.
 *
 * Covers:
 *   1. 9 terrain substrate types with correct passability
 *   2. Deterministic board generation (same seed = identical board)
 *   3. Three preset sector scales (Small 44x44, Standard 64x64, Large 96x96)
 *   4. Salvage props present after generation (PRIMARY resource source)
 *   5. Floor mining as backstop (mineable passable substrates)
 *   6. Bridges and tunnels (elevation stacking)
 *   7. Terrain yield correctness per GAME_DESIGN.md table
 *   8. Weight-class passability (abyssal_platform light-only)
 */

import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import { generateDepthLayer } from "../depth";
import { seededRng } from "../noise";
import type { BoardConfig, TileData } from "../types";
import {
	FLOOR_DEFS,
	isPassableFloor,
	type FloorType,
	type ResourceMaterial,
} from "../../ecs/terrain/types";
import { SECTOR_SCALE_SPECS } from "../../world/config";
import { SALVAGE_DEFS } from "../../ecs/resources/salvageTypes";
import type { SalvageType } from "../../ecs/traits/salvage";
import { isPassableFor, movementCost } from "../adjacency";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<BoardConfig> = {}): BoardConfig {
	return {
		width: 32,
		height: 32,
		seed: "spec-test-world-model",
		difficulty: "normal",
		...overrides,
	};
}

function allTiles(board: { tiles: TileData[][] }, w: number, h: number): TileData[] {
	const result: TileData[] = [];
	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			result.push(board.tiles[z]![x]!);
		}
	}
	return result;
}

function countByFloorType(tiles: TileData[]): Map<FloorType, number> {
	const counts = new Map<FloorType, number>();
	for (const t of tiles) {
		counts.set(t.floorType, (counts.get(t.floorType) ?? 0) + 1);
	}
	return counts;
}

// ─── Section 2.1: Terrain Substrates ─────────────────────────────────────────

describe("Section 2 — Terrain Substrates (9 types)", () => {
	const EXPECTED_FLOOR_TYPES: FloorType[] = [
		"void_pit",
		"structural_mass",
		"abyssal_platform",
		"transit_deck",
		"durasteel_span",
		"collapsed_zone",
		"dust_district",
		"bio_district",
		"aerostructure",
	];

	it("FloorType union has exactly 9 substrate types", () => {
		expect(Object.keys(FLOOR_DEFS)).toHaveLength(9);
		for (const ft of EXPECTED_FLOOR_TYPES) {
			expect(FLOOR_DEFS).toHaveProperty(ft);
		}
	});

	it("void_pit and structural_mass are impassable; others are passable", () => {
		expect(isPassableFloor("void_pit")).toBe(false);
		expect(isPassableFloor("structural_mass")).toBe(false);
		expect(isPassableFloor("abyssal_platform")).toBe(true);
		expect(isPassableFloor("transit_deck")).toBe(true);
		expect(isPassableFloor("durasteel_span")).toBe(true);
		expect(isPassableFloor("collapsed_zone")).toBe(true);
		expect(isPassableFloor("dust_district")).toBe(true);
		expect(isPassableFloor("bio_district")).toBe(true);
		expect(isPassableFloor("aerostructure")).toBe(true);
	});

	it("generated board contains at least 5 distinct floor types", () => {
		// A realistic board should use multiple substrate types
		const board = generateBoard(makeConfig({ width: 44, height: 44 }));
		const tiles = allTiles(board, 44, 44);
		const types = countByFloorType(tiles);
		expect(types.size).toBeGreaterThanOrEqual(5);
	});

	it("void_pit tiles are marked impassable in generated board", () => {
		const config = makeConfig({ width: 44, height: 44 });
		const board = generateBoard(config);
		const tiles = allTiles(board, 44, 44);
		const voidTiles = tiles.filter((t) => t.floorType === "void_pit");
		for (const t of voidTiles) {
			expect(t.passable).toBe(false);
		}
	});

	it("structural_mass tiles are marked impassable in generated board", () => {
		const config = makeConfig({ width: 44, height: 44 });
		const board = generateBoard(config);
		const tiles = allTiles(board, 44, 44);
		const massTiles = tiles.filter((t) => t.floorType === "structural_mass");
		for (const t of massTiles) {
			expect(t.passable).toBe(false);
		}
	});

	it("GAME_DESIGN primary yields match FLOOR_DEFS", () => {
		// Table from Section 2:
		const specYields: Record<FloorType, ResourceMaterial | null> = {
			void_pit: null,
			structural_mass: "intact_components",
			abyssal_platform: "thermal_fluid",
			transit_deck: "ferrous_scrap",
			durasteel_span: "ferrous_scrap",
			collapsed_zone: "scrap_metal",
			dust_district: "e_waste",
			bio_district: "polymer_salvage",
			aerostructure: "scrap_metal",
		};

		for (const [floor, expectedMaterial] of Object.entries(specYields)) {
			const def = FLOOR_DEFS[floor as FloorType];
			expect(def.resourceMaterial).toBe(expectedMaterial);
		}
	});
});

// ─── Section 2.2: Deterministic Generation ───────────────────────────────────

describe("Section 2 — Deterministic generation", () => {
	it("same seed + config produces identical boards (tile-by-tile)", () => {
		const config = makeConfig();
		const board1 = generateBoard(config);
		const board2 = generateBoard(config);

		for (let z = 0; z < config.height; z++) {
			for (let x = 0; x < config.width; x++) {
				const t1 = board1.tiles[z]![x]!;
				const t2 = board2.tiles[z]![x]!;
				expect(t1.floorType).toBe(t2.floorType);
				expect(t1.elevation).toBe(t2.elevation);
				expect(t1.passable).toBe(t2.passable);
				expect(t1.resourceMaterial).toBe(t2.resourceMaterial);
				expect(t1.resourceAmount).toBe(t2.resourceAmount);
			}
		}
	});

	it("different seeds produce different boards", () => {
		const board1 = generateBoard(makeConfig({ seed: "alpha" }));
		const board2 = generateBoard(makeConfig({ seed: "beta" }));

		let diffs = 0;
		for (let z = 0; z < 32; z++) {
			for (let x = 0; x < 32; x++) {
				if (board1.tiles[z]![x]!.floorType !== board2.tiles[z]![x]!.floorType) diffs++;
			}
		}
		expect(diffs).toBeGreaterThan(0);
	});

	it("determinism holds across 3 independent calls", () => {
		const config = makeConfig({ seed: "triple-check" });
		const boards = [generateBoard(config), generateBoard(config), generateBoard(config)];
		const tiles0 = allTiles(boards[0]!, config.width, config.height);
		const tiles1 = allTiles(boards[1]!, config.width, config.height);
		const tiles2 = allTiles(boards[2]!, config.width, config.height);

		for (let i = 0; i < tiles0.length; i++) {
			expect(tiles0[i]!.floorType).toBe(tiles1[i]!.floorType);
			expect(tiles1[i]!.floorType).toBe(tiles2[i]!.floorType);
		}
	});
});

// ─── Section 2.3: Preset Sector Scales ───────────────────────────────────────

describe("Section 2 — Three preset sector scales", () => {
	it("SECTOR_SCALE_SPECS defines small, standard, large", () => {
		expect(SECTOR_SCALE_SPECS).toHaveProperty("small");
		expect(SECTOR_SCALE_SPECS).toHaveProperty("standard");
		expect(SECTOR_SCALE_SPECS).toHaveProperty("large");
	});

	it("Small = 44x44 (~1,936 tiles)", () => {
		const spec = SECTOR_SCALE_SPECS.small;
		expect(spec.width).toBe(44);
		expect(spec.height).toBe(44);
	});

	it("Standard = 64x64 (~4,096 tiles)", () => {
		const spec = SECTOR_SCALE_SPECS.standard;
		expect(spec.width).toBe(64);
		expect(spec.height).toBe(64);
	});

	it("Large = 96x96 (~9,216 tiles)", () => {
		const spec = SECTOR_SCALE_SPECS.large;
		expect(spec.width).toBe(96);
		expect(spec.height).toBe(96);
	});

	it("Small board generates successfully at 44x44", () => {
		const board = generateBoard(makeConfig({ width: 44, height: 44 }));
		expect(board.tiles.length).toBe(44);
		expect(board.tiles[0]!.length).toBe(44);
	});

	it("Standard board generates successfully at 64x64", () => {
		const board = generateBoard(makeConfig({ width: 64, height: 64 }));
		expect(board.tiles.length).toBe(64);
		expect(board.tiles[0]!.length).toBe(64);
	});

	it("Large board generates successfully at 96x96", () => {
		const board = generateBoard(makeConfig({ width: 96, height: 96 }));
		expect(board.tiles.length).toBe(96);
		expect(board.tiles[0]!.length).toBe(96);
	});
});

// ─── Section 2.4: Salvage Props (PRIMARY resource source) ────────────────────

describe("Section 2 — Salvage props are PRIMARY resource source", () => {
	it("at least 5 salvage prop types are defined", () => {
		// GAME_DESIGN.md specifies 5: container, terminal, vessel, machinery, debris
		const types = Object.keys(SALVAGE_DEFS);
		expect(types.length).toBeGreaterThanOrEqual(5);
	});

	it("container: duration=4, yields polymer_salvage + scrap_metal", () => {
		const def = SALVAGE_DEFS.container;
		expect(def.harvestDuration).toBe(4);
		expect(def.yields).toHaveProperty("polymer_salvage");
		expect(def.yields).toHaveProperty("scrap_metal");
	});

	it("terminal: duration=8, yields silicon_wafer + conductor_wire", () => {
		const def = SALVAGE_DEFS.terminal;
		expect(def.harvestDuration).toBe(8);
		expect(def.yields).toHaveProperty("silicon_wafer");
		expect(def.yields).toHaveProperty("conductor_wire");
	});

	it("vessel: duration=5, yields electrolyte + scrap_metal", () => {
		const def = SALVAGE_DEFS.vessel;
		expect(def.harvestDuration).toBe(5);
		expect(def.yields).toHaveProperty("electrolyte");
		expect(def.yields).toHaveProperty("scrap_metal");
	});

	it("machinery: duration=8, yields ferrous_scrap + alloy_stock", () => {
		const def = SALVAGE_DEFS.machinery;
		expect(def.harvestDuration).toBe(8);
		expect(def.yields).toHaveProperty("ferrous_scrap");
		expect(def.yields).toHaveProperty("alloy_stock");
	});

	it("debris: duration=3, yields scrap_metal + ferrous_scrap", () => {
		const def = SALVAGE_DEFS.debris;
		expect(def.harvestDuration).toBe(3);
		expect(def.yields).toHaveProperty("scrap_metal");
		expect(def.yields).toHaveProperty("ferrous_scrap");
	});

	it("every salvage type has at least one GLB model ID", () => {
		for (const [type, def] of Object.entries(SALVAGE_DEFS)) {
			expect(def.models.length).toBeGreaterThanOrEqual(1);
		}
	});
});

// ─── Section 2.5: Floor Mining as Backstop ───────────────────────────────────

describe("Section 2 — Floor mining is the backstop", () => {
	it("void_pit is not mineable", () => {
		expect(FLOOR_DEFS.void_pit.mineable).toBe(false);
	});

	it("all passable floor types ARE mineable (backstop guarantee)", () => {
		const passableTypes: FloorType[] = [
			"abyssal_platform",
			"transit_deck",
			"durasteel_span",
			"collapsed_zone",
			"dust_district",
			"bio_district",
			"aerostructure",
		];
		for (const ft of passableTypes) {
			expect(FLOOR_DEFS[ft].mineable).toBe(true);
		}
	});

	it("structural_mass is mineable despite being impassable (mountain-mining)", () => {
		expect(FLOOR_DEFS.structural_mass.mineable).toBe(true);
	});

	it("every mineable floor has a non-null resourceMaterial", () => {
		for (const [name, def] of Object.entries(FLOOR_DEFS)) {
			if (def.mineable) {
				expect(def.resourceMaterial).not.toBeNull();
			}
		}
	});

	it("every mineable floor has resourceAmount[min] > 0", () => {
		for (const [name, def] of Object.entries(FLOOR_DEFS)) {
			if (def.mineable) {
				expect(def.resourceAmount[0]).toBeGreaterThan(0);
			}
		}
	});

	it("generated board has some tiles with resource deposits (floor scatter)", () => {
		const config = makeConfig({ width: 44, height: 44 });
		const board = generateBoard(config);
		const tiles = allTiles(board, 44, 44);
		const withResources = tiles.filter((t) => t.resourceMaterial !== null);
		// On a 44x44 board, at least SOME tiles should have scatter resources
		expect(withResources.length).toBeGreaterThan(0);
	});

	it("resource tiles have amount > 0", () => {
		const config = makeConfig({ width: 44, height: 44 });
		const board = generateBoard(config);
		const tiles = allTiles(board, 44, 44);
		for (const t of tiles) {
			if (t.resourceMaterial !== null) {
				expect(t.resourceAmount).toBeGreaterThan(0);
			}
		}
	});
});

// ─── Section 2.6: Bridges and Tunnels ────────────────────────────────────────

describe("Section 2 — Bridges and tunnels", () => {
	// Use a larger board and multiple seeds to increase chance of span generation
	const seeds = ["bridge-test-1", "bridge-test-2", "bridge-test-3", "bridge-test-4"];

	it("board contains elevated structure tiles (elevation=1)", () => {
		let foundElevated = false;
		for (const seed of seeds) {
			const config = makeConfig({ width: 44, height: 44, seed });
			const board = generateBoard(config);
			// Labyrinth generator creates structural_mass walls at elevation 1
			for (const row of board.tiles) {
				for (const tile of row) {
					if (tile.elevation === 1) {
						foundElevated = true;
						break;
					}
				}
				if (foundElevated) break;
			}
			if (foundElevated) break;
		}
		expect(foundElevated).toBe(true);
	});

	it("generateDepthLayer produces tunnel spans (elevation=-1 tiles)", () => {
		let foundTunnel = false;
		for (const seed of seeds) {
			const config = makeConfig({ width: 44, height: 44, seed });
			const board = generateBoard(config);
			const rng = seededRng(seed + "_depth");
			const layer = generateDepthLayer(board, rng);
			if (layer.spans.some((s) => s.type === "tunnel")) {
				foundTunnel = true;
				break;
			}
		}
		expect(foundTunnel).toBe(true);
	});

	it("bridge tiles have elevation=1 (raised over impassable terrain)", () => {
		for (const seed of seeds) {
			const config = makeConfig({ width: 44, height: 44, seed });
			const board = generateBoard(config);
			const rng = seededRng(seed + "_depth");
			const layer = generateDepthLayer(board, rng);
			for (const span of layer.spans.filter((s) => s.type === "bridge")) {
				// Body tiles (not entrances) have elevation 1
				const bodyTiles = span.tiles.filter(
					(t) => !span.entrances.some((e) => e.x === t.x && e.z === t.z),
				);
				for (const t of bodyTiles) {
					expect(t.elevation).toBe(1);
				}
			}
		}
	});

	it("each bridge/tunnel has exactly 2 entrances", () => {
		for (const seed of seeds) {
			const config = makeConfig({ width: 44, height: 44, seed });
			const board = generateBoard(config);
			const rng = seededRng(seed + "_depth");
			const layer = generateDepthLayer(board, rng);
			for (const span of layer.spans) {
				expect(span.entrances).toHaveLength(2);
			}
		}
	});

	it("no two spans share the same tile", () => {
		const config = makeConfig({ width: 44, height: 44, seed: "no-overlap" });
		const board = generateBoard(config);
		const rng = seededRng("no-overlap_depth");
		const layer = generateDepthLayer(board, rng);

		const used = new Set<string>();
		for (const span of layer.spans) {
			for (const t of span.tiles) {
				const key = `${t.x},${t.z}`;
				expect(used.has(key)).toBe(false);
				used.add(key);
			}
		}
	});
});

// ─── Section 2.7: 13 Resource Materials in 4 Tiers ──────────────────────────

describe("Section 2 — 13 resource materials in 4 tiers", () => {
	const FOUNDATION: ResourceMaterial[] = [
		"ferrous_scrap",
		"alloy_stock",
		"polymer_salvage",
		"conductor_wire",
	];
	const ADVANCED: ResourceMaterial[] = [
		"electrolyte",
		"silicon_wafer",
		"storm_charge",
		"el_crystal",
	];
	const COMMON: ResourceMaterial[] = [
		"scrap_metal",
		"e_waste",
		"intact_components",
	];
	const ABYSSAL: ResourceMaterial[] = [
		"thermal_fluid",
		"depth_salvage",
	];

	it("13 materials total across 4 tiers", () => {
		const all = [...FOUNDATION, ...ADVANCED, ...COMMON, ...ABYSSAL];
		expect(all).toHaveLength(13);
	});

	it("Foundation tier has 4 materials", () => {
		expect(FOUNDATION).toHaveLength(4);
	});

	it("Advanced tier has 4 materials", () => {
		expect(ADVANCED).toHaveLength(4);
	});

	it("Common tier has 3 materials", () => {
		expect(COMMON).toHaveLength(3);
	});

	it("Abyssal tier has 2 materials", () => {
		expect(ABYSSAL).toHaveLength(2);
	});

	it("all 13 materials are valid values in the ResourceMaterial type", () => {
		// Verify each exists as a possible yield in FLOOR_DEFS or SALVAGE_DEFS
		const allMaterials = [...FOUNDATION, ...ADVANCED, ...COMMON, ...ABYSSAL];
		const knownFromFloor = new Set(
			Object.values(FLOOR_DEFS)
				.map((d) => d.resourceMaterial)
				.filter(Boolean),
		);
		const knownFromSalvage = new Set(
			Object.values(SALVAGE_DEFS).flatMap((d) => Object.keys(d.yields)),
		);
		const allKnown = new Set([...knownFromFloor, ...knownFromSalvage]);

		for (const mat of allMaterials) {
			expect(allKnown.has(mat)).toBe(true);
		}
	});
});

// ─── Section 2.8: Player Start ───────────────────────────────────────────────

describe("Section 2 — Player start", () => {
	it("center tile is passable at elevation 0", () => {
		const config = makeConfig();
		const board = generateBoard(config);
		const cx = Math.floor(config.width / 2);
		const cz = Math.floor(config.height / 2);
		const center = board.tiles[cz]![cx]!;
		expect(center.passable).toBe(true);
		expect(center.elevation).toBe(0);
	});

	it("center tile is durasteel_span (default start floor)", () => {
		const config = makeConfig();
		const board = generateBoard(config);
		const cx = Math.floor(config.width / 2);
		const cz = Math.floor(config.height / 2);
		const center = board.tiles[cz]![cx]!;
		expect(center.floorType).toBe("durasteel_span");
	});

	it("center tile has no resource deposit (cleared for spawn)", () => {
		const config = makeConfig();
		const board = generateBoard(config);
		const cx = Math.floor(config.width / 2);
		const cz = Math.floor(config.height / 2);
		const center = board.tiles[cz]![cx]!;
		expect(center.resourceMaterial).toBeNull();
		expect(center.resourceAmount).toBe(0);
	});
});

// ─── Section 2.9: Weight Class Passability ───────────────────────────────────

describe("Section 2 — Weight-class terrain interaction", () => {
	it("abyssal_platform is passable for light units", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: 0, passable: true,
			floorType: "abyssal_platform",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(isPassableFor(tile, "light")).toBe(true);
	});

	it("abyssal_platform is NOT passable for medium units", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: 0, passable: true,
			floorType: "abyssal_platform",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(isPassableFor(tile, "medium")).toBe(false);
	});

	it("abyssal_platform is NOT passable for heavy units", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: 0, passable: true,
			floorType: "abyssal_platform",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(isPassableFor(tile, "heavy")).toBe(false);
	});

	it("abyssal_platform costs 2 MP for light units", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: 0, passable: true,
			floorType: "abyssal_platform",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(movementCost(tile, "light")).toBe(2);
	});

	it("void_pit is impassable for all weight classes", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: -1, passable: false,
			floorType: "void_pit",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(isPassableFor(tile, "light")).toBe(false);
		expect(isPassableFor(tile, "medium")).toBe(false);
		expect(isPassableFor(tile, "heavy")).toBe(false);
	});

	it("durasteel_span is passable for all weight classes", () => {
		const tile: TileData = {
			x: 0, z: 0, elevation: 0, passable: true,
			floorType: "durasteel_span",
			resourceMaterial: null, resourceAmount: 0,
		};
		expect(isPassableFor(tile, "light")).toBe(true);
		expect(isPassableFor(tile, "medium")).toBe(true);
		expect(isPassableFor(tile, "heavy")).toBe(true);
	});
});
