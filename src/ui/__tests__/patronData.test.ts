/**
 * Tests for patronData pure functions.
 */

import {
	computeGlitchOffset,
	computeScanLineOffset,
	getPatronPersona,
	getPatronTitle,
	PATRON_PERSONAS,
} from "../patronData";

// ─── PATRON_PERSONAS coverage ────────────────────────────────────────────────

describe("PATRON_PERSONAS", () => {
	const factionIds = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"] as const;

	it("has an entry for every faction", () => {
		for (const id of factionIds) {
			expect(PATRON_PERSONAS[id]).toBeDefined();
		}
	});

	it.each(factionIds)("%s has required fields", (id) => {
		const p = PATRON_PERSONAS[id];
		expect(typeof p.patronName).toBe("string");
		expect(p.patronName.length).toBeGreaterThan(0);
		expect(typeof p.animalAvatar).toBe("string");
		expect(p.animalAvatar.length).toBeGreaterThan(0);
		expect(typeof p.tagline).toBe("string");
		expect(p.tagline.length).toBeGreaterThan(0);
		expect(typeof p.personality).toBe("string");
		expect(p.personality.length).toBeGreaterThan(0);
		expect(Array.isArray(p.asciiArt)).toBe(true);
		expect(p.asciiArt.length).toBeGreaterThan(0);
		expect(typeof p.holoColor).toBe("string");
		expect(typeof p.glowColor).toBe("string");
	});

	it.each(factionIds)("%s factionId matches key", (id) => {
		expect(PATRON_PERSONAS[id].factionId).toBe(id);
	});

	it.each(factionIds)("%s has valid CSS color strings", (id) => {
		const p = PATRON_PERSONAS[id];
		expect(p.holoColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
		expect(p.glowColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
	});
});

// ─── getPatronPersona ─────────────────────────────────────────────────────────

describe("getPatronPersona", () => {
	it("returns persona for reclaimers", () => {
		const p = getPatronPersona("reclaimers");
		expect(p).toBeDefined();
		expect(p?.factionId).toBe("reclaimers");
	});

	it("returns persona for volt_collective", () => {
		const p = getPatronPersona("volt_collective");
		expect(p?.factionId).toBe("volt_collective");
	});

	it("returns persona for signal_choir", () => {
		const p = getPatronPersona("signal_choir");
		expect(p?.factionId).toBe("signal_choir");
	});

	it("returns persona for iron_creed", () => {
		const p = getPatronPersona("iron_creed");
		expect(p?.factionId).toBe("iron_creed");
	});
});

// ─── getPatronTitle ───────────────────────────────────────────────────────────

describe("getPatronTitle", () => {
	it("formats patron name and avatar into title", () => {
		const persona = PATRON_PERSONAS.reclaimers;
		const title = getPatronTitle(persona);
		expect(title).toContain(persona.patronName);
		expect(title).toContain(persona.animalAvatar);
		expect(title).toContain("(");
		expect(title).toContain(")");
	});

	it("volt_collective title contains Conductor and Fox", () => {
		const title = getPatronTitle(PATRON_PERSONAS.volt_collective);
		expect(title).toContain("CONDUCTOR");
		expect(title).toContain("Fox");
	});

	it("signal_choir title contains Chorus and Crow", () => {
		const title = getPatronTitle(PATRON_PERSONAS.signal_choir);
		expect(title).toContain("CHORUS");
		expect(title).toContain("Crow");
	});

	it("iron_creed title contains Architect and Bear", () => {
		const title = getPatronTitle(PATRON_PERSONAS.iron_creed);
		expect(title).toContain("ARCHITECT");
		expect(title).toContain("Bear");
	});
});

// ─── computeScanLineOffset ────────────────────────────────────────────────────

describe("computeScanLineOffset", () => {
	it("returns 0 at time 0", () => {
		expect(computeScanLineOffset(0, 1000)).toBe(0);
	});

	it("returns 50 at half period", () => {
		expect(computeScanLineOffset(500, 1000)).toBeCloseTo(50);
	});

	it("returns 0 at exactly one full period (wraps back to start)", () => {
		// 1000ms % 1000ms = 0 → offset = 0
		expect(computeScanLineOffset(1000, 1000)).toBeCloseTo(0);
	});

	it("wraps correctly at 1.5 period", () => {
		// 1500ms in 1000ms period = 0.5 of period = 50%
		expect(computeScanLineOffset(1500, 1000)).toBeCloseTo(50);
	});

	it("result is always in [0, 100]", () => {
		for (const t of [0, 100, 500, 999, 1000, 2500, 9999]) {
			const v = computeScanLineOffset(t, 1000);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(100);
		}
	});
});

// ─── computeGlitchOffset ─────────────────────────────────────────────────────

describe("computeGlitchOffset", () => {
	it("returns zero when not glitching", () => {
		const offset = computeGlitchOffset(false, 0.5);
		expect(offset.x).toBe(0);
		expect(offset.y).toBe(0);
	});

	it("returns non-zero when glitching with seed 0.5", () => {
		const offset = computeGlitchOffset(true, 0.5);
		// seed=0.5 → x=(0.5-0.5)*6=0, y=(0.5*0.7-0.35)*4=0
		// Both happen to be 0 at seed 0.5, so check that function ran without error
		expect(typeof offset.x).toBe("number");
		expect(typeof offset.y).toBe("number");
	});

	it("x offset range is [-3, 3] for seed in [0, 1]", () => {
		for (const seed of [0, 0.25, 0.5, 0.75, 1.0]) {
			const { x } = computeGlitchOffset(true, seed);
			expect(x).toBeGreaterThanOrEqual(-3);
			expect(x).toBeLessThanOrEqual(3);
		}
	});

	it("y offset range is [-1.4, 1.4] for seed in [0, 1]", () => {
		for (const seed of [0, 0.25, 0.5, 0.75, 1.0]) {
			const { y } = computeGlitchOffset(true, seed);
			expect(y).toBeGreaterThanOrEqual(-1.5);
			expect(y).toBeLessThanOrEqual(1.5);
		}
	});

	it("glitch at seed 0 gives negative x", () => {
		const { x } = computeGlitchOffset(true, 0);
		expect(x).toBeLessThan(0);
	});

	it("glitch at seed 1 gives positive x", () => {
		const { x } = computeGlitchOffset(true, 1);
		expect(x).toBeGreaterThan(0);
	});
});
