/**
 * Particle emitter data system.
 *
 * Manages a pool of active particle effects as pure data.
 * React/Three.js rendering components read from getActiveParticles()
 * and translate each effect into visual geometry — this module never
 * touches the GPU.
 *
 * Features:
 * - 10 effect types covering the full game-play loop
 * - Configurable max particle limit (default 200)
 * - Tick-based expiration via particleEmitterSystem()
 * - Unique ID generation per effect
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParticleEffectType =
	| "harvest_sparks"
	| "compress_burst"
	| "cube_impact"
	| "explosion"
	| "lightning_strike"
	| "acid_drip"
	| "smoke"
	| "dust_trail"
	| "build_sparks"
	| "heal_glow";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface ParticleEffect {
	id: string;
	type: ParticleEffectType;
	position: Vec3;
	direction: Vec3;
	intensity: number;
	duration: number;
	color: string;
	startTick: number;
}

export interface EmitParticleOptions {
	direction?: Vec3;
	intensity?: number;
	duration?: number;
	color?: string;
	startTick?: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let activeParticles: ParticleEffect[] = [];
let maxParticles = 200;
let nextId = 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue a new particle effect.
 *
 * @param type     - The visual effect type.
 * @param position - World-space origin of the effect.
 * @param options  - Optional overrides for direction, intensity, etc.
 * @returns The created ParticleEffect, or null if the pool is full.
 */
export function emitParticle(
	type: ParticleEffectType,
	position: Vec3,
	options: EmitParticleOptions = {},
): ParticleEffect | null {
	if (activeParticles.length >= maxParticles) {
		return null;
	}

	const effect: ParticleEffect = {
		id: `particle_${nextId++}`,
		type,
		position: { ...position },
		direction: options.direction ? { ...options.direction } : { x: 0, y: 1, z: 0 },
		intensity: clampIntensity(options.intensity ?? 0.5),
		duration: Math.max(1, options.duration ?? 60),
		color: options.color ?? "#ffffff",
		startTick: options.startTick ?? 0,
	};

	activeParticles.push(effect);
	return effect;
}

/**
 * Return all currently active particle effects.
 * The returned array is a shallow copy — mutating it will not affect
 * internal state.
 */
export function getActiveParticles(): ParticleEffect[] {
	return [...activeParticles];
}

/**
 * Return the total number of active particle effects.
 */
export function getParticleCount(): number {
	return activeParticles.length;
}

/**
 * Tick the particle system — removes effects whose lifetime has elapsed.
 *
 * @param currentTick - The game's current simulation tick.
 */
export function particleEmitterSystem(currentTick: number): void {
	activeParticles = activeParticles.filter(
		(p) => currentTick - p.startTick < p.duration,
	);
}

/**
 * Set the maximum number of simultaneous particle effects.
 * Existing effects are NOT culled; the cap only prevents new emissions.
 */
export function setMaxParticles(limit: number): void {
	maxParticles = Math.max(1, limit);
}

/**
 * Get the current maximum particle limit.
 */
export function getMaxParticles(): number {
	return maxParticles;
}

/**
 * Clear all particles and reset configuration. Primarily for testing.
 */
export function reset(): void {
	activeParticles = [];
	maxParticles = 200;
	nextId = 1;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampIntensity(value: number): number {
	return Math.max(0, Math.min(1, value));
}
