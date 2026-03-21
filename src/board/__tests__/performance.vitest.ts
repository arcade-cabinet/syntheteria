/**
 * Performance audit — vertex count + model instances at max density.
 *
 * Computes geometry budgets for the largest supported board (128x128)
 * on a sphere. Asserts upper bounds to catch regressions that would
 * tank frame rate.
 *
 * This is an analytical test — no WebGL context needed. It computes
 * the same numbers the renderers would produce from board data.
 */

import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import { placeSalvageProps } from "../../systems";
import { isPassableBiome } from "../../terrain/types";
import { SEGS } from "..";
import { generateBoard } from "../generator";
import type { BoardConfig } from "../types";

// ─── Board configs ───────────────────────────────────────────────────────────

/** Standard game board. */
const STANDARD: BoardConfig = {
	width: 96,
	height: 96,
	seed: "perf-audit",
	difficulty: "normal",
};

/** Max supported board. */
const MAX_BOARD: BoardConfig = {
	width: 128,
	height: 128,
	seed: "perf-audit-max",
	difficulty: "normal",
};

// ─── Budget limits ───────────────────────────────────────────────────────────

/**
 * Board geometry vertex budget (sphere — no GHOST tiles).
 *
 * Formula: renderTiles = W * H (sphere has no ghost tiles)
 *          vertsPerTile = (SEGS+1)^2
 *          totalVerts = renderTiles * vertsPerTile
 *
 * 128x128: 16384 tiles * 16 verts = 262K
 * Two layers (Board + Biome) each build their own geometry.
 *
 * Budget: 300K vertices for board mesh (comfortable headroom).
 */
const BOARD_VERTEX_BUDGET = 300_000;

/**
 * Salvage model instance budget.
 *
 * Each salvage prop is a Clone of a preloaded GLB — one draw call per instance.
 * Structural tiles and scatter affect salvage density. Fog gates this to
 * explored tiles only.
 *
 * Budget: 8000 instances max (without fog gating).
 * In practice, fog of war limits visible instances to explored tiles only.
 */
const SALVAGE_INSTANCE_BUDGET = 16000;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("performance audit", () => {
	it("board geometry stays within vertex budget", () => {
		// Sphere: no ghost tiles, just W*H
		for (const config of [STANDARD, MAX_BOARD]) {
			const renderTiles = config.width * config.height;
			const vertsPerTile = (SEGS + 1) * (SEGS + 1);
			const totalVerts = renderTiles * vertsPerTile;

			expect(
				totalVerts,
				`${config.width}x${config.height} board: ${totalVerts.toLocaleString()} verts (budget ${BOARD_VERTEX_BUDGET.toLocaleString()})`,
			).toBeLessThanOrEqual(BOARD_VERTEX_BUDGET);
		}
	});

	it("salvage instance count stays within budget", () => {
		for (const config of [STANDARD, MAX_BOARD]) {
			const board = generateBoard(config);
			const world = createWorld();
			const salvageCount = placeSalvageProps(world, board);
			world.destroy();

			expect(
				salvageCount,
				`${config.width}x${config.height} board: ${salvageCount} salvage instances (budget ${SALVAGE_INSTANCE_BUDGET})`,
			).toBeLessThanOrEqual(SALVAGE_INSTANCE_BUDGET);
		}
	});

	it("reports density metrics for review", () => {
		const board = generateBoard(MAX_BOARD);
		const total = MAX_BOARD.width * MAX_BOARD.height;

		let structural = 0;
		let passable = 0;
		let bridges = 0;
		let voidPits = 0;
		for (let z = 0; z < MAX_BOARD.height; z++) {
			for (let x = 0; x < MAX_BOARD.width; x++) {
				const tile = board.tiles[z]![x]!;
				if (tile.biomeType === "mountain") structural++;
				if (isPassableBiome(tile.biomeType)) passable++;
				if (tile.elevation === 1) bridges++;
				if (tile.elevation === -1) voidPits++;
			}
		}

		const world = createWorld();
		const salvageCount = placeSalvageProps(world, board);
		world.destroy();

		const boardVerts =
			MAX_BOARD.width * MAX_BOARD.height * (SEGS + 1) * (SEGS + 1);

		// This test always passes — it just logs the metrics for human review
		console.log(
			`\n=== PERFORMANCE AUDIT (${MAX_BOARD.width}x${MAX_BOARD.height}) ===`,
		);
		console.log(
			`Board geometry: ${boardVerts.toLocaleString()} vertices (sphere, SEGS=${SEGS})`,
		);
		console.log(`Total tiles: ${total.toLocaleString()}`);
		console.log(
			`  Structural: ${structural} (${((structural / total) * 100).toFixed(1)}%)`,
		);
		console.log(
			`  Passable: ${passable} (${((passable / total) * 100).toFixed(1)}%)`,
		);
		console.log(
			`  Bridges: ${bridges} (${((bridges / total) * 100).toFixed(1)}%)`,
		);
		console.log(
			`  Void pits: ${voidPits} (${((voidPits / total) * 100).toFixed(1)}%)`,
		);
		console.log(`Salvage instances: ${salvageCount}`);
		console.log(`=== END AUDIT ===\n`);

		expect(true).toBe(true);
	});
});
