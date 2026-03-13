/**
 * Tests for zone transition blending logic (US-026).
 *
 * Covers: blend factor calculation, breach boundary detection,
 * strip geometry computation, edge detection between adjacent zones.
 */

import blendConfig from "../config/zoneBlending.json";
import {
	type BlendEdge,
	type CellRecord,
	computeBlendEdges,
	computeBlendFactor,
	computeBlendStripParams,
	computeBreachStripParams,
	computeStripGeometry,
	type EdgeDirection,
	getBlendWidthFraction,
	getBreachGlowConfig,
	isBreachBoundary,
} from "./zoneBlendLogic";

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

describe("zoneBlendLogic config", () => {
	test("getBlendWidthFraction returns config value", () => {
		expect(getBlendWidthFraction()).toBe(blendConfig.blendWidthFraction);
	});

	test("blend width fraction is within allowed range", () => {
		const frac = getBlendWidthFraction();
		const [min, max] = blendConfig.blendWidthFractionRange;
		expect(frac).toBeGreaterThanOrEqual(min);
		expect(frac).toBeLessThanOrEqual(max);
	});

	test("getBreachGlowConfig returns breach settings", () => {
		const cfg = getBreachGlowConfig();
		expect(cfg.enabled).toBe(true);
		expect(cfg.intensity).toBeGreaterThan(0);
		expect(cfg.pulseSpeed).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// computeBlendFactor
// ---------------------------------------------------------------------------

describe("computeBlendFactor", () => {
	test("same zone returns 0 (no blend)", () => {
		expect(computeBlendFactor("command_core", "command_core")).toBe(0);
		expect(computeBlendFactor("fabrication", "fabrication")).toBe(0);
	});

	test("null neighbor returns 0", () => {
		expect(computeBlendFactor("command_core", null)).toBe(0);
	});

	test("different non-breach zones return 0.5", () => {
		expect(computeBlendFactor("command_core", "fabrication")).toBe(0.5);
		expect(computeBlendFactor("habitation", "power")).toBe(0.5);
		expect(computeBlendFactor("corridor_transit", "storage")).toBe(0.5);
	});

	test("breach zone boundary returns 1.0", () => {
		expect(computeBlendFactor("breach_exposed", "command_core")).toBe(1.0);
		expect(computeBlendFactor("fabrication", "breach_exposed")).toBe(1.0);
	});

	test("two breach cells return 0 (same zone)", () => {
		expect(computeBlendFactor("breach_exposed", "breach_exposed")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isBreachBoundary
// ---------------------------------------------------------------------------

describe("isBreachBoundary", () => {
	test("returns false for same zone", () => {
		expect(isBreachBoundary("command_core", "command_core")).toBe(false);
		expect(isBreachBoundary("breach_exposed", "breach_exposed")).toBe(false);
	});

	test("returns false for null neighbor", () => {
		expect(isBreachBoundary("breach_exposed", null)).toBe(false);
	});

	test("returns true when first zone is breach", () => {
		expect(isBreachBoundary("breach_exposed", "fabrication")).toBe(true);
	});

	test("returns true when second zone is breach", () => {
		expect(isBreachBoundary("command_core", "breach_exposed")).toBe(true);
	});

	test("returns false for normal zone transition", () => {
		expect(isBreachBoundary("command_core", "fabrication")).toBe(false);
		expect(isBreachBoundary("habitation", "power")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// computeStripGeometry
// ---------------------------------------------------------------------------

describe("computeStripGeometry", () => {
	const plateSize = 2;
	const depth = 0.3;
	const width = 1.96;

	test("px direction places strip at positive x edge", () => {
		const g = computeStripGeometry("px", plateSize, depth, width);
		expect(g.px).toBeCloseTo(plateSize / 2 - depth / 2);
		expect(g.pz).toBe(0);
		expect(g.sx).toBeCloseTo(depth);
		expect(g.sz).toBeCloseTo(width);
	});

	test("nx direction places strip at negative x edge", () => {
		const g = computeStripGeometry("nx", plateSize, depth, width);
		expect(g.px).toBeCloseTo(-(plateSize / 2 - depth / 2));
		expect(g.pz).toBe(0);
		expect(g.sx).toBeCloseTo(depth);
		expect(g.sz).toBeCloseTo(width);
	});

	test("pz direction places strip at positive z edge", () => {
		const g = computeStripGeometry("pz", plateSize, depth, width);
		expect(g.px).toBe(0);
		expect(g.pz).toBeCloseTo(plateSize / 2 - depth / 2);
		expect(g.sx).toBeCloseTo(width);
		expect(g.sz).toBeCloseTo(depth);
	});

	test("nz direction places strip at negative z edge", () => {
		const g = computeStripGeometry("nz", plateSize, depth, width);
		expect(g.px).toBe(0);
		expect(g.pz).toBeCloseTo(-(plateSize / 2 - depth / 2));
		expect(g.sx).toBeCloseTo(width);
		expect(g.sz).toBeCloseTo(depth);
	});

	test("px and nx are symmetric about center", () => {
		const gpx = computeStripGeometry("px", plateSize, depth, width);
		const gnx = computeStripGeometry("nx", plateSize, depth, width);
		expect(gpx.px).toBeCloseTo(-gnx.px);
		expect(gpx.sx).toBeCloseTo(gnx.sx);
		expect(gpx.sz).toBeCloseTo(gnx.sz);
	});

	test("pz and nz are symmetric about center", () => {
		const gpz = computeStripGeometry("pz", plateSize, depth, width);
		const gnz = computeStripGeometry("nz", plateSize, depth, width);
		expect(gpz.pz).toBeCloseTo(-gnz.pz);
		expect(gpz.sx).toBeCloseTo(gnz.sx);
		expect(gpz.sz).toBeCloseTo(gnz.sz);
	});
});

// ---------------------------------------------------------------------------
// computeBlendStripParams
// ---------------------------------------------------------------------------

describe("computeBlendStripParams", () => {
	const plateSize = 2;

	test("uses config blend width fraction", () => {
		const params = computeBlendStripParams("px", plateSize);
		const expectedDepth = plateSize * blendConfig.blendWidthFraction;
		// outer strip depth = blend depth
		expect(params.outer.sx).toBeCloseTo(expectedDepth);
	});

	test("inner strip is narrower than outer by innerStripRatio", () => {
		const params = computeBlendStripParams("px", plateSize);
		const expectedInnerDepth =
			plateSize * blendConfig.blendWidthFraction * blendConfig.innerStripRatio;
		expect(params.inner.sx).toBeCloseTo(expectedInnerDepth);
	});

	test("inner opacity > outer opacity", () => {
		const params = computeBlendStripParams("pz", plateSize);
		expect(params.innerOpacity).toBeGreaterThan(params.outerOpacity);
	});

	test("y offsets match config", () => {
		const params = computeBlendStripParams("nz", plateSize);
		expect(params.yOuter).toBe(blendConfig.yOffsetOuter);
		expect(params.yInner).toBe(blendConfig.yOffsetInner);
	});
});

// ---------------------------------------------------------------------------
// computeBreachStripParams
// ---------------------------------------------------------------------------

describe("computeBreachStripParams", () => {
	const plateSize = 2;

	test("crack uses config crackWidth", () => {
		const params = computeBreachStripParams("px", plateSize);
		const expectedCrackDepth = plateSize * blendConfig.breachGlow.crackWidth;
		expect(params.crack.sx).toBeCloseTo(expectedCrackDepth);
	});

	test("glow color parsed from hex string", () => {
		const params = computeBreachStripParams("pz", plateSize);
		expect(params.glowColor).toBe(0xff4422);
	});

	test("glow intensity and pulse speed from config", () => {
		const params = computeBreachStripParams("nz", plateSize);
		expect(params.glowIntensity).toBe(blendConfig.breachGlow.intensity);
		expect(params.pulseSpeed).toBe(blendConfig.breachGlow.pulseSpeed);
	});

	test("y offset is above normal blend strips", () => {
		const params = computeBreachStripParams("nx", plateSize);
		const normalParams = computeBlendStripParams("nx", plateSize);
		expect(params.yOffset).toBeGreaterThan(normalParams.yInner);
	});
});

// ---------------------------------------------------------------------------
// computeBlendEdges
// ---------------------------------------------------------------------------

describe("computeBlendEdges", () => {
	const COLORS: Record<string, number> = {
		command_core: 0x5e7385,
		fabrication: 0x7a634a,
		breach_exposed: 0x50545f,
		habitation: 0x5a7f8f,
	};
	const DEFAULT_COLOR = 0x5e7385;

	function makeCell(q: number, r: number, zone: string): CellRecord {
		return { q, r, floor_preset_id: zone };
	}

	function makeCellMap(cells: CellRecord[]): Map<string, CellRecord> {
		const map = new Map<string, CellRecord>();
		for (const c of cells) {
			map.set(`${c.q},${c.r}`, c);
		}
		return map;
	}

	test("returns empty array when all neighbors are same zone", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [
			center,
			makeCell(6, 5, "command_core"),
			makeCell(4, 5, "command_core"),
			makeCell(5, 6, "command_core"),
			makeCell(5, 4, "command_core"),
		];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(0);
	});

	test("returns empty array when cell has no discovered neighbors", () => {
		const center = makeCell(5, 5, "command_core");
		const edges = computeBlendEdges(
			center,
			makeCellMap([center]),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(0);
	});

	test("detects one blend edge with different neighbor", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [
			center,
			makeCell(6, 5, "fabrication"), // px neighbor is different
			makeCell(4, 5, "command_core"),
			makeCell(5, 6, "command_core"),
			makeCell(5, 4, "command_core"),
		];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].direction).toBe("px");
		expect(edges[0].neighborColor).toBe(COLORS.fabrication);
		expect(edges[0].isBreach).toBe(false);
	});

	test("detects multiple blend edges", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [
			center,
			makeCell(6, 5, "fabrication"),
			makeCell(4, 5, "habitation"),
			makeCell(5, 6, "command_core"),
			makeCell(5, 4, "command_core"),
		];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(2);
		const dirs = edges.map((e) => e.direction).sort();
		expect(dirs).toEqual(["nx", "px"]);
	});

	test("marks breach boundaries with isBreach=true", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [
			center,
			makeCell(6, 5, "breach_exposed"),
			makeCell(4, 5, "command_core"),
			makeCell(5, 6, "command_core"),
			makeCell(5, 4, "command_core"),
		];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].isBreach).toBe(true);
		expect(edges[0].neighborColor).toBe(COLORS.breach_exposed);
	});

	test("uses default color for unknown zone", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [center, makeCell(6, 5, "unknown_zone")];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].neighborColor).toBe(DEFAULT_COLOR);
	});

	test("four different neighbors produce four edges", () => {
		const center = makeCell(5, 5, "command_core");
		const cells = [
			center,
			makeCell(6, 5, "fabrication"),
			makeCell(4, 5, "habitation"),
			makeCell(5, 6, "breach_exposed"),
			makeCell(5, 4, "fabrication"),
		];
		const edges = computeBlendEdges(
			center,
			makeCellMap(cells),
			COLORS,
			DEFAULT_COLOR,
		);
		expect(edges).toHaveLength(4);

		const breachEdges = edges.filter((e) => e.isBreach);
		expect(breachEdges).toHaveLength(1);
		expect(breachEdges[0].direction).toBe("pz");
	});
});
