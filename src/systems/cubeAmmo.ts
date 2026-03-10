/**
 * Cube ammo system — material cubes as thrown projectiles with damage calculation.
 *
 * Paper playtesting found that throwCube exists in grabber.ts but has no damage
 * calculation. This system fills that gap, turning physical material cubes into
 * ammo with per-material damage tables, distance falloff, splash radius, and
 * status effects.
 *
 * Core tension: do you smelt your rare cubes into tools, or throw them at enemies?
 * Each material has a damage profile and an economic value, so players must weigh
 * combat effectiveness against crafting opportunity cost.
 *
 * No config dependency — all balance values are self-contained for portability.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 3D vector for positions, directions, velocities. */
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A cube in flight after being thrown. */
export interface CubeProjectile {
	cubeId: string;
	materialType: string;
	throwerId: string;
	direction: Vec3;
	force: number;
	damage: number;
	splashRadius: number;
	position: Vec3;
	velocity: Vec3;
	active: boolean;
	timeAlive: number;
	maxLifetime: number;
}

/** Result of calculating throw damage for a material at a given force/distance. */
export interface ThrowDamageResult {
	baseDamage: number;
	forceMultiplier: number;
	distancePenalty: number;
	finalDamage: number;
	splashRadius: number;
	statusEffect: string | null;
	isCritical: boolean;
	cubeDestroyed: boolean;
}

/** Event emitted when a projectile hits a target. */
export interface ProjectileHit {
	projectileId: string;
	cubeId: string;
	targetId: string;
	damage: number;
	position: Vec3;
	isSplash: boolean;
}

/** Internal target registration. */
interface RegisteredTarget {
	entityId: string;
	position: Vec3;
	hitboxRadius: number;
}

// ---------------------------------------------------------------------------
// Material damage table
// ---------------------------------------------------------------------------

export interface MaterialDamageProfile {
	baseDamage: number;
	splashRadius: number;
	statusEffect: string | null;
	/** Chance the cube shatters on impact (0..1). */
	breakChance: number;
	/** Economic value — opportunity cost of using this cube as ammo. */
	economicValue: number;
}

export const MATERIAL_DAMAGE_TABLE: Record<string, MaterialDamageProfile> = {
	scrap_iron: {
		baseDamage: 15,
		splashRadius: 0,
		statusEffect: null,
		breakChance: 0.3,
		economicValue: 5,
	},
	copper: {
		baseDamage: 20,
		splashRadius: 0,
		statusEffect: null,
		breakChance: 0.4,
		economicValue: 15,
	},
	iron: {
		baseDamage: 30,
		splashRadius: 0,
		statusEffect: null,
		breakChance: 0.2,
		economicValue: 25,
	},
	rare_alloy: {
		baseDamage: 50,
		splashRadius: 2,
		statusEffect: null,
		breakChance: 0.1,
		economicValue: 100,
	},
	fiber_optics: {
		baseDamage: 10,
		splashRadius: 3,
		statusEffect: null,
		breakChance: 0.8,
		economicValue: 60,
	},
	e_waste: {
		baseDamage: 5,
		splashRadius: 1,
		statusEffect: "poison",
		breakChance: 0.9,
		economicValue: 10,
	},
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Force value at which the force multiplier is exactly 1.0. */
const REFERENCE_FORCE = 10;

/** Distance (meters) at which damage starts falling off. */
const FALLOFF_START = 5;

/** Maximum distance at which a projectile can deal damage. Beyond this, penalty = 1. */
const FALLOFF_END = 30;

/** Default projectile lifetime in seconds. */
const DEFAULT_MAX_LIFETIME = 5;

/** Gravity acceleration (m/s^2) applied to projectiles each tick. */
const GRAVITY = 9.81;

/** Critical hit multiplier for headshots / weak-point hits. */
const CRITICAL_MULTIPLIER = 2.0;

/** Chance for a critical hit (0..1). */
const CRITICAL_CHANCE = 0.15;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const projectiles = new Map<string, CubeProjectile>();
const targets = new Map<string, RegisteredTarget>();
let nextProjectileId = 0;

/** Seeded random for deterministic testing. When null, uses Math.random(). */
let randomFn: (() => number) | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getRandom(): number {
	return randomFn ? randomFn() : Math.random();
}

function generateProjectileId(): string {
	return `proj_${nextProjectileId++}`;
}

function distanceBetween(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getProfile(materialType: string): MaterialDamageProfile {
	return (
		MATERIAL_DAMAGE_TABLE[materialType] ?? {
			baseDamage: 10,
			splashRadius: 0,
			statusEffect: null,
			breakChance: 0.5,
			economicValue: 5,
		}
	);
}

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the damage a thrown cube would deal.
 *
 * Force multiplier: linear scaling relative to REFERENCE_FORCE (10).
 *   - force 10 → multiplier 1.0
 *   - force 20 → multiplier 2.0
 *   - force 5  → multiplier 0.5
 *
 * Distance penalty: 0 within 5m, then linear to 1.0 at 30m+.
 *   - penalty reduces finalDamage: final = base * forceMul * (1 - penalty)
 *
 * Critical hits multiply final damage by 2x at 15% chance.
 */
export function calculateThrowDamage(
	materialType: string,
	force: number,
	distance: number,
): ThrowDamageResult {
	const profile = getProfile(materialType);

	const baseDamage = profile.baseDamage;
	const forceMultiplier = Math.max(0, force / REFERENCE_FORCE);

	// Distance penalty: 0 within falloff start, ramps linearly to 1 at falloff end
	let distancePenalty = 0;
	if (distance > FALLOFF_START) {
		distancePenalty = Math.min(
			1,
			(distance - FALLOFF_START) / (FALLOFF_END - FALLOFF_START),
		);
	}

	const isCritical = getRandom() < CRITICAL_CHANCE;
	const critMul = isCritical ? CRITICAL_MULTIPLIER : 1;

	let finalDamage = baseDamage * forceMultiplier * (1 - distancePenalty) * critMul;
	finalDamage = Math.max(0, Math.round(finalDamage * 100) / 100);

	const cubeDestroyed = getRandom() < profile.breakChance;

	return {
		baseDamage,
		forceMultiplier,
		distancePenalty,
		finalDamage,
		splashRadius: profile.splashRadius,
		statusEffect: profile.statusEffect,
		isCritical,
		cubeDestroyed,
	};
}

// ---------------------------------------------------------------------------
// Projectile lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a projectile from a thrown cube.
 *
 * The initial velocity is direction * force (like the grabber impulse).
 * Returns the projectile ID for tracking.
 */
export function createProjectile(
	cubeId: string,
	materialType: string,
	throwerId: string,
	position: Vec3,
	direction: Vec3,
	force: number,
): string {
	const profile = getProfile(materialType);
	const id = generateProjectileId();

	const projectile: CubeProjectile = {
		cubeId,
		materialType,
		throwerId,
		direction: { ...direction },
		force,
		damage: profile.baseDamage,
		splashRadius: profile.splashRadius,
		position: { ...position },
		velocity: {
			x: direction.x * force,
			y: direction.y * force,
			z: direction.z * force,
		},
		active: true,
		timeAlive: 0,
		maxLifetime: DEFAULT_MAX_LIFETIME,
	};

	projectiles.set(id, projectile);
	return id;
}

/**
 * Advance all active projectiles by delta seconds.
 *
 * For each projectile:
 * 1. Move along velocity vector
 * 2. Apply gravity to velocity.y
 * 3. Check distance to all registered targets for collisions
 * 4. Deactivate expired or collided projectiles
 *
 * Returns an array of hit events (direct + splash).
 */
export function updateProjectiles(delta: number): ProjectileHit[] {
	const hits: ProjectileHit[] = [];

	for (const [projId, proj] of projectiles) {
		if (!proj.active) continue;

		// Advance time
		proj.timeAlive += delta;
		if (proj.timeAlive >= proj.maxLifetime) {
			proj.active = false;
			continue;
		}

		// Apply gravity
		proj.velocity.y -= GRAVITY * delta;

		// Move position
		proj.position.x += proj.velocity.x * delta;
		proj.position.y += proj.velocity.y * delta;
		proj.position.z += proj.velocity.z * delta;

		// Collision detection against registered targets
		for (const [_targetId, target] of targets) {
			// Don't hit the thrower
			if (target.entityId === proj.throwerId) continue;

			const dist = distanceBetween(proj.position, target.position);

			// Direct hit: within hitbox radius
			if (dist <= target.hitboxRadius) {
				const damageResult = calculateThrowDamage(
					proj.materialType,
					proj.force,
					distanceBetween(
						{ x: proj.position.x - proj.velocity.x * proj.timeAlive, y: 0, z: proj.position.z - proj.velocity.z * proj.timeAlive },
						target.position,
					),
				);

				hits.push({
					projectileId: projId,
					cubeId: proj.cubeId,
					targetId: target.entityId,
					damage: damageResult.finalDamage,
					position: { ...proj.position },
					isSplash: false,
				});

				proj.active = false;

				// Check splash damage on other targets
				if (proj.splashRadius > 0) {
					for (const [_splashTargetId, splashTarget] of targets) {
						if (splashTarget.entityId === target.entityId) continue;
						if (splashTarget.entityId === proj.throwerId) continue;

						const splashDist = distanceBetween(proj.position, splashTarget.position);
						if (splashDist <= proj.splashRadius) {
							// Splash damage falls off linearly with distance
							const splashFactor = 1 - splashDist / proj.splashRadius;
							const splashDamage = Math.max(
								1,
								Math.round(damageResult.finalDamage * splashFactor * 0.5 * 100) / 100,
							);

							hits.push({
								projectileId: projId,
								cubeId: proj.cubeId,
								targetId: splashTarget.entityId,
								damage: splashDamage,
								position: { ...proj.position },
								isSplash: true,
							});
						}
					}
				}

				break; // Projectile consumed by first hit
			}
		}

		// Deactivate if below ground (y < -10)
		if (proj.position.y < -10) {
			proj.active = false;
		}
	}

	// Cleanup inactive projectiles
	for (const [id, proj] of projectiles) {
		if (!proj.active) {
			projectiles.delete(id);
		}
	}

	return hits;
}

// ---------------------------------------------------------------------------
// Target registry
// ---------------------------------------------------------------------------

/**
 * Register an entity as a potential hit target for projectiles.
 */
export function registerTarget(
	entityId: string,
	position: Vec3,
	hitboxRadius: number,
): void {
	targets.set(entityId, {
		entityId,
		position: { ...position },
		hitboxRadius,
	});
}

/**
 * Remove a target from the registry (e.g. on death or despawn).
 */
export function unregisterTarget(entityId: string): void {
	targets.delete(entityId);
}

/**
 * Update a registered target's world position.
 */
export function updateTargetPosition(entityId: string, position: Vec3): void {
	const target = targets.get(entityId);
	if (target) {
		target.position.x = position.x;
		target.position.y = position.y;
		target.position.z = position.z;
	}
}

// ---------------------------------------------------------------------------
// Economic analysis
// ---------------------------------------------------------------------------

/**
 * Get the economic value of using a cube as ammo (opportunity cost).
 * Higher value = more expensive to throw.
 */
export function getCubeValue(materialType: string): number {
	return getProfile(materialType).economicValue;
}

/**
 * Get the damage-per-value ratio for a material type.
 * Higher = more efficient ammo (more damage per unit of economic value).
 */
export function getDamagePerValue(materialType: string): number {
	const profile = getProfile(materialType);
	if (profile.economicValue === 0) return Infinity;
	return profile.baseDamage / profile.economicValue;
}

/**
 * Recommend the best ammo type for a tactical situation.
 *
 * - Single target (targetCount <= 1): pick highest damage-per-value without splash
 * - Multiple targets (targetCount > 1): prefer splash damage materials,
 *   weighted by splash radius * damage per value
 */
export function getBestAmmoForSituation(
	availableMaterials: string[],
	targetCount: number,
): string {
	if (availableMaterials.length === 0) {
		return "scrap_iron"; // fallback
	}

	if (targetCount <= 1) {
		// Single target: highest damage-per-value for direct damage
		let bestMat = availableMaterials[0];
		let bestRatio = -1;

		for (const mat of availableMaterials) {
			const profile = getProfile(mat);
			const ratio = profile.baseDamage / Math.max(1, profile.economicValue);
			if (ratio > bestRatio) {
				bestRatio = ratio;
				bestMat = mat;
			}
		}

		return bestMat;
	}

	// Multiple targets: weight by splash effectiveness
	let bestMat = availableMaterials[0];
	let bestScore = -1;

	for (const mat of availableMaterials) {
		const profile = getProfile(mat);
		const dpv = profile.baseDamage / Math.max(1, profile.economicValue);

		// Score: if no splash, just dpv; if splash, bonus from radius * target coverage
		const splashBonus = profile.splashRadius > 0
			? profile.splashRadius * Math.min(targetCount, 5)
			: 0;
		const score = dpv + splashBonus;

		if (score > bestScore) {
			bestScore = score;
			bestMat = mat;
		}
	}

	return bestMat;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get a projectile by ID (for rendering / HUD).
 */
export function getProjectile(id: string): CubeProjectile | undefined {
	return projectiles.get(id);
}

/**
 * Get all active projectiles.
 */
export function getActiveProjectiles(): ReadonlyMap<string, CubeProjectile> {
	return projectiles;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Override the random function for deterministic tests.
 * Pass null to restore Math.random().
 */
export function _setRandomFn(fn: (() => number) | null): void {
	randomFn = fn;
}

/**
 * Reset all cube ammo state — projectiles, targets, ID counter.
 */
export function reset(): void {
	projectiles.clear();
	targets.clear();
	nextProjectileId = 0;
	randomFn = null;
}
