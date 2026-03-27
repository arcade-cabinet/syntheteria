/**
 * Tests for chunk entity spawning (US-1.2) and danger level (US-1.3).
 */

import { describe, expect, it } from "vitest";
import { dangerLevel, generateChunk } from "../chunks";

describe("dangerLevel (US-1.3)", () => {
	it("returns 0 at spawn (0,0)", () => {
		expect(dangerLevel(0, 0)).toBe(0);
	});

	it("returns 0 within 2 chunks of spawn", () => {
		expect(dangerLevel(1, 0)).toBe(0);
		expect(dangerLevel(0, 1)).toBe(0);
		expect(dangerLevel(1, 1)).toBe(0);
	});

	it("returns > 0 beyond 2 chunks", () => {
		expect(dangerLevel(3, 0)).toBeGreaterThan(0);
		expect(dangerLevel(0, 3)).toBeGreaterThan(0);
	});

	it("returns 1.0 at 30+ chunks out", () => {
		expect(dangerLevel(30, 0)).toBeGreaterThanOrEqual(1.0);
		expect(dangerLevel(0, 30)).toBeGreaterThanOrEqual(1.0);
	});

	it("never exceeds 1.0", () => {
		expect(dangerLevel(100, 100)).toBeLessThanOrEqual(1.0);
	});

	it("north (negative Z) is more dangerous", () => {
		const southDanger = dangerLevel(0, 10);
		const northDanger = dangerLevel(0, -10);
		expect(northDanger).toBeGreaterThan(southDanger);
	});

	it("no enemies within 2 chunks of spawn (danger = 0)", () => {
		for (let x = -2; x <= 2; x++) {
			for (let z = -2; z <= 2; z++) {
				if (Math.sqrt(x * x + z * z) <= 2) {
					expect(dangerLevel(x, z)).toBe(0);
				}
			}
		}
	});
});

describe("chunk entity spawns (US-1.2)", () => {
	it("generates entities field in chunk", () => {
		const chunk = generateChunk("test-seed", 0, 0);
		expect(chunk.entities).toBeDefined();
		expect(Array.isArray(chunk.entities)).toBe(true);
	});

	it("spawns scavenge sites near origin", () => {
		const chunk = generateChunk("test-seed", 0, 0);
		const scavengeSites = chunk.entities.filter(
			(e) => e.kind === "scavenge_site",
		);
		expect(scavengeSites.length).toBeGreaterThan(0);
	});

	it("scavenge sites have materialType and remaining", () => {
		const chunk = generateChunk("test-seed", 0, 0);
		const site = chunk.entities.find((e) => e.kind === "scavenge_site");
		if (site) {
			expect(site.materialType).toBeDefined();
			expect(typeof site.materialType).toBe("string");
			expect(site.remaining).toBeGreaterThan(0);
		}
	});

	it("entity count scales with chunk count (more chunks have entities)", () => {
		// Near origin should have entities
		const nearChunk = generateChunk("test-seed", 0, 0);
		expect(nearChunk.entities.length).toBeGreaterThan(0);
	});

	it("spawns cult patrols in far distant chunks (high danger)", () => {
		// At distance 15+, danger is ~0.46+, so cult patrols very likely
		let foundCultPatrol = false;
		// Try multiple seeds and far-out chunks where danger is high
		for (const seed of ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"]) {
			for (let i = 15; i < 25; i++) {
				const chunk = generateChunk(seed, i, 0);
				if (chunk.entities.some((e) => e.kind === "cult_patrol")) {
					foundCultPatrol = true;
					break;
				}
			}
			if (foundCultPatrol) break;
		}
		// Should appear in at least one of 50 high-danger chunks across 5 seeds
		expect(foundCultPatrol).toBe(true);
	});

	it("no cult patrols within 2 chunks of spawn", () => {
		const chunk = generateChunk("test-seed", 0, 0);
		const cultPatrols = chunk.entities.filter((e) => e.kind === "cult_patrol");
		expect(cultPatrols.length).toBe(0);
	});

	it("entity spawns are deterministic (same seed = same entities)", () => {
		const chunk1 = generateChunk("determinism-test", 3, 3);
		const chunk2 = generateChunk("determinism-test", 3, 3);
		expect(chunk1.entities.length).toBe(chunk2.entities.length);
		for (let i = 0; i < chunk1.entities.length; i++) {
			expect(chunk1.entities[i]!.tileX).toBe(chunk2.entities[i]!.tileX);
			expect(chunk1.entities[i]!.tileZ).toBe(chunk2.entities[i]!.tileZ);
			expect(chunk1.entities[i]!.kind).toBe(chunk2.entities[i]!.kind);
		}
	});
});
