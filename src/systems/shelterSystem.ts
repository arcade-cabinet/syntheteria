/**
 * Shelter system — players build shelters over cube stockpiles to protect
 * them from storm damage and hide them from AI perception.
 *
 * Paper playtesting found that storms damage exposed cubes, creating a
 * natural need for roofing structures. Shelters reduce weather damage to
 * cubes within their radius and optionally block AI line-of-sight.
 *
 * Coverage:
 *  - walls + roof = 1.0 (full protection)
 *  - roof only = 0.7
 *  - partial walls = somewhere in between
 *
 * Durability degrades during storms proportional to stormIntensity.
 * When durability reaches 0 the shelter is destroyed.
 *
 * No config dependency — all tunables are passed via the Shelter interface
 * or function arguments.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Shelter {
	id: string;
	position: { x: number; y: number; z: number };
	radius: number;
	height: number;
	coveragePercent: number;
	material: string;
	durability: number;
	maxDurability: number;
	protectsFromWeather: boolean;
	hidesFromPerception: boolean;
	ownerFaction: string;
}

export interface ShelterStatus {
	sheltered: boolean;
	shelterId: string | null;
	coveragePercent: number;
	weatherDamageReduction: number;
	perceptionBlocked: boolean;
}

export interface DamageReport {
	shelterId: string;
	damageTaken: number;
	remainingDurability: number;
	destroyed: boolean;
}

export interface CubePosition {
	id: string;
	position: { x: number; y: number; z: number };
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const shelters = new Map<string, Shelter>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist2D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function dist3D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if a position is within a shelter's coverage volume.
 * The shelter covers a cylinder: horizontal radius check + vertical height check.
 */
function isInsideShelter(
	pos: { x: number; y: number; z: number },
	shelter: Shelter,
): boolean {
	// Horizontal distance must be within radius
	const hDist = dist2D(pos, shelter.position);
	if (hDist > shelter.radius) return false;

	// Vertical: position must be at or below shelter ceiling height
	// Shelter floor is at shelter.position.y, ceiling is position.y + height
	const floorY = shelter.position.y;
	const ceilingY = floorY + shelter.height;
	return pos.y >= floorY && pos.y <= ceilingY;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Register a shelter in the system. Overwrites if ID already exists.
 */
export function registerShelter(shelter: Shelter): void {
	shelters.set(shelter.id, { ...shelter });
}

/**
 * Remove a shelter by ID.
 */
export function removeShelter(id: string): void {
	shelters.delete(id);
}

/**
 * Apply damage to a shelter's durability. Returns whether it was destroyed.
 * If destroyed, the shelter is automatically removed.
 */
export function updateShelterDurability(
	id: string,
	damage: number,
): { destroyed: boolean } {
	const shelter = shelters.get(id);
	if (!shelter) return { destroyed: false };

	shelter.durability = Math.max(0, shelter.durability - damage);
	const destroyed = shelter.durability === 0;

	if (destroyed) {
		shelters.delete(id);
	}

	return { destroyed };
}

/**
 * Repair a shelter's durability. Cannot exceed maxDurability.
 * Returns the actual amount repaired.
 */
export function repairShelter(id: string, amount: number): number {
	const shelter = shelters.get(id);
	if (!shelter) return 0;

	const before = shelter.durability;
	shelter.durability = Math.min(shelter.maxDurability, shelter.durability + amount);
	return shelter.durability - before;
}

/**
 * Check whether a world position is sheltered.
 *
 * If the position is inside multiple shelters, the one with the highest
 * coveragePercent is used.
 */
export function isPositionSheltered(position: {
	x: number;
	y: number;
	z: number;
}): ShelterStatus {
	let bestShelter: Shelter | null = null;

	for (const shelter of shelters.values()) {
		if (!isInsideShelter(position, shelter)) continue;

		if (!bestShelter || shelter.coveragePercent > bestShelter.coveragePercent) {
			bestShelter = shelter;
		}
	}

	if (!bestShelter) {
		return {
			sheltered: false,
			shelterId: null,
			coveragePercent: 0,
			weatherDamageReduction: 0,
			perceptionBlocked: false,
		};
	}

	return {
		sheltered: true,
		shelterId: bestShelter.id,
		coveragePercent: bestShelter.coveragePercent,
		weatherDamageReduction: bestShelter.protectsFromWeather
			? bestShelter.coveragePercent
			: 0,
		perceptionBlocked: bestShelter.hidesFromPerception,
	};
}

/**
 * Given an array of cube positions, return the IDs of cubes that are NOT
 * under any shelter.
 */
export function getExposedCubes(cubePositions: CubePosition[]): string[] {
	const exposed: string[] = [];
	for (const cube of cubePositions) {
		const status = isPositionSheltered(cube.position);
		if (!status.sheltered) {
			exposed.push(cube.id);
		}
	}
	return exposed;
}

/**
 * Estimate how many 0.5m cubes can fit inside a shelter's footprint.
 *
 * `current` counts registered cubes that are inside this shelter (pass via
 * isPositionSheltered externally). For simplicity, we estimate max from the
 * shelter's cylindrical volume using a 0.5m cube packing.
 *
 * Max cubes = floor(pi * r^2 / 0.25) * floor(h / 0.5)
 * (0.25 = 0.5*0.5, the footprint of one cube; floor(h/0.5) = vertical layers)
 */
export function getShelterCapacity(
	id: string,
): { current: number; max: number } {
	const shelter = shelters.get(id);
	if (!shelter) return { current: 0, max: 0 };

	const cubeSize = 0.5;
	const footprint = cubeSize * cubeSize; // 0.25 m^2
	const circleArea = Math.PI * shelter.radius * shelter.radius;
	const horizontalSlots = Math.floor(circleArea / footprint);
	const verticalLayers = Math.floor(shelter.height / cubeSize);
	const max = horizontalSlots * verticalLayers;

	// We don't track cubes internally — return 0 for current.
	// The caller should use isPositionSheltered to count cubes inside.
	return { current: 0, max };
}

/**
 * Apply storm damage to all shelters. Damage is proportional to stormIntensity
 * and delta (time step). Only shelters with protectsFromWeather are damaged
 * (they're actively bearing the load).
 *
 * Formula: damage = stormIntensity * delta * (1 / coveragePercent)
 * Higher coverage shelters take slightly more damage (bigger surface area).
 * Minimum damage per tick is stormIntensity * delta * 1.0.
 */
export function applyStormDamageToShelters(
	stormIntensity: number,
	delta: number,
): DamageReport[] {
	const reports: DamageReport[] = [];

	// Collect shelter IDs first to avoid mutation during iteration
	const shelterIds = Array.from(shelters.keys());

	for (const id of shelterIds) {
		const shelter = shelters.get(id);
		if (!shelter) continue;
		if (!shelter.protectsFromWeather) continue;

		// More coverage = more surface area to absorb storm = slightly more damage
		const surfaceFactor = Math.max(1.0, 1.0 / Math.max(0.1, shelter.coveragePercent));
		const damage = stormIntensity * delta * surfaceFactor;

		shelter.durability = Math.max(0, shelter.durability - damage);
		const destroyed = shelter.durability === 0;

		reports.push({
			shelterId: id,
			damageTaken: damage,
			remainingDurability: shelter.durability,
			destroyed,
		});

		if (destroyed) {
			shelters.delete(id);
		}
	}

	return reports;
}

/**
 * Get all shelters belonging to a specific faction.
 */
export function getSheltersByFaction(factionId: string): Shelter[] {
	const result: Shelter[] = [];
	for (const shelter of shelters.values()) {
		if (shelter.ownerFaction === factionId) {
			result.push({ ...shelter });
		}
	}
	return result;
}

/**
 * Find the nearest shelter to a position, optionally within a max range.
 * Uses 3D distance for accuracy.
 */
export function getNearestShelter(
	position: { x: number; y: number; z: number },
	maxRange?: number,
): Shelter | null {
	let nearest: Shelter | null = null;
	let nearestDist = maxRange ?? Number.POSITIVE_INFINITY;

	for (const shelter of shelters.values()) {
		const d = dist3D(position, shelter.position);
		if (d < nearestDist) {
			nearestDist = d;
			nearest = shelter;
		}
	}

	return nearest ? { ...nearest } : null;
}

/**
 * Calculate the total sheltered area (in square meters) for a faction.
 * Sum of pi * r^2 for each shelter owned by the faction.
 */
export function getTotalShelterCoverage(factionId: string): number {
	let total = 0;
	for (const shelter of shelters.values()) {
		if (shelter.ownerFaction === factionId) {
			total += Math.PI * shelter.radius * shelter.radius;
		}
	}
	return total;
}

/**
 * Reset all shelter state. For tests and world reset.
 */
export function reset(): void {
	shelters.clear();
}
