/**
 * Particle feedback mapping — connects game events to visual particle effects.
 *
 * Paper playtesting found zero particle feedback anywhere. This system maps
 * game actions to particle emission configs, giving every action a visual
 * response: sparks from grinding, steam from compression, smoke from smelting.
 *
 * The particle pipeline:
 *   game event → particleFeedbackMap → particleEmitterSystem.emit()
 *
 * Particle categories follow industrial/mechanical aesthetic:
 * - Sparks: orange/yellow, fast, short-lived, from metal-on-metal
 * - Steam: white/gray, slow upward drift, from pressure release
 * - Smoke: dark gray, slow, billowing, from combustion
 * - Debris: gray/brown, fast initial, gravity-affected, from destruction
 * - Dust: terrain-colored, low ground-level, from movement
 * - Energy: faction-colored, glowing, from tech/hacking
 * - Powder: material-colored, fine, settling, from grinding
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A particle emission request for the rendering layer. */
export interface ParticleEmission {
	/** Particle effect preset ID */
	effectId: string;
	/** World position to emit from */
	position: { x: number; y: number; z: number };
	/** Direction bias for particle velocity (normalized) */
	direction: { x: number; y: number; z: number };
	/** Number of particles to emit */
	count: number;
	/** Base color (hex) */
	color: string;
	/** Particle lifetime in seconds */
	lifetime: number;
	/** Initial speed range [min, max] */
	speedRange: [number, number];
	/** Size range [min, max] */
	sizeRange: [number, number];
	/** Whether particles are affected by gravity */
	gravity: boolean;
	/** Whether this is a one-shot burst or continuous emitter */
	burst: boolean;
	/** Emission rate for continuous (particles per second, 0 for burst) */
	emissionRate: number;
	/** Whether particles glow (emissive) */
	emissive: boolean;
}

/** Mapping entry for a game action to particle config. */
interface ParticleMapping {
	effectId: string;
	count: number;
	color: string;
	lifetime: number;
	speedRange: [number, number];
	sizeRange: [number, number];
	direction: { x: number; y: number; z: number };
	gravity: boolean;
	burst: boolean;
	emissionRate: number;
	emissive: boolean;
	/** Cooldown in seconds between emissions */
	cooldown: number;
}

// ---------------------------------------------------------------------------
// Particle mappings
// ---------------------------------------------------------------------------

const PARTICLE_EFFECTS: Record<string, ParticleMapping> = {
	// --- Harvesting ---
	harvest_sparks: {
		effectId: "sparks_grind",
		count: 15,
		color: "#ff8800",
		lifetime: 0.4,
		speedRange: [3, 8],
		sizeRange: [0.02, 0.06],
		direction: { x: 0, y: 1, z: 0 },
		gravity: true,
		burst: false,
		emissionRate: 30,
		emissive: true,
		cooldown: 0,
	},
	harvest_powder: {
		effectId: "powder_spray",
		count: 8,
		color: "#999999",
		lifetime: 1.0,
		speedRange: [0.5, 2],
		sizeRange: [0.03, 0.08],
		direction: { x: 0, y: 0.5, z: 0 },
		gravity: true,
		burst: false,
		emissionRate: 15,
		emissive: false,
		cooldown: 0,
	},

	// --- Compression ---
	compression_steam: {
		effectId: "steam_burst",
		count: 20,
		color: "#cccccc",
		lifetime: 1.5,
		speedRange: [1, 3],
		sizeRange: [0.1, 0.3],
		direction: { x: 0, y: 1, z: 0 },
		gravity: false,
		burst: false,
		emissionRate: 10,
		emissive: false,
		cooldown: 0,
	},
	compression_slam_burst: {
		effectId: "slam_burst",
		count: 40,
		color: "#ffaa00",
		lifetime: 0.6,
		speedRange: [5, 15],
		sizeRange: [0.02, 0.05],
		direction: { x: 0, y: 0, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0,
	},

	// --- Cube interactions ---
	cube_spawn_burst: {
		effectId: "cube_pop",
		count: 25,
		color: "#ffcc44",
		lifetime: 0.8,
		speedRange: [2, 6],
		sizeRange: [0.03, 0.08],
		direction: { x: 0, y: 1, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0.5,
	},
	cube_impact: {
		effectId: "impact_sparks",
		count: 10,
		color: "#aaaaaa",
		lifetime: 0.3,
		speedRange: [2, 5],
		sizeRange: [0.02, 0.04],
		direction: { x: 0, y: 1, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: false,
		cooldown: 0.1,
	},
	cube_topple_debris: {
		effectId: "debris_scatter",
		count: 30,
		color: "#887766",
		lifetime: 1.2,
		speedRange: [1, 4],
		sizeRange: [0.05, 0.15],
		direction: { x: 0, y: 0.5, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: false,
		cooldown: 0.3,
	},

	// --- Furnace ---
	furnace_smoke: {
		effectId: "furnace_smoke",
		count: 5,
		color: "#444444",
		lifetime: 3.0,
		speedRange: [0.3, 1.0],
		sizeRange: [0.2, 0.5],
		direction: { x: 0, y: 1, z: 0 },
		gravity: false,
		burst: false,
		emissionRate: 5,
		emissive: false,
		cooldown: 0,
	},
	furnace_flame: {
		effectId: "furnace_flame",
		count: 8,
		color: "#ff4400",
		lifetime: 0.5,
		speedRange: [0.5, 2],
		sizeRange: [0.05, 0.15],
		direction: { x: 0, y: 1, z: 0 },
		gravity: false,
		burst: false,
		emissionRate: 15,
		emissive: true,
		cooldown: 0,
	},
	furnace_complete_steam: {
		effectId: "steam_puff",
		count: 15,
		color: "#ffffff",
		lifetime: 2.0,
		speedRange: [1, 3],
		sizeRange: [0.1, 0.25],
		direction: { x: 0, y: 1, z: 0 },
		gravity: false,
		burst: true,
		emissionRate: 0,
		emissive: false,
		cooldown: 0,
	},

	// --- Movement ---
	footstep_dust: {
		effectId: "foot_dust",
		count: 4,
		color: "#aa8866",
		lifetime: 0.8,
		speedRange: [0.2, 0.8],
		sizeRange: [0.05, 0.12],
		direction: { x: 0, y: 0.3, z: 0 },
		gravity: false,
		burst: true,
		emissionRate: 0,
		emissive: false,
		cooldown: 0.25,
	},

	// --- Combat ---
	weapon_muzzle: {
		effectId: "muzzle_flash",
		count: 6,
		color: "#ffee88",
		lifetime: 0.1,
		speedRange: [5, 10],
		sizeRange: [0.03, 0.06],
		direction: { x: 0, y: 0, z: 1 },
		gravity: false,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0,
	},
	hit_sparks: {
		effectId: "hit_sparks",
		count: 12,
		color: "#ffaa33",
		lifetime: 0.3,
		speedRange: [3, 8],
		sizeRange: [0.02, 0.05],
		direction: { x: 0, y: 1, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0,
	},
	explosion: {
		effectId: "explosion_debris",
		count: 50,
		color: "#ff6600",
		lifetime: 1.5,
		speedRange: [5, 15],
		sizeRange: [0.05, 0.2],
		direction: { x: 0, y: 0.5, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0,
	},

	// --- Environment ---
	lightning_flash: {
		effectId: "lightning_impact",
		count: 35,
		color: "#aaddff",
		lifetime: 0.8,
		speedRange: [5, 20],
		sizeRange: [0.02, 0.08],
		direction: { x: 0, y: 0, z: 0 },
		gravity: true,
		burst: true,
		emissionRate: 0,
		emissive: true,
		cooldown: 0,
	},
	rain_splash: {
		effectId: "rain_drop",
		count: 3,
		color: "#8899aa",
		lifetime: 0.3,
		speedRange: [0.5, 1.5],
		sizeRange: [0.02, 0.04],
		direction: { x: 0, y: 0.5, z: 0 },
		gravity: false,
		burst: true,
		emissionRate: 0,
		emissive: false,
		cooldown: 0.05,
	},
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const lastEmitTime = new Map<string, number>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get particle emission config for a game action.
 *
 * @param action   - Action name (e.g. "harvest_sparks", "cube_spawn_burst")
 * @param position - World position to emit from
 * @param time     - Current game time for cooldown
 * @returns ParticleEmission config, or null if on cooldown or unknown action
 */
export function getParticleEmission(
	action: string,
	position: { x: number; y: number; z: number },
	time: number,
): ParticleEmission | null {
	const mapping = PARTICLE_EFFECTS[action];
	if (!mapping) return null;

	// Enforce cooldown
	const lastTime = lastEmitTime.get(action) ?? -Infinity;
	if (time - lastTime < mapping.cooldown) {
		return null;
	}
	lastEmitTime.set(action, time);

	return {
		effectId: mapping.effectId,
		position: { ...position },
		direction: { ...mapping.direction },
		count: mapping.count,
		color: mapping.color,
		lifetime: mapping.lifetime,
		speedRange: [...mapping.speedRange],
		sizeRange: [...mapping.sizeRange],
		gravity: mapping.gravity,
		burst: mapping.burst,
		emissionRate: mapping.emissionRate,
		emissive: mapping.emissive,
	};
}

/**
 * Get a color-modified version of a particle effect for a specific material.
 *
 * Material cubes should spawn particles matching their material color.
 */
export function getParticleEmissionForMaterial(
	action: string,
	position: { x: number; y: number; z: number },
	materialColor: string,
	time: number,
): ParticleEmission | null {
	const base = getParticleEmission(action, position, time);
	if (!base) return null;
	base.color = materialColor;
	return base;
}

/**
 * Get all registered particle effect names.
 */
export function getAllParticleEffects(): string[] {
	return Object.keys(PARTICLE_EFFECTS);
}

/**
 * Check if an effect exists.
 */
export function hasParticleEffect(action: string): boolean {
	return action in PARTICLE_EFFECTS;
}

/**
 * Reset state — for testing.
 */
export function reset(): void {
	lastEmitTime.clear();
}
