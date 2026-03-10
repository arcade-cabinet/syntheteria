/**
 * Unit tests for particleFeedbackMap.ts — game action to particle effect mapping.
 *
 * These tests ensure every core action has a particle effect and that
 * the emission pipeline produces valid configs for the rendering layer.
 */

import {
	getParticleEmission,
	getParticleEmissionForMaterial,
	getAllParticleEffects,
	hasParticleEffect,
	reset,
} from "../particleFeedbackMap";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Effect completeness — PAPER PLAYTEST ASSERTIONS
// ---------------------------------------------------------------------------

describe("particle effect completeness", () => {
	it("has particles for harvest actions", () => {
		expect(hasParticleEffect("harvest_sparks")).toBe(true);
		expect(hasParticleEffect("harvest_powder")).toBe(true);
	});

	it("has particles for compression", () => {
		expect(hasParticleEffect("compression_steam")).toBe(true);
		expect(hasParticleEffect("compression_slam_burst")).toBe(true);
	});

	it("has particles for cube interactions", () => {
		expect(hasParticleEffect("cube_spawn_burst")).toBe(true);
		expect(hasParticleEffect("cube_impact")).toBe(true);
		expect(hasParticleEffect("cube_topple_debris")).toBe(true);
	});

	it("has particles for furnace", () => {
		expect(hasParticleEffect("furnace_smoke")).toBe(true);
		expect(hasParticleEffect("furnace_flame")).toBe(true);
		expect(hasParticleEffect("furnace_complete_steam")).toBe(true);
	});

	it("has particles for combat", () => {
		expect(hasParticleEffect("weapon_muzzle")).toBe(true);
		expect(hasParticleEffect("hit_sparks")).toBe(true);
		expect(hasParticleEffect("explosion")).toBe(true);
	});

	it("has particles for movement", () => {
		expect(hasParticleEffect("footstep_dust")).toBe(true);
	});

	it("has particles for environment", () => {
		expect(hasParticleEffect("lightning_flash")).toBe(true);
		expect(hasParticleEffect("rain_splash")).toBe(true);
	});

	it("covers all core loop steps with particles", () => {
		const coreEffects = [
			"harvest_sparks", "harvest_powder",
			"compression_steam", "compression_slam_burst",
			"cube_spawn_burst",
			"furnace_flame", "furnace_complete_steam",
		];
		for (const effect of coreEffects) {
			expect(hasParticleEffect(effect)).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// getParticleEmission
// ---------------------------------------------------------------------------

describe("getParticleEmission", () => {
	it("returns valid emission for known effect", () => {
		const pos = { x: 5, y: 0, z: 10 };
		const emission = getParticleEmission("harvest_sparks", pos, 0);
		expect(emission).not.toBeNull();
		expect(emission!.effectId).toBe("sparks_grind");
		expect(emission!.position).toEqual(pos);
		expect(emission!.count).toBeGreaterThan(0);
	});

	it("returns null for unknown effect", () => {
		const emission = getParticleEmission("nonexistent", { x: 0, y: 0, z: 0 }, 0);
		expect(emission).toBeNull();
	});

	it("copies position to avoid mutation", () => {
		const pos = { x: 5, y: 0, z: 10 };
		const emission = getParticleEmission("cube_impact", pos, 0);
		pos.x = 999;
		expect(emission!.position.x).toBe(5);
	});

	it("burst effects have emissionRate 0", () => {
		const emission = getParticleEmission("compression_slam_burst", { x: 0, y: 0, z: 0 }, 0);
		expect(emission!.burst).toBe(true);
		expect(emission!.emissionRate).toBe(0);
	});

	it("continuous effects have emissionRate > 0", () => {
		const emission = getParticleEmission("harvest_sparks", { x: 0, y: 0, z: 0 }, 0);
		expect(emission!.burst).toBe(false);
		expect(emission!.emissionRate).toBeGreaterThan(0);
	});

	it("respects cooldown", () => {
		getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0);
		const blocked = getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0.1);
		expect(blocked).toBeNull();
	});

	it("allows emission after cooldown expires", () => {
		getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0);
		const after = getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 1.0);
		expect(after).not.toBeNull();
	});

	it("emissive flag set for glowing effects", () => {
		const emission = getParticleEmission("compression_slam_burst", { x: 0, y: 0, z: 0 }, 0);
		expect(emission!.emissive).toBe(true);
	});

	it("gravity set for debris effects", () => {
		const emission = getParticleEmission("cube_topple_debris", { x: 0, y: 0, z: 0 }, 0);
		expect(emission!.gravity).toBe(true);
	});

	it("no gravity for steam/smoke effects", () => {
		const emission = getParticleEmission("furnace_smoke", { x: 0, y: 0, z: 0 }, 0);
		expect(emission!.gravity).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Material-specific particles
// ---------------------------------------------------------------------------

describe("getParticleEmissionForMaterial", () => {
	it("overrides color with material color", () => {
		const emission = getParticleEmissionForMaterial(
			"cube_spawn_burst",
			{ x: 0, y: 0, z: 0 },
			"#cc4422",
			0,
		);
		expect(emission).not.toBeNull();
		expect(emission!.color).toBe("#cc4422");
	});

	it("returns null for unknown effect", () => {
		const emission = getParticleEmissionForMaterial(
			"nonexistent",
			{ x: 0, y: 0, z: 0 },
			"#cc4422",
			0,
		);
		expect(emission).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("queries", () => {
	it("getAllParticleEffects returns all registered effects", () => {
		const effects = getAllParticleEffects();
		expect(effects.length).toBeGreaterThan(15);
		expect(effects).toContain("harvest_sparks");
		expect(effects).toContain("explosion");
	});

	it("hasParticleEffect returns false for unknown", () => {
		expect(hasParticleEffect("totally_fake")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears cooldowns", () => {
		getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0);
		const blocked = getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0.1);
		expect(blocked).toBeNull();

		reset();
		const afterReset = getParticleEmission("cube_spawn_burst", { x: 0, y: 0, z: 0 }, 0.1);
		expect(afterReset).not.toBeNull();
	});
});
