/**
 * Tests for the particle emitter data system.
 *
 * Tests cover:
 * - emitParticle creates effects with correct defaults
 * - Custom options override defaults
 * - getActiveParticles returns a snapshot (not a reference)
 * - getParticleCount tracks active effects
 * - particleEmitterSystem expires effects by tick
 * - Max particle limit rejects new effects when full
 * - setMaxParticles / getMaxParticles configuration
 * - Intensity clamping (0–1)
 * - Duration minimum enforcement
 * - reset clears all state
 * - All 10 effect types can be emitted
 * - Direction vector is copied (not referenced)
 * - IDs are unique and sequential
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	type EmitParticleOptions,
	type ParticleEffect,
	type ParticleEffectType,
	type Vec3,
	emitParticle,
	getActiveParticles,
	getMaxParticles,
	getParticleCount,
	particleEmitterSystem,
	reset,
	setMaxParticles,
} from "../particleEmitterSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function origin(): Vec3 {
	return { x: 0, y: 0, z: 0 };
}

function somePosition(): Vec3 {
	return { x: 5, y: 10, z: -3 };
}

// ---------------------------------------------------------------------------
// emitParticle basics
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — emitParticle", () => {
	it("creates a particle effect with default values", () => {
		const effect = emitParticle("harvest_sparks", origin());

		expect(effect).not.toBeNull();
		expect(effect!.type).toBe("harvest_sparks");
		expect(effect!.position).toEqual({ x: 0, y: 0, z: 0 });
		expect(effect!.direction).toEqual({ x: 0, y: 1, z: 0 });
		expect(effect!.intensity).toBe(0.5);
		expect(effect!.duration).toBe(60);
		expect(effect!.color).toBe("#ffffff");
		expect(effect!.startTick).toBe(0);
	});

	it("applies custom options", () => {
		const opts: EmitParticleOptions = {
			direction: { x: 1, y: 0, z: 0 },
			intensity: 0.8,
			duration: 120,
			color: "#ff0000",
			startTick: 50,
		};

		const effect = emitParticle("explosion", somePosition(), opts);

		expect(effect).not.toBeNull();
		expect(effect!.type).toBe("explosion");
		expect(effect!.position).toEqual(somePosition());
		expect(effect!.direction).toEqual({ x: 1, y: 0, z: 0 });
		expect(effect!.intensity).toBe(0.8);
		expect(effect!.duration).toBe(120);
		expect(effect!.color).toBe("#ff0000");
		expect(effect!.startTick).toBe(50);
	});

	it("generates unique sequential IDs", () => {
		const e1 = emitParticle("smoke", origin());
		const e2 = emitParticle("smoke", origin());
		const e3 = emitParticle("smoke", origin());

		expect(e1!.id).toBe("particle_1");
		expect(e2!.id).toBe("particle_2");
		expect(e3!.id).toBe("particle_3");
	});

	it("copies position — mutating the input does not affect the effect", () => {
		const pos = { x: 1, y: 2, z: 3 };
		const effect = emitParticle("dust_trail", pos);

		pos.x = 999;

		expect(effect!.position.x).toBe(1);
	});

	it("copies direction — mutating the input does not affect the effect", () => {
		const dir = { x: 0, y: 0, z: 1 };
		const effect = emitParticle("dust_trail", origin(), { direction: dir });

		dir.z = 999;

		expect(effect!.direction.z).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// All effect types
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — effect types", () => {
	it("supports all 10 particle effect types", () => {
		const types: ParticleEffectType[] = [
			"harvest_sparks",
			"compress_burst",
			"cube_impact",
			"explosion",
			"lightning_strike",
			"acid_drip",
			"smoke",
			"dust_trail",
			"build_sparks",
			"heal_glow",
		];

		for (const type of types) {
			const effect = emitParticle(type, origin());
			expect(effect).not.toBeNull();
			expect(effect!.type).toBe(type);
		}

		expect(getParticleCount()).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// getActiveParticles
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — getActiveParticles", () => {
	it("returns empty array when no particles exist", () => {
		expect(getActiveParticles()).toEqual([]);
	});

	it("returns all emitted particles", () => {
		emitParticle("smoke", origin());
		emitParticle("explosion", somePosition());

		const particles = getActiveParticles();
		expect(particles).toHaveLength(2);
		expect(particles[0].type).toBe("smoke");
		expect(particles[1].type).toBe("explosion");
	});

	it("returns a shallow copy — mutating it does not affect internal state", () => {
		emitParticle("smoke", origin());

		const particles = getActiveParticles();
		particles.length = 0;

		expect(getParticleCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getParticleCount
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — getParticleCount", () => {
	it("returns 0 when empty", () => {
		expect(getParticleCount()).toBe(0);
	});

	it("tracks the number of active particles", () => {
		emitParticle("smoke", origin());
		expect(getParticleCount()).toBe(1);

		emitParticle("explosion", origin());
		expect(getParticleCount()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// particleEmitterSystem (tick)
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — tick expiration", () => {
	it("removes particles whose duration has elapsed", () => {
		emitParticle("smoke", origin(), { startTick: 0, duration: 10 });

		particleEmitterSystem(9);
		expect(getParticleCount()).toBe(1);

		particleEmitterSystem(10);
		expect(getParticleCount()).toBe(0);
	});

	it("keeps particles that have not yet expired", () => {
		emitParticle("smoke", origin(), { startTick: 0, duration: 100 });

		particleEmitterSystem(50);
		expect(getParticleCount()).toBe(1);
	});

	it("handles mixed expiration times correctly", () => {
		emitParticle("smoke", origin(), { startTick: 0, duration: 5 });
		emitParticle("explosion", origin(), { startTick: 0, duration: 15 });
		emitParticle("heal_glow", origin(), { startTick: 10, duration: 10 });

		// tick 5: smoke expires (5-0=5, not <5), explosion alive (5<15), heal_glow alive (5-10=-5 <10)
		particleEmitterSystem(5);
		expect(getParticleCount()).toBe(2);

		// tick 15: explosion expires (15-0=15, not <15), heal_glow alive (15-10=5 <10)
		particleEmitterSystem(15);
		expect(getParticleCount()).toBe(1);

		const remaining = getActiveParticles();
		expect(remaining[0].type).toBe("heal_glow");
	});

	it("removes particle exactly when currentTick - startTick equals duration", () => {
		emitParticle("smoke", origin(), { startTick: 5, duration: 10 });

		// tick 14: 14 - 5 = 9 < 10, still active
		particleEmitterSystem(14);
		expect(getParticleCount()).toBe(1);

		// tick 15: 15 - 5 = 10, NOT < 10, expired
		particleEmitterSystem(15);
		expect(getParticleCount()).toBe(0);
	});

	it("does nothing when no particles exist", () => {
		expect(() => particleEmitterSystem(100)).not.toThrow();
		expect(getParticleCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Max particle limit
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — max particle limit", () => {
	it("rejects new particles when at the limit", () => {
		setMaxParticles(3);

		emitParticle("smoke", origin());
		emitParticle("smoke", origin());
		emitParticle("smoke", origin());

		const rejected = emitParticle("smoke", origin());
		expect(rejected).toBeNull();
		expect(getParticleCount()).toBe(3);
	});

	it("accepts new particles after expired ones are removed", () => {
		setMaxParticles(2);

		emitParticle("smoke", origin(), { startTick: 0, duration: 5 });
		emitParticle("smoke", origin(), { startTick: 0, duration: 5 });

		expect(emitParticle("smoke", origin())).toBeNull();

		particleEmitterSystem(5);
		expect(getParticleCount()).toBe(0);

		const effect = emitParticle("smoke", origin());
		expect(effect).not.toBeNull();
	});

	it("default max is 200", () => {
		expect(getMaxParticles()).toBe(200);
	});

	it("setMaxParticles enforces minimum of 1", () => {
		setMaxParticles(0);
		expect(getMaxParticles()).toBe(1);

		setMaxParticles(-10);
		expect(getMaxParticles()).toBe(1);
	});

	it("setMaxParticles does not cull existing particles", () => {
		emitParticle("smoke", origin());
		emitParticle("smoke", origin());
		emitParticle("smoke", origin());

		setMaxParticles(1);

		expect(getParticleCount()).toBe(3);
		expect(emitParticle("smoke", origin())).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Intensity clamping
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — intensity clamping", () => {
	it("clamps intensity to 0 when negative", () => {
		const effect = emitParticle("smoke", origin(), { intensity: -0.5 });
		expect(effect!.intensity).toBe(0);
	});

	it("clamps intensity to 1 when above 1", () => {
		const effect = emitParticle("smoke", origin(), { intensity: 5.0 });
		expect(effect!.intensity).toBe(1);
	});

	it("leaves valid intensity values unchanged", () => {
		const effect = emitParticle("smoke", origin(), { intensity: 0.7 });
		expect(effect!.intensity).toBe(0.7);
	});

	it("allows boundary values 0 and 1", () => {
		const e0 = emitParticle("smoke", origin(), { intensity: 0 });
		const e1 = emitParticle("smoke", origin(), { intensity: 1 });
		expect(e0!.intensity).toBe(0);
		expect(e1!.intensity).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Duration minimum
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — duration minimum", () => {
	it("enforces minimum duration of 1", () => {
		const e0 = emitParticle("smoke", origin(), { duration: 0 });
		const eNeg = emitParticle("smoke", origin(), { duration: -10 });

		expect(e0!.duration).toBe(1);
		expect(eNeg!.duration).toBe(1);
	});

	it("preserves valid durations", () => {
		const effect = emitParticle("smoke", origin(), { duration: 42 });
		expect(effect!.duration).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("particleEmitterSystem — reset", () => {
	it("clears all particles", () => {
		emitParticle("smoke", origin());
		emitParticle("explosion", origin());

		reset();

		expect(getParticleCount()).toBe(0);
		expect(getActiveParticles()).toEqual([]);
	});

	it("resets max particles to 200", () => {
		setMaxParticles(5);
		reset();
		expect(getMaxParticles()).toBe(200);
	});

	it("resets ID counter", () => {
		emitParticle("smoke", origin());
		emitParticle("smoke", origin());

		reset();

		const effect = emitParticle("smoke", origin());
		expect(effect!.id).toBe("particle_1");
	});
});
