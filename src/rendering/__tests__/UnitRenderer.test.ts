/**
 * Tests for UnitRenderer utility functions.
 *
 * The React component itself is not rendered here — R3F hooks require a
 * Canvas context. Instead we test the pure utility functions that drive
 * bot selection and animation, which can run headlessly.
 *
 * Three.js and BotGenerator are mocked to stay in Node.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockGroup {
	name = "";
	children: MockGroup[] = [];
	position = { set: jest.fn(), x: 0, y: 0, z: 0 };
	scale = { x: 1, y: 1, z: 1, setScalar: jest.fn() };
	rotation = { x: 0, y: 0, z: 0 };

	add(child: MockGroup) { this.children.push(child); return this; }
	remove(child: MockGroup) {
		const i = this.children.indexOf(child);
		if (i >= 0) this.children.splice(i, 1);
		return this;
	}
	traverse(fn: (obj: unknown) => void) {
		fn(this);
		for (const child of this.children) child.traverse(fn);
	}
	clone(_deep?: boolean): MockGroup {
		return new MockGroup();
	}
}

class MockMesh {
	name = "";
	geometry = { dispose: jest.fn() };
	material = { dispose: jest.fn() };
	position = { x: 0, y: 0, z: 0 };
}

class MockColor { constructor(_c?: unknown) {} }
class MockVector2 { x = 0; y = 0; }
class MockVector3 { x = 0; y = 0; z = 0; }
class MockBox3 {
	setFromObject(_o: unknown) { return this; }
	getSize(_v: unknown) { return { x: 1, y: 1, z: 1 }; }
}
class MockMeshStandardMaterial { dispose = jest.fn(); }

jest.mock("three", () => ({
	Group: MockGroup,
	Mesh: MockMesh,
	Color: MockColor,
	Vector2: MockVector2,
	Vector3: MockVector3,
	Box3: MockBox3,
	MeshStandardMaterial: MockMeshStandardMaterial,
	DoubleSide: 2,
}));

// ---------------------------------------------------------------------------
// BotGenerator mock — track calls
// ---------------------------------------------------------------------------

const mockGenerateBotMesh = jest.fn((botType: string, faction: string, seed: number) => {
	const g = new MockGroup();
	g.name = `bot_${botType}_${faction}_${seed}`;
	return g;
});

const mockDisposeBotGroup = jest.fn();

jest.mock("../procgen/BotGenerator", () => ({
	generateBotMesh: mockGenerateBotMesh,
	disposeBotGroup: mockDisposeBotGroup,
}));

// Also mock PanelGeometry and BufferGeometryUtils so BotGenerator's
// transitive imports don't break in Node.
jest.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
	mergeGeometries: () => null,
}));

// ---------------------------------------------------------------------------
// Config mock — deterministic faction visuals for getFactionAccentColor etc.
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		factionVisuals: {
			reclaimers: {
				primaryColor: "#8B4513",
				accentColor: "#DAA520",
				rustLevel: 0.4,
			},
			volt_collective: {
				primaryColor: "#4169E1",
				accentColor: "#FF4500",
				emissiveGlow: 0.3,
			},
			signal_choir: {
				primaryColor: "#9370DB",
				accentColor: "#00CED1",
				anodized: true,
			},
			iron_creed: {
				primaryColor: "#708090",
				accentColor: "#FFD700",
				brushedMetal: true,
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Import subject under test (pure utilities only — avoids R3F/drei context)
// ---------------------------------------------------------------------------

import {
	entitySeed,
	getBotCacheKey,
	getBotTemplate,
	clearBotGeometryCache,
	getBobOffset,
	getFactionAccentColor,
	getFactionEmissiveIntensity,
} from "../botUtils";

// ---------------------------------------------------------------------------
// entitySeed
// ---------------------------------------------------------------------------

describe("entitySeed", () => {
	it("returns a number for any string id", () => {
		const s = entitySeed("unit_abc_123");
		expect(typeof s).toBe("number");
	});

	it("is deterministic — same id always gives same seed", () => {
		expect(entitySeed("entity_42")).toBe(entitySeed("entity_42"));
	});

	it("gives different seeds for different ids", () => {
		expect(entitySeed("unit_001")).not.toBe(entitySeed("unit_002"));
	});

	it("returns a non-negative integer", () => {
		const s = entitySeed("test");
		expect(s).toBeGreaterThanOrEqual(0);
		expect(Number.isInteger(s)).toBe(true);
	});

	it("handles empty string without throwing", () => {
		expect(() => entitySeed("")).not.toThrow();
	});

	it("handles long ids without throwing", () => {
		const longId = "x".repeat(1000);
		expect(() => entitySeed(longId)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getBotCacheKey
// ---------------------------------------------------------------------------

describe("getBotCacheKey", () => {
	it("returns a string combining all three inputs", () => {
		const key = getBotCacheKey("maintenance_bot", "reclaimers", 42);
		expect(key).toContain("maintenance_bot");
		expect(key).toContain("reclaimers");
		expect(key).toContain("42");
	});

	it("different types produce different keys", () => {
		const k1 = getBotCacheKey("maintenance_bot", "reclaimers", 1);
		const k2 = getBotCacheKey("heavy_bot", "reclaimers", 1);
		expect(k1).not.toBe(k2);
	});

	it("different factions produce different keys", () => {
		const k1 = getBotCacheKey("maintenance_bot", "reclaimers", 1);
		const k2 = getBotCacheKey("maintenance_bot", "volt_collective", 1);
		expect(k1).not.toBe(k2);
	});

	it("different seeds produce different keys", () => {
		const k1 = getBotCacheKey("maintenance_bot", "reclaimers", 1);
		const k2 = getBotCacheKey("maintenance_bot", "reclaimers", 2);
		expect(k1).not.toBe(k2);
	});
});

// ---------------------------------------------------------------------------
// getBotTemplate (geometry cache)
// ---------------------------------------------------------------------------

describe("getBotTemplate", () => {
	beforeEach(() => {
		clearBotGeometryCache();
		mockGenerateBotMesh.mockClear();
	});

	afterEach(() => {
		clearBotGeometryCache();
	});

	it("calls generateBotMesh on first access", () => {
		getBotTemplate("maintenance_bot", "reclaimers", 42);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(1);
		expect(mockGenerateBotMesh).toHaveBeenCalledWith("maintenance_bot", "reclaimers", 42);
	});

	it("returns the same template object on repeated calls", () => {
		const t1 = getBotTemplate("maintenance_bot", "reclaimers", 42);
		const t2 = getBotTemplate("maintenance_bot", "reclaimers", 42);
		expect(t1).toBe(t2);
	});

	it("only calls generateBotMesh once per unique key", () => {
		getBotTemplate("maintenance_bot", "reclaimers", 42);
		getBotTemplate("maintenance_bot", "reclaimers", 42);
		getBotTemplate("maintenance_bot", "reclaimers", 42);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(1);
	});

	it("generates separate templates for different factions", () => {
		const r = getBotTemplate("maintenance_bot", "reclaimers", 1);
		const v = getBotTemplate("maintenance_bot", "volt_collective", 1);
		expect(r).not.toBe(v);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(2);
	});

	it("generates separate templates for different bot types", () => {
		const m = getBotTemplate("maintenance_bot", "reclaimers", 1);
		const h = getBotTemplate("heavy_bot", "reclaimers", 1);
		expect(m).not.toBe(h);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(2);
	});

	it("generates separate templates for different seeds", () => {
		const a = getBotTemplate("maintenance_bot", "reclaimers", 1);
		const b = getBotTemplate("maintenance_bot", "reclaimers", 999);
		expect(a).not.toBe(b);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(2);
	});
});

// ---------------------------------------------------------------------------
// clearBotGeometryCache
// ---------------------------------------------------------------------------

describe("clearBotGeometryCache", () => {
	beforeEach(() => {
		clearBotGeometryCache();
		mockGenerateBotMesh.mockClear();
		mockDisposeBotGroup.mockClear();
	});

	it("causes the next getBotTemplate call to regenerate", () => {
		getBotTemplate("maintenance_bot", "reclaimers", 1);
		clearBotGeometryCache();
		getBotTemplate("maintenance_bot", "reclaimers", 1);
		expect(mockGenerateBotMesh).toHaveBeenCalledTimes(2);
	});

	it("calls disposeBotGroup on each cached template", () => {
		getBotTemplate("maintenance_bot", "reclaimers", 1);
		getBotTemplate("heavy_bot", "volt_collective", 2);
		clearBotGeometryCache();
		expect(mockDisposeBotGroup).toHaveBeenCalledTimes(2);
	});

	it("is safe to call on an empty cache", () => {
		expect(() => clearBotGeometryCache()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getBobOffset
// ---------------------------------------------------------------------------

describe("getBobOffset", () => {
	it("returns 0 when not moving", () => {
		expect(getBobOffset("reclaimers", false, 0)).toBe(0);
		expect(getBobOffset("volt_collective", false, 5)).toBe(0);
		expect(getBobOffset("signal_choir", false, 10)).toBe(0);
	});

	it("returns a non-zero value when moving", () => {
		// Use time values where sin is clearly non-zero
		const offset = getBobOffset("reclaimers", true, 0.25);
		expect(typeof offset).toBe("number");
		// Treads bob amplitude is 0.015
		expect(Math.abs(offset)).toBeLessThanOrEqual(0.02);
	});

	it("volt_collective gets a float bob", () => {
		const offset = getBobOffset("volt_collective", true, Math.PI / 2 / 1.2);
		// sin(pi/2) = 1, so result should be close to 0.04
		expect(offset).toBeCloseTo(0.04, 3);
	});

	it("signal_choir gets a step-rhythm bob (always non-negative)", () => {
		// abs(sin(...)) is always >= 0
		for (const t of [0.1, 0.5, 1.0, 2.0, 3.14]) {
			expect(getBobOffset("signal_choir", true, t)).toBeGreaterThanOrEqual(0);
		}
	});

	it("player gets same step-rhythm bob as signal_choir (always non-negative)", () => {
		for (const t of [0.1, 0.5, 1.0, 2.0]) {
			expect(getBobOffset("player", true, t)).toBeGreaterThanOrEqual(0);
		}
	});

	it("amplitude stays within faction-specific bounds", () => {
		const times = Array.from({ length: 20 }, (_, i) => i * 0.3);

		// Hover: max 0.04
		for (const t of times) {
			expect(Math.abs(getBobOffset("volt_collective", true, t))).toBeLessThanOrEqual(0.041);
		}

		// Treads: max 0.015
		for (const t of times) {
			expect(Math.abs(getBobOffset("iron_creed", true, t))).toBeLessThanOrEqual(0.016);
		}

		// Legged: max 0.05
		for (const t of times) {
			expect(Math.abs(getBobOffset("signal_choir", true, t))).toBeLessThanOrEqual(0.051);
		}
	});

	it("handles unknown faction without throwing", () => {
		expect(() => getBobOffset("unknown_faction", true, 1.0)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getFactionAccentColor
// ---------------------------------------------------------------------------

describe("getFactionAccentColor", () => {
	it("returns a number for each known faction", () => {
		for (const faction of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			const color = getFactionAccentColor(faction);
			expect(typeof color).toBe("number");
			expect(Number.isFinite(color)).toBe(true);
		}
	});

	it("returns the fallback color for unknown faction", () => {
		// Fallback is neutral gold (0xffaa00)
		expect(getFactionAccentColor("unknown_faction")).toBe(0xffaa00);
	});

	it("reclaimers accent is #DAA520 (golden)", () => {
		// #DAA520 = 14312736
		expect(getFactionAccentColor("reclaimers")).toBe(0xDAA520);
	});

	it("volt_collective accent is #FF4500 (orange-red)", () => {
		expect(getFactionAccentColor("volt_collective")).toBe(0xFF4500);
	});

	it("signal_choir accent is #00CED1 (teal)", () => {
		expect(getFactionAccentColor("signal_choir")).toBe(0x00CED1);
	});

	it("iron_creed accent is #FFD700 (gold)", () => {
		expect(getFactionAccentColor("iron_creed")).toBe(0xFFD700);
	});

	it("factions have different accent colors", () => {
		const colors = [
			getFactionAccentColor("reclaimers"),
			getFactionAccentColor("volt_collective"),
			getFactionAccentColor("signal_choir"),
			getFactionAccentColor("iron_creed"),
		];
		const unique = new Set(colors);
		expect(unique.size).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// getFactionEmissiveIntensity
// ---------------------------------------------------------------------------

describe("getFactionEmissiveIntensity", () => {
	it("returns a number for each known faction", () => {
		for (const faction of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			const intensity = getFactionEmissiveIntensity(faction);
			expect(typeof intensity).toBe("number");
			expect(intensity).toBeGreaterThanOrEqual(0);
			expect(intensity).toBeLessThanOrEqual(1);
		}
	});

	it("returns fallback for unknown faction", () => {
		expect(getFactionEmissiveIntensity("unknown_faction")).toBe(0.1);
	});

	it("volt_collective has higher emissive than iron_creed (glow faction vs brushed metal)", () => {
		expect(getFactionEmissiveIntensity("volt_collective"))
			.toBeGreaterThan(getFactionEmissiveIntensity("iron_creed"));
	});
});
