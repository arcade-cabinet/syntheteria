/**
 * Cube visibility system — tracks cube pile visibility, size, and value
 * to feed AI raid targeting decisions.
 *
 * Paper playtesting insight: cubes are visible wealth. AI civilizations
 * should be able to SEE cube piles and decide to raid them. This creates
 * emergent gameplay around hiding/protecting cube stockpiles.
 *
 * Pure TypeScript logic — no config dependency, no ECS dependency.
 * Designed for integration with Yuka GOAP governor evaluators.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubePile {
	id: string;
	position: { x: number; y: number; z: number };
	cubeIds: string[];
	totalValue: number;
	materialBreakdown: Record<string, number>;
	height: number;
	isExposed: boolean;
	ownerFaction: string | null;
	lastSeenBy: Map<string, number>;
}

export interface VisiblePile {
	pileId: string;
	position: { x: number; y: number; z: number };
	distance: number;
	estimatedValue: number;
	cubeCount: number;
	primaryMaterial: string;
	isEnemyPile: boolean;
	attractiveness: number;
}

interface DefenseStructure {
	id: string;
	position: { x: number; y: number; z: number };
	radius: number;
}

interface WallSegment {
	position: { x: number; y: number; z: number };
	halfExtents: { x: number; z: number };
}

// ---------------------------------------------------------------------------
// Material values — hardcoded, no config dependency
// ---------------------------------------------------------------------------

const MATERIAL_VALUES: Record<string, number> = {
	scrap_iron: 1,
	copper: 2,
	iron: 3,
	rare_alloy: 8,
	fiber_optics: 5,
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let piles = new Map<string, CubePile>();
let defenses = new Map<string, DefenseStructure>();
let walls: WallSegment[] = [];
let nextPileId = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePileId(position: { x: number; y: number; z: number }): string {
	return `pile_${Math.round(position.x)}_${Math.round(position.y)}_${Math.round(position.z)}_${nextPileId++}`;
}

function dist3d(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}


/**
 * Get the material with the highest count in a breakdown.
 * Returns "unknown" if the breakdown is empty.
 */
function getPrimaryMaterial(breakdown: Record<string, number>): string {
	let best = "unknown";
	let bestCount = 0;
	for (const [mat, count] of Object.entries(breakdown)) {
		if (count > bestCount) {
			best = mat;
			bestCount = count;
		}
	}
	return best;
}

/**
 * Compute total value from per-cube material list and value list.
 */
function computeTotalValue(_materials: string[], values: number[]): number {
	let total = 0;
	for (let i = 0; i < values.length; i++) {
		total += values[i];
	}
	return total;
}

/**
 * Compute material breakdown from a list of material names.
 */
function computeMaterialBreakdown(materials: string[]): Record<string, number> {
	const breakdown: Record<string, number> = {};
	for (const mat of materials) {
		breakdown[mat] = (breakdown[mat] ?? 0) + 1;
	}
	return breakdown;
}

/**
 * Simplified line-of-sight check: returns true if no wall segment
 * blocks the line between observer and target.
 *
 * Uses a simple AABB intersection test against the XZ projection
 * of the line segment.
 */
function hasLineOfSight(
	from: { x: number; y: number; z: number },
	to: { x: number; y: number; z: number },
): boolean {
	for (const wall of walls) {
		if (lineIntersectsAABB(from, to, wall)) {
			return false;
		}
	}
	return true;
}

/**
 * Check if a line segment (from → to) intersects a wall's AABB in XZ plane.
 * Uses parametric ray-AABB intersection (slab method).
 */
function lineIntersectsAABB(
	from: { x: number; y: number; z: number },
	to: { x: number; y: number; z: number },
	wall: WallSegment,
): boolean {
	const minX = wall.position.x - wall.halfExtents.x;
	const maxX = wall.position.x + wall.halfExtents.x;
	const minZ = wall.position.z - wall.halfExtents.z;
	const maxZ = wall.position.z + wall.halfExtents.z;

	const dx = to.x - from.x;
	const dz = to.z - from.z;

	let tMin = 0;
	let tMax = 1;

	// X slab
	if (Math.abs(dx) < 1e-9) {
		if (from.x < minX || from.x > maxX) return false;
	} else {
		let t1 = (minX - from.x) / dx;
		let t2 = (maxX - from.x) / dx;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		tMin = Math.max(tMin, t1);
		tMax = Math.min(tMax, t2);
		if (tMin > tMax) return false;
	}

	// Z slab
	if (Math.abs(dz) < 1e-9) {
		if (from.z < minZ || from.z > maxZ) return false;
	} else {
		let t1 = (minZ - from.z) / dz;
		let t2 = (maxZ - from.z) / dz;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		tMin = Math.max(tMin, t1);
		tMax = Math.min(tMax, t2);
		if (tMin > tMax) return false;
	}

	return true;
}

/**
 * Compute the defense score for a pile based on nearby turrets.
 * Returns a value 0-1 representing defense strength.
 */
function computeDefenseScore(pilePos: { x: number; y: number; z: number }): number {
	let score = 0;
	for (const def of defenses.values()) {
		const d = dist3d(pilePos, def.position);
		if (d <= def.radius) {
			// Closer to the turret = stronger defense
			score += 1 - d / def.radius;
		}
	}
	// Clamp to 0-1
	return Math.min(1, score);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new cube pile at a position.
 *
 * @param position - World position of the pile center
 * @param cubeIds - Array of cube entity IDs in this pile
 * @param materials - Array of material types (parallel with cubeIds)
 * @param values - Array of numeric values (parallel with cubeIds)
 * @returns The generated pile ID
 */
export function registerCubePile(
	position: { x: number; y: number; z: number },
	cubeIds: string[],
	materials: string[],
	values: number[],
): string {
	const id = generatePileId(position);
	const pile: CubePile = {
		id,
		position: { ...position },
		cubeIds: [...cubeIds],
		totalValue: computeTotalValue(materials, values),
		materialBreakdown: computeMaterialBreakdown(materials),
		height: cubeIds.length,
		isExposed: true,
		ownerFaction: null,
		lastSeenBy: new Map(),
	};
	piles.set(id, pile);
	return id;
}

/**
 * Update an existing cube pile with new cube data.
 */
export function updateCubePile(
	pileId: string,
	cubeIds: string[],
	materials: string[],
	values: number[],
): void {
	const pile = piles.get(pileId);
	if (!pile) return;

	pile.cubeIds = [...cubeIds];
	pile.totalValue = computeTotalValue(materials, values);
	pile.materialBreakdown = computeMaterialBreakdown(materials);
	pile.height = cubeIds.length;
}

/**
 * Remove a cube pile from tracking.
 */
export function removeCubePile(pileId: string): void {
	piles.delete(pileId);
}

/**
 * Get all piles visible from an observer position.
 *
 * A pile is visible if:
 * 1. It is within the observer's perception range
 * 2. There is line of sight (no walls between observer and pile center)
 *
 * Updates lastSeenBy for the observer's faction.
 *
 * @param observerPos - Observer's world position
 * @param observerFaction - Observer's faction ID
 * @param perceptionRange - Maximum distance the observer can see
 * @param currentTime - Current game time (for lastSeenBy tracking)
 * @returns Array of visible piles with computed metadata
 */
export function getVisiblePiles(
	observerPos: { x: number; y: number; z: number },
	observerFaction: string,
	perceptionRange: number,
	currentTime: number,
): VisiblePile[] {
	const results: VisiblePile[] = [];

	for (const pile of piles.values()) {
		const distance = dist3d(observerPos, pile.position);

		// Range check
		if (distance > perceptionRange) continue;

		// Line of sight check
		if (!hasLineOfSight(observerPos, pile.position)) continue;

		// Update last seen tracking
		pile.lastSeenBy.set(observerFaction, currentTime);

		// Estimate value — farther away = less accurate
		const accuracyFactor = 1 - distance / perceptionRange;
		const valueNoise = 1 + (1 - accuracyFactor) * 0.3 * (distance > perceptionRange * 0.5 ? 1 : 0);
		const estimatedValue = Math.round(pile.totalValue * valueNoise);

		const isEnemyPile =
			pile.ownerFaction !== null && pile.ownerFaction !== observerFaction;

		const attractiveness = calculatePileAttractiveness(pile, observerFaction, distance);

		results.push({
			pileId: pile.id,
			position: { ...pile.position },
			distance,
			estimatedValue,
			cubeCount: pile.cubeIds.length,
			primaryMaterial: getPrimaryMaterial(pile.materialBreakdown),
			isEnemyPile,
			attractiveness,
		});
	}

	return results;
}

/**
 * Calculate how attractive a pile is for raiding.
 *
 * Formula: (value * 0.4) + (exposure * 0.2) + (proximity * 0.2) + (size * 0.2) - defenseScore
 *
 * @param pile - The cube pile to evaluate
 * @param observerFaction - The faction considering raiding
 * @param distance - Distance from observer to pile (optional, defaults to 0)
 * @returns Attractiveness score clamped to 0-1
 */
export function calculatePileAttractiveness(
	pile: CubePile,
	_observerFaction: string,
	distance = 0,
): number {
	// Value component: normalize by a reference value (e.g., 50 units of wealth)
	const VALUE_REFERENCE = 50;
	const valueScore = Math.min(1, pile.totalValue / VALUE_REFERENCE);

	// Exposure component: exposed piles are more attractive
	const exposureScore = pile.isExposed ? 1 : 0.3;

	// Proximity component: closer = more attractive (inverse distance, max at 100)
	const MAX_DISTANCE = 100;
	const proximityScore = Math.max(0, 1 - distance / MAX_DISTANCE);

	// Size component: bigger piles = higher reward
	const SIZE_REFERENCE = 20;
	const sizeScore = Math.min(1, pile.cubeIds.length / SIZE_REFERENCE);

	// Defense penalty
	const defenseScore = computeDefenseScore(pile.position);

	const raw =
		valueScore * 0.4 +
		exposureScore * 0.2 +
		proximityScore * 0.2 +
		sizeScore * 0.2 -
		defenseScore;

	return Math.max(0, Math.min(1, raw));
}

/**
 * Get the base value for each material type.
 */
export function getMaterialValues(): Record<string, number> {
	return { ...MATERIAL_VALUES };
}

/**
 * Get high-value raid targets above a minimum attractiveness threshold.
 *
 * @param observerFaction - The faction looking for targets
 * @param minAttractiveness - Minimum attractiveness score (0-1)
 * @returns Array of visible piles sorted by attractiveness (descending)
 */
export function getHighValueTargets(
	observerFaction: string,
	minAttractiveness: number,
): VisiblePile[] {
	const results: VisiblePile[] = [];

	for (const pile of piles.values()) {
		// Skip own piles
		if (pile.ownerFaction === observerFaction) continue;

		const attractiveness = calculatePileAttractiveness(pile, observerFaction, 0);

		if (attractiveness >= minAttractiveness) {
			results.push({
				pileId: pile.id,
				position: { ...pile.position },
				distance: 0,
				estimatedValue: pile.totalValue,
				cubeCount: pile.cubeIds.length,
				primaryMaterial: getPrimaryMaterial(pile.materialBreakdown),
				isEnemyPile: pile.ownerFaction !== null && pile.ownerFaction !== observerFaction,
				attractiveness,
			});
		}
	}

	// Sort by attractiveness descending
	results.sort((a, b) => b.attractiveness - a.attractiveness);
	return results;
}

/**
 * Get all piles belonging to a specific faction.
 * Returns copies to prevent external mutation.
 */
export function getPilesByFaction(factionId: string): CubePile[] {
	const results: CubePile[] = [];
	for (const pile of piles.values()) {
		if (pile.ownerFaction === factionId) {
			results.push({
				...pile,
				position: { ...pile.position },
				cubeIds: [...pile.cubeIds],
				materialBreakdown: { ...pile.materialBreakdown },
				lastSeenBy: new Map(pile.lastSeenBy),
			});
		}
	}
	return results;
}

/**
 * Get the total wealth (sum of all pile values) for a faction.
 */
export function getTotalFactionWealth(factionId: string): number {
	let total = 0;
	for (const pile of piles.values()) {
		if (pile.ownerFaction === factionId) {
			total += pile.totalValue;
		}
	}
	return total;
}

/**
 * Register a defense structure (turret, guard tower, etc.)
 * that reduces attractiveness of nearby piles.
 */
export function setDefenseRadius(
	turretId: string,
	position: { x: number; y: number; z: number },
	radius: number,
): void {
	defenses.set(turretId, {
		id: turretId,
		position: { ...position },
		radius,
	});
}

/**
 * Unregister a defense structure.
 */
export function removeDefense(turretId: string): void {
	defenses.delete(turretId);
}

/**
 * Register a wall segment for line-of-sight blocking.
 * Walls are axis-aligned bounding boxes in XZ.
 */
export function addWall(
	position: { x: number; y: number; z: number },
	halfExtents: { x: number; z: number },
): void {
	walls.push({
		position: { ...position },
		halfExtents: { ...halfExtents },
	});
}

/**
 * Clear all walls. Intended for testing and level reloads.
 */
export function clearWalls(): void {
	walls = [];
}

/**
 * Get a pile by ID. Returns a copy or undefined.
 */
export function getPile(pileId: string): CubePile | undefined {
	const pile = piles.get(pileId);
	if (!pile) return undefined;
	return {
		...pile,
		position: { ...pile.position },
		cubeIds: [...pile.cubeIds],
		materialBreakdown: { ...pile.materialBreakdown },
		lastSeenBy: new Map(pile.lastSeenBy),
	};
}

/**
 * Set the owner faction for a pile.
 */
export function setPileOwner(pileId: string, faction: string | null): void {
	const pile = piles.get(pileId);
	if (pile) {
		pile.ownerFaction = faction;
	}
}

/**
 * Set the exposure status for a pile.
 */
export function setPileExposed(pileId: string, exposed: boolean): void {
	const pile = piles.get(pileId);
	if (pile) {
		pile.isExposed = exposed;
	}
}

/**
 * Reset all cube visibility state. Used for tests and new-game initialization.
 */
export function reset(): void {
	piles = new Map();
	defenses = new Map();
	walls = [];
	nextPileId = 1;
}
