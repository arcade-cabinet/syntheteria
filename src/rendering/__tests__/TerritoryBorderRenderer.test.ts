/**
 * Tests for TerritoryBorderRenderer pure utility functions.
 *
 * The React component (TerritoryBorderRenderer, TerritoryBorderMesh) requires
 * R3F Canvas context and is not tested here. The pure functions
 * computeBorderColor, computeBorderOpacity, computeContestedPulse,
 * computeTerritoryHash, and clearBorderGeometryCache are fully testable without
 * WebGL.
 */

// ---------------------------------------------------------------------------
// Mock Three.js
// ---------------------------------------------------------------------------

const mockRingGeos: Array<{ innerRadius: number; outerRadius: number; disposed: boolean }> = [];

jest.mock("three", () => ({
	RingGeometry: class MockRingGeometry {
		innerRadius: number;
		outerRadius: number;
		disposed = false;
		constructor(innerRadius: number, outerRadius: number, _segments: number) {
			this.innerRadius = innerRadius;
			this.outerRadius = outerRadius;
			mockRingGeos.push(this);
		}
		dispose() { this.disposed = true; }
	},
	MeshBasicMaterial: class {
		color: unknown;
		transparent: boolean;
		opacity: number;
		depthWrite: boolean;
		needsUpdate = false;
		constructor(opts: { color?: unknown; transparent?: boolean; opacity?: number; depthWrite?: boolean } = {}) {
			this.color = opts.color;
			this.transparent = opts.transparent ?? false;
			this.opacity = opts.opacity ?? 1;
			this.depthWrite = opts.depthWrite ?? true;
		}
	},
	DoubleSide: 2,
	Color: class MockColor {
		constructor(_c?: unknown) {}
	},
}));

// ---------------------------------------------------------------------------
// Mock R3F
// ---------------------------------------------------------------------------

jest.mock("@react-three/fiber", () => ({
	useFrame: jest.fn(),
	useRef: jest.fn(() => ({ current: null })),
	useState: jest.fn(() => [[], jest.fn()]),
}));

// ---------------------------------------------------------------------------
// Mock botUtils — break ESM chain (BotGenerator → PanelGeometry → BufferGeometryUtils)
// ---------------------------------------------------------------------------

jest.mock("../botUtils", () => ({
	getFactionAccentColor: (faction: string) => {
		const map: Record<string, number> = {
			reclaimers: 0xDAA520,
			volt_collective: 0xFF4500,
			signal_choir: 0x00CED1,
			iron_creed: 0xFFD700,
		};
		return map[faction] ?? 0xffaa00;
	},
	getFactionPrimaryColor: jest.fn(),
	getFactionEmissiveIntensity: jest.fn(() => 0.1),
}));

// ---------------------------------------------------------------------------
// Mock territory system
// ---------------------------------------------------------------------------

jest.mock("../../systems/territory", () => ({
	getAllTerritories: jest.fn(() => []),
	getOverlappingTerritories: jest.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Mock quest system (territory.ts imports it)
// ---------------------------------------------------------------------------

jest.mock("../../systems/questSystem", () => ({
	notifyQuestEvent: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
	computeBorderColor,
	computeBorderOpacity,
	computeContestedPulse,
	computeTerritoryHash,
	clearBorderGeometryCache,
} from "../TerritoryBorderRenderer";
import type { Territory } from "../../systems/territory";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTerritory(overrides: Partial<Territory> = {}): Territory {
	return {
		id: "territory_0",
		ownerId: "reclaimers",
		center: { x: 0, z: 0 },
		radius: 10,
		strength: 1.0,
		established: 0,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// computeBorderColor
// ---------------------------------------------------------------------------

describe("computeBorderColor", () => {
	it("returns the reclaimers accent color", () => {
		expect(computeBorderColor("reclaimers")).toBe(0xDAA520);
	});

	it("returns the volt_collective accent color", () => {
		expect(computeBorderColor("volt_collective")).toBe(0xFF4500);
	});

	it("returns the signal_choir accent color", () => {
		expect(computeBorderColor("signal_choir")).toBe(0x00CED1);
	});

	it("returns the iron_creed accent color", () => {
		expect(computeBorderColor("iron_creed")).toBe(0xFFD700);
	});

	it("returns fallback gold for unknown faction", () => {
		expect(computeBorderColor("unknown_faction")).toBe(0xffaa00);
	});

	it("returns a number type", () => {
		expect(typeof computeBorderColor("reclaimers")).toBe("number");
	});

	it("distinct factions produce distinct colors", () => {
		const c1 = computeBorderColor("reclaimers");
		const c2 = computeBorderColor("volt_collective");
		const c3 = computeBorderColor("signal_choir");
		const c4 = computeBorderColor("iron_creed");
		expect(new Set([c1, c2, c3, c4]).size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// computeBorderOpacity
// ---------------------------------------------------------------------------

describe("computeBorderOpacity", () => {
	it("returns max opacity at strength 1.0", () => {
		const result = computeBorderOpacity(makeTerritory({ strength: 1.0 }));
		expect(result).toBeCloseTo(0.85, 2);
	});

	it("returns min opacity at strength 0", () => {
		const result = computeBorderOpacity(makeTerritory({ strength: 0 }));
		expect(result).toBeCloseTo(0.25, 2);
	});

	it("returns mid opacity at strength 0.5", () => {
		const result = computeBorderOpacity(makeTerritory({ strength: 0.5 }));
		expect(result).toBeCloseTo(0.55, 2);
	});

	it("returns value between 0.25 and 0.85 for any strength in [0,1]", () => {
		for (let s = 0; s <= 1.0; s += 0.1) {
			const result = computeBorderOpacity(makeTerritory({ strength: s }));
			expect(result).toBeGreaterThanOrEqual(0.25);
			expect(result).toBeLessThanOrEqual(0.85);
		}
	});

	it("scales linearly with strength", () => {
		const low = computeBorderOpacity(makeTerritory({ strength: 0.25 }));
		const high = computeBorderOpacity(makeTerritory({ strength: 0.75 }));
		expect(high).toBeGreaterThan(low);
	});
});

// ---------------------------------------------------------------------------
// computeContestedPulse
// ---------------------------------------------------------------------------

describe("computeContestedPulse", () => {
	it("returns exactly 1.0 when not contested", () => {
		expect(computeContestedPulse(false, 0)).toBe(1.0);
		expect(computeContestedPulse(false, 100)).toBe(1.0);
	});

	it("returns a value in [0.6, 1.0] when contested", () => {
		for (let t = 0; t < 10; t += 0.1) {
			const pulse = computeContestedPulse(true, t);
			expect(pulse).toBeGreaterThanOrEqual(0.6);
			expect(pulse).toBeLessThanOrEqual(1.0);
		}
	});

	it("varies over time when contested (not constant)", () => {
		const p1 = computeContestedPulse(true, 0.0);
		const p2 = computeContestedPulse(true, 0.5);
		// At t=0: sin(0)=0 → 0.6+0.4*(0.5)=0.8; at t=0.5: sin(1.5)≈0.997 → near 1.0
		expect(p1).not.toBeCloseTo(p2, 3);
	});

	it("returns numeric values", () => {
		expect(typeof computeContestedPulse(false, 5)).toBe("number");
		expect(typeof computeContestedPulse(true, 5)).toBe("number");
	});

	it("pulse at t=0 for contested is 0.8 (sin(0)=0)", () => {
		// sin(0*3.0)=sin(0)=0, so: 0.6 + 0.4*(0.5 + 0.5*0) = 0.6 + 0.4*0.5 = 0.8
		expect(computeContestedPulse(true, 0)).toBeCloseTo(0.8, 5);
	});
});

// ---------------------------------------------------------------------------
// computeTerritoryHash
// ---------------------------------------------------------------------------

describe("computeTerritoryHash", () => {
	it("returns empty string for empty array", () => {
		expect(computeTerritoryHash([])).toBe("");
	});

	it("returns a string", () => {
		expect(typeof computeTerritoryHash([makeTerritory()])).toBe("string");
	});

	it("includes territory id in hash", () => {
		const hash = computeTerritoryHash([makeTerritory({ id: "territory_42" })]);
		expect(hash).toContain("territory_42");
	});

	it("includes ownerId in hash", () => {
		const hash = computeTerritoryHash([makeTerritory({ ownerId: "volt_collective" })]);
		expect(hash).toContain("volt_collective");
	});

	it("changes when territory strength changes", () => {
		const h1 = computeTerritoryHash([makeTerritory({ strength: 1.0 })]);
		const h2 = computeTerritoryHash([makeTerritory({ strength: 0.5 })]);
		expect(h1).not.toBe(h2);
	});

	it("changes when radius changes", () => {
		const h1 = computeTerritoryHash([makeTerritory({ radius: 10 })]);
		const h2 = computeTerritoryHash([makeTerritory({ radius: 20 })]);
		expect(h1).not.toBe(h2);
	});

	it("changes when ownerId changes", () => {
		const h1 = computeTerritoryHash([makeTerritory({ ownerId: "reclaimers" })]);
		const h2 = computeTerritoryHash([makeTerritory({ ownerId: "iron_creed" })]);
		expect(h1).not.toBe(h2);
	});

	it("is deterministic for same input", () => {
		const territories = [makeTerritory(), makeTerritory({ id: "territory_1", ownerId: "volt_collective" })];
		expect(computeTerritoryHash(territories)).toBe(computeTerritoryHash(territories));
	});

	it("differs for different array lengths", () => {
		const h1 = computeTerritoryHash([makeTerritory()]);
		const h2 = computeTerritoryHash([makeTerritory(), makeTerritory({ id: "t2" })]);
		expect(h1).not.toBe(h2);
	});
});

// ---------------------------------------------------------------------------
// clearBorderGeometryCache
// ---------------------------------------------------------------------------

describe("clearBorderGeometryCache", () => {
	it("exports a callable function", () => {
		expect(typeof clearBorderGeometryCache).toBe("function");
	});

	it("does not throw when cache is empty", () => {
		expect(() => clearBorderGeometryCache()).not.toThrow();
	});

	it("is idempotent — calling twice does not throw", () => {
		expect(() => {
			clearBorderGeometryCache();
			clearBorderGeometryCache();
		}).not.toThrow();
	});
});
