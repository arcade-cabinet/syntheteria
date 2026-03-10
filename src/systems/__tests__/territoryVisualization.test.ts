/**
 * Unit tests for the territory visualization system.
 *
 * Tests cover:
 * - Territory registration, removal, and radius updates
 * - Faction color assignment and defaults
 * - Overlap detection between different factions
 * - Contested zone computation
 * - Border segment calculation (circle intersection points)
 * - Minimap data generation
 * - Camera culling (visible territories by distance)
 * - Position queries (which territory contains a point)
 * - Reset and test isolation
 * - Edge cases: same faction overlap, single territory, enclosure
 */

import {
	registerTerritory,
	removeTerritory,
	updateTerritoryRadius,
	getTerritoryRenderData,
	getBorderSegments,
	getContestedZones,
	getFactionColor,
	setFactionColor,
	getMinimapData,
	getVisibleTerritories,
	getTerritoryAtPosition,
	reset,
} from "../territoryVisualization";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registerTerritory", () => {
	it("adds a territory that appears in render data", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");

		const data = getTerritoryRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].center).toEqual({ x: 0, z: 0 });
		expect(data[0].radius).toBe(10);
	});

	it("registers multiple territories from different factions", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 50, z: 50 }, 15, "volt_collective");
		registerTerritory("t3", { x: -30, z: 20 }, 8, "signal_choir");

		expect(getTerritoryRenderData()).toHaveLength(3);
	});

	it("overwrites a territory if the same id is registered again", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t1", { x: 5, z: 5 }, 20, "volt_collective");

		const data = getTerritoryRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].center).toEqual({ x: 5, z: 5 });
		expect(data[0].radius).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------

describe("removeTerritory", () => {
	it("removes a registered territory and is a no-op for unknown ids", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 50, z: 50 }, 10, "volt_collective");

		removeTerritory("nonexistent");
		expect(getTerritoryRenderData()).toHaveLength(2);

		removeTerritory("t1");
		const data = getTerritoryRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].center).toEqual({ x: 50, z: 50 });
	});
});

// ---------------------------------------------------------------------------
// Radius updates
// ---------------------------------------------------------------------------

describe("updateTerritoryRadius", () => {
	it("changes the radius of an existing territory", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		updateTerritoryRadius("t1", 25);
		expect(getTerritoryRenderData()[0].radius).toBe(25);
	});

	it("is a no-op for unknown territory id", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		updateTerritoryRadius("nonexistent", 99);
		expect(getTerritoryRenderData()[0].radius).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Faction colors
// ---------------------------------------------------------------------------

describe("faction colors", () => {
	it("returns default colors for all four factions and neutral for unknown", () => {
		expect(getFactionColor("reclaimers")).toBe("#D4A574");
		expect(getFactionColor("volt_collective")).toBe("#4A90D9");
		expect(getFactionColor("signal_choir")).toBe("#7B68EE");
		expect(getFactionColor("iron_creed")).toBe("#808080");
		expect(getFactionColor("unknown_faction")).toBe("#333333");
	});

	it("setFactionColor overrides color and appears in render data", () => {
		setFactionColor("reclaimers", "#FF0000");
		expect(getFactionColor("reclaimers")).toBe("#FF0000");

		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		expect(getTerritoryRenderData()[0].factionColor).toBe("#FF0000");
	});

	it("setFactionColor works for new factions", () => {
		setFactionColor("custom_faction", "#AABBCC");
		expect(getFactionColor("custom_faction")).toBe("#AABBCC");
	});

	it("custom colors are reset after reset()", () => {
		setFactionColor("reclaimers", "#FF0000");
		reset();
		expect(getFactionColor("reclaimers")).toBe("#D4A574");
	});
});

// ---------------------------------------------------------------------------
// Render data
// ---------------------------------------------------------------------------

describe("getTerritoryRenderData", () => {
	it("returns empty array with no territories", () => {
		expect(getTerritoryRenderData()).toEqual([]);
	});

	it("includes faction color and a darker border color", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");

		const data = getTerritoryRenderData();
		expect(data[0].factionColor).toBe("#D4A574");
		expect(data[0].borderColor).not.toBe(data[0].factionColor);
		expect(data[0].borderColor).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("non-contested territories have 0.5 opacity, contested have 0.3", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 100, z: 100 }, 10, "volt_collective");
		registerTerritory("t3", { x: 15, z: 0 }, 10, "signal_choir");

		const data = getTerritoryRenderData();
		// t2 is far from t1 and t3, so not contested
		const t2 = data.find((d) => d.factionColor === getFactionColor("volt_collective"))!;
		expect(t2.opacity).toBe(0.5);
		expect(t2.isContested).toBe(false);

		// t1 and t3 overlap (distance 15 < 10+10)
		const t1 = data.find((d) => d.factionColor === getFactionColor("reclaimers"))!;
		const t3 = data.find((d) => d.factionColor === getFactionColor("signal_choir"))!;
		expect(t1.opacity).toBe(0.3);
		expect(t1.isContested).toBe(true);
		expect(t3.opacity).toBe(0.3);
		expect(t3.isContested).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Overlap / contested detection
// ---------------------------------------------------------------------------

describe("overlap detection", () => {
	it("detects overlap when distance < sum of radii (different factions)", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 15, z: 0 }, 10, "volt_collective");

		const zones = getContestedZones();
		expect(zones).toHaveLength(1);
		expect(zones[0].factions).toContain("reclaimers");
		expect(zones[0].factions).toContain("volt_collective");
	});

	it("does not report overlap for same faction or distant territories", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 5, z: 0 }, 10, "reclaimers");
		registerTerritory("t3", { x: 100, z: 100 }, 10, "volt_collective");

		expect(getContestedZones()).toHaveLength(0);
	});

	it("does not report overlap when territories barely touch (distance = sum of radii)", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 20, z: 0 }, 10, "volt_collective");

		expect(getContestedZones()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Contested zones
// ---------------------------------------------------------------------------

describe("getContestedZones", () => {
	it("returns empty array with no territories", () => {
		expect(getContestedZones()).toEqual([]);
	});

	it("contested zone center is midpoint and radius is half overlap", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 14, z: 0 }, 10, "volt_collective");
		// overlap = 10 + 10 - 14 = 6, radius = 3

		const zones = getContestedZones();
		expect(zones[0].center.x).toBe(7);
		expect(zones[0].center.z).toBe(0);
		expect(zones[0].radius).toBe(3);
	});

	it("handles three-way overlap producing multiple contested zones", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 15, "reclaimers");
		registerTerritory("t2", { x: 10, z: 0 }, 15, "volt_collective");
		registerTerritory("t3", { x: 5, z: 8 }, 15, "signal_choir");

		// 3 pairs: (t1,t2), (t1,t3), (t2,t3)
		expect(getContestedZones()).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Border segments
// ---------------------------------------------------------------------------

describe("getBorderSegments", () => {
	it("returns empty array with no territories or non-overlapping ones", () => {
		expect(getBorderSegments()).toEqual([]);

		registerTerritory("t1", { x: 0, z: 0 }, 5, "reclaimers");
		registerTerritory("t2", { x: 100, z: 100 }, 5, "volt_collective");
		expect(getBorderSegments()).toEqual([]);
	});

	it("returns a segment with valid coordinates for overlapping different-faction territories", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 15, z: 0 }, 10, "volt_collective");

		const segments = getBorderSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].factionA).toBe("reclaimers");
		expect(segments[0].factionB).toBe("volt_collective");
		expect(Number.isFinite(segments[0].start.x)).toBe(true);
		expect(Number.isFinite(segments[0].start.z)).toBe(true);
		expect(Number.isFinite(segments[0].end.x)).toBe(true);
		expect(Number.isFinite(segments[0].end.z)).toBe(true);
	});

	it("does not produce segments for same-faction overlap", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 5, z: 0 }, 10, "reclaimers");
		expect(getBorderSegments()).toEqual([]);
	});

	it("segment intersection points are symmetric about the center line", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 12, z: 0 }, 10, "volt_collective");

		const seg = getBorderSegments()[0];
		expect(seg.start.z).toBeCloseTo(-seg.end.z, 5);
		expect(seg.start.x).toBeCloseTo(seg.end.x, 5);
	});

	it("returns no segments when one territory fully encloses another", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 20, "reclaimers");
		registerTerritory("t2", { x: 0, z: 0 }, 5, "volt_collective");
		expect(getBorderSegments()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Minimap data
// ---------------------------------------------------------------------------

describe("getMinimapData", () => {
	it("returns empty array with no territories", () => {
		expect(getMinimapData()).toEqual([]);
	});

	it("returns center, radius, color, and isContested for each territory", () => {
		registerTerritory("t1", { x: 10, z: 20 }, 8, "signal_choir");

		expect(getMinimapData()).toEqual([
			{ center: { x: 10, z: 20 }, radius: 8, color: "#7B68EE", isContested: false },
		]);
	});

	it("marks contested territories on minimap", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 15, z: 0 }, 10, "volt_collective");

		const data = getMinimapData();
		expect(data[0].isContested).toBe(true);
		expect(data[1].isContested).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Camera culling
// ---------------------------------------------------------------------------

describe("getVisibleTerritories", () => {
	it("returns empty array with no territories", () => {
		expect(getVisibleTerritories({ x: 0, z: 0 }, 100)).toEqual([]);
	});

	it("includes territories within view distance and excludes those beyond", () => {
		registerTerritory("t1", { x: 10, z: 0 }, 5, "reclaimers");
		registerTerritory("t2", { x: 200, z: 200 }, 5, "volt_collective");

		const visible = getVisibleTerritories({ x: 0, z: 0 }, 50);
		expect(visible).toHaveLength(1);
	});

	it("includes territory if edge (not just center) is within view distance", () => {
		// Center at 55, radius 10 — closest edge at 45, within 50 view distance
		registerTerritory("t1", { x: 55, z: 0 }, 10, "reclaimers");
		expect(getVisibleTerritories({ x: 0, z: 0 }, 50)).toHaveLength(1);

		// Center at 100, radius 5 — closest edge at 95, beyond 50 view distance
		registerTerritory("t2", { x: 100, z: 0 }, 5, "volt_collective");
		expect(getVisibleTerritories({ x: 0, z: 0 }, 50)).toHaveLength(1);
	});

	it("returns all territories when view distance is very large", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 500, z: 500 }, 10, "volt_collective");
		registerTerritory("t3", { x: -300, z: 200 }, 10, "signal_choir");

		expect(getVisibleTerritories({ x: 0, z: 0 }, 10000)).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Position queries
// ---------------------------------------------------------------------------

describe("getTerritoryAtPosition", () => {
	it("returns null when no territories exist or point is outside all", () => {
		expect(getTerritoryAtPosition({ x: 0, z: 0 })).toBeNull();

		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		expect(getTerritoryAtPosition({ x: 50, z: 50 })).toBeNull();
	});

	it("returns the territory containing the point", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");

		const result = getTerritoryAtPosition({ x: 5, z: 0 });
		expect(result).not.toBeNull();
		expect(result!.id).toBe("t1");
		expect(result!.ownerFaction).toBe("reclaimers");
	});

	it("returns the closest territory when point is in multiple territories", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 20, "reclaimers");
		registerTerritory("t2", { x: 10, z: 0 }, 20, "volt_collective");

		// Point at (8, 0): dist to t1=8, dist to t2=2 -> t2 wins
		const result = getTerritoryAtPosition({ x: 8, z: 0 });
		expect(result!.id).toBe("t2");
	});

	it("includes points at center and at exact radius boundary", () => {
		registerTerritory("t1", { x: 5, z: 5 }, 10, "reclaimers");

		expect(getTerritoryAtPosition({ x: 5, z: 5 })).not.toBeNull();
		expect(getTerritoryAtPosition({ x: 15, z: 5 })).not.toBeNull(); // exactly at radius
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all territories and state", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 10, "reclaimers");
		registerTerritory("t2", { x: 15, z: 0 }, 10, "volt_collective");
		setFactionColor("reclaimers", "#FF0000");

		reset();

		expect(getTerritoryRenderData()).toEqual([]);
		expect(getBorderSegments()).toEqual([]);
		expect(getContestedZones()).toEqual([]);
		expect(getMinimapData()).toEqual([]);
		expect(getFactionColor("reclaimers")).toBe("#D4A574");
	});

	it("does not throw when called on empty state", () => {
		expect(() => reset()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("single territory is never contested", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 100, "reclaimers");

		expect(getTerritoryRenderData()[0].isContested).toBe(false);
		expect(getContestedZones()).toHaveLength(0);
	});

	it("handles zero-radius territory", () => {
		registerTerritory("t1", { x: 0, z: 0 }, 0, "reclaimers");

		const data = getTerritoryRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].radius).toBe(0);
	});

	it("handles negative coordinates", () => {
		registerTerritory("t1", { x: -50, z: -50 }, 10, "reclaimers");

		expect(getTerritoryRenderData()[0].center).toEqual({ x: -50, z: -50 });
		expect(getTerritoryAtPosition({ x: -45, z: -50 })).not.toBeNull();
	});
});
