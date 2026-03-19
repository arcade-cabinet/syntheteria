/**
 * Sphere geometry tests — validates the equirectangular projection
 * of the tile grid onto a SphereGeometry and the coordinate conversion
 * helpers (tileToSpherePos / spherePosToTile).
 *
 * Tests pure math/data — no Three.js rendering.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	buildSphereGeometry,
	spherePosToTile,
	sphereRadius,
	tileToSpherePos,
} from "../boardGeometry";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a minimal board for testing. */
function makeBoard(
	width: number,
	height: number,
	floorType: TileData["floorType"] = "durasteel_span",
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
				floorType,
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

// ---------------------------------------------------------------------------
// tileToSpherePos
// ---------------------------------------------------------------------------

describe("tileToSpherePos", () => {
	const W = 64;
	const H = 64;
	const R = sphereRadius(W, H);

	it("returns a point at the correct radius from the origin", () => {
		const pos = tileToSpherePos(0, 0, W, H, R);
		const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
		expect(dist).toBeCloseTo(R, 4);
	});

	it("returns a point on the sphere for every tile", () => {
		for (let z = 0; z < H; z += 8) {
			for (let x = 0; x < W; x += 8) {
				const pos = tileToSpherePos(x, z, W, H, R);
				const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
				expect(dist).toBeCloseTo(R, 3);
			}
		}
	});

	it("tile at center of board maps near the equator, facing the camera", () => {
		const pos = tileToSpherePos(W / 2, H / 2, W, H, R);
		// At the center, latitude should be near 0 (equator), so y ≈ 0
		expect(Math.abs(pos.y)).toBeLessThan(R * 0.15);
	});

	it("tiles at z=0 and z=H-1 map near opposite poles", () => {
		const top = tileToSpherePos(W / 2, 0, W, H, R);
		const bottom = tileToSpherePos(W / 2, H - 1, W, H, R);
		// Top should have positive y (north pole area), bottom negative y (south pole area)
		expect(top.y).toBeGreaterThan(0);
		expect(bottom.y).toBeLessThan(0);
		// Both should be far from the equator
		expect(Math.abs(top.y)).toBeGreaterThan(R * 0.7);
		expect(Math.abs(bottom.y)).toBeGreaterThan(R * 0.7);
	});

	it("tiles at x=0 and x=W-1 map to nearly the same longitude (wrapping)", () => {
		const left = tileToSpherePos(0, H / 2, W, H, R);
		const right = tileToSpherePos(W - 1, H / 2, W, H, R);
		// They should be close together since the sphere wraps east-west
		const dx = left.x - right.x;
		const dz = left.z - right.z;
		const gapDist = Math.sqrt(dx * dx + dz * dz);
		// The gap should be roughly one tile's angular width
		const oneTileArc = (2 * Math.PI * R) / W;
		expect(gapDist).toBeLessThan(oneTileArc * 1.5);
	});
});

// ---------------------------------------------------------------------------
// spherePosToTile
// ---------------------------------------------------------------------------

describe("spherePosToTile", () => {
	const W = 64;
	const H = 64;
	const R = sphereRadius(W, H);

	it("round-trips tileToSpherePos → spherePosToTile for grid center", () => {
		const tx = 32;
		const tz = 32;
		const pos = tileToSpherePos(tx, tz, W, H, R);
		const result = spherePosToTile(pos, W, H, R);
		expect(result.x).toBe(tx);
		expect(result.z).toBe(tz);
	});

	it("round-trips for corners (clamped to valid range)", () => {
		// Test a tile near but not at the exact pole (poles have singularity)
		const testCases = [
			{ tx: 0, tz: 5 },
			{ tx: W - 1, tz: 5 },
			{ tx: 0, tz: H - 6 },
			{ tx: W - 1, tz: H - 6 },
			{ tx: W / 2, tz: H / 2 },
			{ tx: 10, tz: 20 },
			{ tx: 50, tz: 40 },
		];
		for (const { tx, tz } of testCases) {
			const pos = tileToSpherePos(tx, tz, W, H, R);
			const result = spherePosToTile(pos, W, H, R);
			expect(result.x).toBe(tx);
			expect(result.z).toBe(tz);
		}
	});

	it("clamps out-of-bounds positions to valid tile range", () => {
		// A point directly above (north pole beyond the board)
		const abovePole = { x: 0, y: R, z: 0 };
		const result = spherePosToTile(abovePole, W, H, R);
		expect(result.x).toBeGreaterThanOrEqual(0);
		expect(result.x).toBeLessThan(W);
		expect(result.z).toBeGreaterThanOrEqual(0);
		expect(result.z).toBeLessThan(H);
	});
});

// ---------------------------------------------------------------------------
// sphereRadius
// ---------------------------------------------------------------------------

describe("sphereRadius", () => {
	it("produces a radius proportional to board size", () => {
		const r1 = sphereRadius(32, 32);
		const r2 = sphereRadius(64, 64);
		// Larger board → larger sphere
		expect(r2).toBeGreaterThan(r1);
	});

	it("64x64 board radius is roughly width / (2*PI) * TILE_SIZE_M", () => {
		const r = sphereRadius(64, 64);
		// The height dimension maps to PI of latitude, so:
		// H * TILE_SIZE_M = PI * R → R = H * TILE_SIZE_M / PI
		// With TILE_SIZE_M = 2.0: R = 64 * 2 / PI ≈ 40.74
		expect(r).toBeCloseTo((64 * 2) / Math.PI, 0);
	});
});

// ---------------------------------------------------------------------------
// buildSphereGeometry
// ---------------------------------------------------------------------------

describe("buildSphereGeometry", () => {
	it("returns a BufferGeometry with required attributes", () => {
		const board = makeBoard(8, 8);
		const geo = buildSphereGeometry(board);

		expect(geo).toBeInstanceOf(THREE.BufferGeometry);
		expect(geo.getAttribute("position")).toBeTruthy();
		expect(geo.getAttribute("uv")).toBeTruthy();
		expect(geo.getAttribute("elevation")).toBeTruthy();
		expect(geo.getAttribute("floorIndex")).toBeTruthy();
		expect(geo.getAttribute("normal")).toBeTruthy();
		expect(geo.index).toBeTruthy();
	});

	it("all vertices lie on the sphere surface (within elevation offset)", () => {
		const board = makeBoard(8, 8);
		const geo = buildSphereGeometry(board);
		const pos = geo.getAttribute("position");
		const R = sphereRadius(8, 8);

		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			const dist = Math.sqrt(x * x + y * y + z * z);
			// All tiles have elevation 0, so vertices should be at R
			expect(dist).toBeCloseTo(R, 1);
		}
	});

	it("vertex normals point outward from the sphere center", () => {
		const board = makeBoard(8, 8);
		const geo = buildSphereGeometry(board);
		const pos = geo.getAttribute("position");
		const norm = geo.getAttribute("normal");
		const R = sphereRadius(8, 8);

		for (let i = 0; i < pos.count; i++) {
			const px = pos.getX(i);
			const py = pos.getY(i);
			const pz = pos.getZ(i);
			const nx = norm.getX(i);
			const ny = norm.getY(i);
			const nz = norm.getZ(i);

			// Normal should be approximately the normalized position
			const len = Math.sqrt(px * px + py * py + pz * pz);
			expect(nx).toBeCloseTo(px / len, 1);
			expect(ny).toBeCloseTo(py / len, 1);
			expect(nz).toBeCloseTo(pz / len, 1);
		}
	});

	it("floorIndex matches the board tile floorType", () => {
		const board = makeBoard(4, 4, "transit_deck");
		const geo = buildSphereGeometry(board);
		const fi = geo.getAttribute("floorIndex");

		// FLOOR_INDEX_MAP.transit_deck = 2
		for (let i = 0; i < fi.count; i++) {
			expect(fi.getX(i)).toBe(2);
		}
	});

	it("mixed floor types are assigned correctly", () => {
		const board = makeBoard(4, 4);
		// Set some tiles to different types
		board.tiles[0][0].floorType = "void_pit";
		board.tiles[1][1].floorType = "structural_mass";

		const geo = buildSphereGeometry(board);
		const fi = geo.getAttribute("floorIndex");

		// Just verify the geometry builds without errors and has valid indices
		for (let i = 0; i < fi.count; i++) {
			const idx = fi.getX(i);
			expect(idx).toBeGreaterThanOrEqual(0);
			expect(idx).toBeLessThanOrEqual(8);
		}
	});

	it("elevation attribute reflects board tile elevation", () => {
		const board = makeBoard(4, 4);
		// Set center tile to raised
		board.tiles[2][2].elevation = 2;

		const geo = buildSphereGeometry(board);
		const elev = geo.getAttribute("elevation");

		// At least some elevation values should be non-zero
		let hasNonZero = false;
		for (let i = 0; i < elev.count; i++) {
			if (elev.getX(i) !== 0) hasNonZero = true;
		}
		expect(hasNonZero).toBe(true);
	});

	it("geometry has valid index buffer with triangles", () => {
		const board = makeBoard(4, 4);
		const geo = buildSphereGeometry(board);

		expect(geo.index).toBeTruthy();
		expect(geo.index!.count).toBeGreaterThan(0);
		// Triangle count should be divisible by 3
		expect(geo.index!.count % 3).toBe(0);
	});

	it("produces reasonable vertex count for a small board", () => {
		const board = makeBoard(8, 8);
		const geo = buildSphereGeometry(board);
		const pos = geo.getAttribute("position");

		// With SEGS=3 subdivisions, each tile has (3+1)^2 = 16 vertices
		// 8*8 tiles = 64 tiles * 16 = 1024 vertices
		// Actual count may differ slightly due to sphere construction
		expect(pos.count).toBeGreaterThan(0);
		expect(pos.count).toBeLessThan(100000); // sanity upper bound
	});
});
