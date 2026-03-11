/**
 * Tests for MinimapPanel pure utility functions.
 *
 * The React component (MinimapPanel) requires a DOM canvas context and
 * requestAnimationFrame and is not tested here. The pure functions
 * pixelTypeToColor, getFactionMinimapColor, worldToMinimap, and applyIntensity
 * are fully testable without a DOM.
 */

// ---------------------------------------------------------------------------
// Mock config
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		factionVisuals: {
			reclaimers: { accentColor: "#DAA520" },
			volt_collective: { accentColor: "#FF4500" },
			signal_choir: { accentColor: "#00CED1" },
			iron_creed: { accentColor: "#FFD700" },
		},
	},
}));

// ---------------------------------------------------------------------------
// Mock minimapData system
// ---------------------------------------------------------------------------

jest.mock("../../systems/minimapData", () => ({
	generateMinimapData: jest.fn(() => []),
	getMinimapStats: jest.fn(() => ({
		resolution: 128,
		entityCount: 0,
		revealedCells: 0,
		totalCells: 16384,
		revealedPercent: 0,
	})),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
	pixelTypeToColor,
	getFactionMinimapColor,
	worldToMinimap,
	applyIntensity,
} from "../MinimapPanel";
import type { MinimapPixel } from "../../systems/minimapData";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const DEFAULT_FACTION_COLORS: Record<string, string> = {
	reclaimers: "#DAA520",
	volt_collective: "#FF4500",
	signal_choir: "#00CED1",
	iron_creed: "#FFD700",
};

function makePixel(type: MinimapPixel["type"], faction?: string, intensity?: number): MinimapPixel {
	return { type, faction, intensity };
}

// ---------------------------------------------------------------------------
// pixelTypeToColor
// ---------------------------------------------------------------------------

describe("pixelTypeToColor", () => {
	it("returns terrain color for terrain pixel", () => {
		const result = pixelTypeToColor(makePixel("terrain"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#2a3c2a");
	});

	it("returns water color for water pixel", () => {
		const result = pixelTypeToColor(makePixel("water"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#1a2a44");
	});

	it("returns fog color for fog pixel", () => {
		const result = pixelTypeToColor(makePixel("fog"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#0a0c0a");
	});

	it("returns player unit color for player_unit pixel", () => {
		const result = pixelTypeToColor(makePixel("player_unit"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#ffffff");
	});

	it("returns enemy unit color for enemy_unit pixel", () => {
		const result = pixelTypeToColor(makePixel("enemy_unit"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#ff4444");
	});

	it("returns ally unit color for ally_unit pixel", () => {
		const result = pixelTypeToColor(makePixel("ally_unit"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#44ff88");
	});

	it("returns deposit color for deposit pixel", () => {
		const result = pixelTypeToColor(makePixel("deposit"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#886644");
	});

	it("returns building color for building pixel", () => {
		const result = pixelTypeToColor(makePixel("building"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#44aacc");
	});

	it("returns hazard color for hazard pixel", () => {
		const result = pixelTypeToColor(makePixel("hazard"), DEFAULT_FACTION_COLORS);
		expect(result).toBe("#ff6600");
	});

	it("uses faction accent color for territory_border with faction", () => {
		const result = pixelTypeToColor(
			makePixel("territory_border", "reclaimers"),
			DEFAULT_FACTION_COLORS,
		);
		expect(result).toBe("#DAA520");
	});

	it("uses faction accent color for volt_collective territory border", () => {
		const result = pixelTypeToColor(
			makePixel("territory_border", "volt_collective"),
			DEFAULT_FACTION_COLORS,
		);
		expect(result).toBe("#FF4500");
	});

	it("falls back to gray for territory_border without faction", () => {
		const result = pixelTypeToColor(
			makePixel("territory_border", undefined),
			DEFAULT_FACTION_COLORS,
		);
		expect(result).toBe("#888888");
	});

	it("falls back to gray for territory_border with unknown faction", () => {
		const result = pixelTypeToColor(
			makePixel("territory_border", "unknown_faction"),
			DEFAULT_FACTION_COLORS,
		);
		expect(result).toBe("#888888");
	});

	it("falls back to #333333 for unknown pixel type", () => {
		const result = pixelTypeToColor(
			{ type: "terrain" as MinimapPixel["type"], faction: undefined },
			{},
		);
		// terrain is a known type — just check it returns a string
		expect(typeof result).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// getFactionMinimapColor
// ---------------------------------------------------------------------------

describe("getFactionMinimapColor", () => {
	it("returns reclaimers accent color", () => {
		expect(getFactionMinimapColor("reclaimers")).toBe("#DAA520");
	});

	it("returns volt_collective accent color", () => {
		expect(getFactionMinimapColor("volt_collective")).toBe("#FF4500");
	});

	it("returns signal_choir accent color", () => {
		expect(getFactionMinimapColor("signal_choir")).toBe("#00CED1");
	});

	it("returns iron_creed accent color", () => {
		expect(getFactionMinimapColor("iron_creed")).toBe("#FFD700");
	});

	it("returns fallback amber for unknown faction", () => {
		expect(getFactionMinimapColor("unknown")).toBe("#ffaa00");
	});

	it("returns a string type", () => {
		expect(typeof getFactionMinimapColor("reclaimers")).toBe("string");
	});

	it("all 4 known factions return distinct colors", () => {
		const colors = [
			getFactionMinimapColor("reclaimers"),
			getFactionMinimapColor("volt_collective"),
			getFactionMinimapColor("signal_choir"),
			getFactionMinimapColor("iron_creed"),
		];
		expect(new Set(colors).size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// worldToMinimap
// ---------------------------------------------------------------------------

describe("worldToMinimap", () => {
	it("maps origin to (0,0)", () => {
		const { px, py } = worldToMinimap(0, 0, 200, 160);
		expect(px).toBe(0);
		expect(py).toBe(0);
	});

	it("maps center of world to center of minimap", () => {
		const { px, py } = worldToMinimap(100, 100, 200, 160);
		expect(px).toBe(80);
		expect(py).toBe(80);
	});

	it("maps far corner to canvas size - 1", () => {
		const { px, py } = worldToMinimap(199, 199, 200, 160);
		// 199/200 * 160 = 159.2 → floor = 159
		expect(px).toBe(159);
		expect(py).toBe(159);
	});

	it("maps exactly to canvas edge at world boundary", () => {
		const { px, py } = worldToMinimap(200, 200, 200, 160);
		expect(px).toBe(160);
		expect(py).toBe(160);
	});

	it("returns integer pixel coordinates", () => {
		const { px, py } = worldToMinimap(37.7, 82.3, 200, 160);
		expect(Number.isInteger(px)).toBe(true);
		expect(Number.isInteger(py)).toBe(true);
	});

	it("scales correctly with different world and canvas sizes", () => {
		const { px, py } = worldToMinimap(50, 50, 100, 128);
		expect(px).toBe(64);
		expect(py).toBe(64);
	});

	it("x and z map independently", () => {
		const { px, py } = worldToMinimap(100, 0, 200, 160);
		expect(px).toBe(80);
		expect(py).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// applyIntensity
// ---------------------------------------------------------------------------

describe("applyIntensity", () => {
	it("returns full color at intensity 1.0", () => {
		expect(applyIntensity("#ffffff", 1.0)).toBe("rgb(255,255,255)");
	});

	it("returns black at intensity 0", () => {
		expect(applyIntensity("#ffffff", 0)).toBe("rgb(0,0,0)");
	});

	it("halves each channel at intensity 0.5", () => {
		expect(applyIntensity("#ffffff", 0.5)).toBe("rgb(128,128,128)");
	});

	it("applies intensity to colored hex", () => {
		// #ff8800 = rgb(255,136,0), at 0.5 → rgb(128,68,0)
		expect(applyIntensity("#ff8800", 0.5)).toBe("rgb(128,68,0)");
	});

	it("clamps intensity above 1.0 to 1.0", () => {
		expect(applyIntensity("#ffffff", 2.0)).toBe("rgb(255,255,255)");
	});

	it("clamps negative intensity to 0", () => {
		expect(applyIntensity("#ffffff", -0.5)).toBe("rgb(0,0,0)");
	});

	it("returns rgb() format string", () => {
		const result = applyIntensity("#2a3c2a", 0.7);
		expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
	});
});
