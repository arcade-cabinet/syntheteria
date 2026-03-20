import { describe, expect, it } from "vitest";
import { generateDepthLayer } from "../depth";
import { generateBoard } from "../generator";
import { seededRng } from "../noise";
import type { BoardConfig } from "../types";

const DEFAULT_CONFIG: BoardConfig = {
	width: 32,
	height: 32,
	seed: "depth-test-seed",
	difficulty: "normal",
};

describe("generateDepthLayer", () => {
	it("returns a DepthLayer with spans array", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		const rng = seededRng("depth-layer-rng");
		const layer = generateDepthLayer(board, rng);

		expect(layer).toHaveProperty("spans");
		expect(Array.isArray(layer.spans)).toBe(true);
	});

	it("all bridge span tiles have elevation 1", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		const rng = seededRng("depth-bridge-rng");
		const layer = generateDepthLayer(board, rng);

		const bridges = layer.spans.filter((s) => s.type === "bridge");
		for (const bridge of bridges) {
			// Bridge body tiles (not ramp entrances) should be elevation 1
			// Ramp tiles at entrances are elevation 0
			const bodyTiles = bridge.tiles.filter(
				(t) => !bridge.entrances.some((e) => e.x === t.x && e.z === t.z),
			);
			for (const tile of bodyTiles) {
				expect(tile.elevation).toBe(1);
			}
		}
	});

	it("all tunnel span tiles have elevation -1", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		const rng = seededRng("depth-tunnel-rng");
		const layer = generateDepthLayer(board, rng);

		const tunnels = layer.spans.filter((s) => s.type === "tunnel");
		for (const tunnel of tunnels) {
			for (const tile of tunnel.tiles) {
				expect(tile.elevation).toBe(-1);
			}
		}
	});

	it("no two spans share the same tile coordinates", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		const rng = seededRng("depth-overlap-rng");
		const layer = generateDepthLayer(board, rng);

		const allCoords = new Set<string>();
		for (const span of layer.spans) {
			for (const tile of span.tiles) {
				const key = `${tile.x},${tile.z}`;
				expect(allCoords.has(key)).toBe(false);
				allCoords.add(key);
			}
		}
	});
});
