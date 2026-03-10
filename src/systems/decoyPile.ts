/**
 * Decoy pile system — fake visual cube piles that fool enemy AI perception.
 *
 * In Syntheteria, cube piles are visible wealth and AI raiders target them.
 * Decoy piles create convincing visual fakes that lure raiders away from
 * real stockpiles. They look identical to AI perception systems but contain
 * no economic value.
 *
 * Key mechanics:
 * - Decoys are fragile (50 HP max vs 100+ for real cube walls)
 * - Effectiveness degrades per-faction as AI inspects and discovers the ruse
 * - Each inspection drops effectiveness by 0.2 for that faction
 * - Once effectiveness hits 0 for a faction, that faction ignores the decoy
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface DecoyPile {
	id: string;
	position: Vec3;
	materialType: string;
	visualCount: number;
	ownerFaction: string;
	durability: number;
	createdAt: number;
	/** Per-faction effectiveness: 1.0 = fully convincing, 0.0 = seen through. */
	factionEffectiveness: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DURABILITY = 50;
const DEFAULT_EFFECTIVENESS = 1.0;
const EFFECTIVENESS_DROP_PER_INSPECTION = 0.2;
const MIN_EFFECTIVENESS = 0;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let decoys = new Map<string, DecoyPile>();
let nextId = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
	return `decoy_${nextId++}`;
}

function distanceSq(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return dx * dx + dy * dy + dz * dz;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a decoy pile at the given position.
 *
 * @param position     - World position for the decoy
 * @param materialType - Visual material type (what it looks like to AI)
 * @param visualCount  - Number of fake cubes to render
 * @param ownerFaction - Faction that placed the decoy
 * @returns The created decoy pile's ID
 */
export function createDecoyPile(
	position: Vec3,
	materialType: string,
	visualCount: number,
	ownerFaction: string,
): string {
	const id = generateId();
	const decoy: DecoyPile = {
		id,
		position: { ...position },
		materialType,
		visualCount: Math.max(1, Math.floor(visualCount)),
		ownerFaction,
		durability: MAX_DURABILITY,
		createdAt: Date.now(),
		factionEffectiveness: new Map(),
	};
	decoys.set(id, decoy);
	return id;
}

/**
 * Remove a decoy pile by ID.
 *
 * @returns true if the decoy existed and was removed, false otherwise
 */
export function removeDecoyPile(id: string): boolean {
	return decoys.delete(id);
}

/**
 * Get all decoy piles.
 */
export function getDecoyPiles(): DecoyPile[] {
	return Array.from(decoys.values());
}

/**
 * Get decoy piles belonging to a specific faction.
 */
export function getDecoyPilesByFaction(faction: string): DecoyPile[] {
	return Array.from(decoys.values()).filter(
		(d) => d.ownerFaction === faction,
	);
}

/**
 * Check if a given pile ID is a decoy.
 *
 * This is used internally — AI systems should NOT call this, as the
 * whole point is that AI doesn't know which piles are fake.
 */
export function isDecoy(pileId: string): boolean {
	return decoys.has(pileId);
}

/**
 * Find the nearest decoy pile within a given radius of a position.
 *
 * @returns The nearest decoy within radius, or null if none found
 */
export function getDecoyAtPosition(
	position: Vec3,
	radius: number,
): DecoyPile | null {
	const radiusSq = radius * radius;
	let nearest: DecoyPile | null = null;
	let nearestDistSq = Infinity;

	for (const decoy of decoys.values()) {
		const dSq = distanceSq(decoy.position, position);
		if (dSq <= radiusSq && dSq < nearestDistSq) {
			nearest = decoy;
			nearestDistSq = dSq;
		}
	}

	return nearest;
}

/**
 * Apply damage to a decoy pile. If durability reaches 0, the decoy is
 * destroyed and removed.
 *
 * @param id     - Decoy pile ID
 * @param damage - Amount of damage to apply (positive number)
 * @returns The remaining durability, or -1 if the decoy doesn't exist.
 *          Returns 0 if the decoy was destroyed by this damage.
 */
export function updateDecoyDurability(id: string, damage: number): number {
	const decoy = decoys.get(id);
	if (!decoy) return -1;

	decoy.durability = Math.max(0, decoy.durability - Math.abs(damage));

	if (decoy.durability <= 0) {
		decoys.delete(id);
		return 0;
	}

	return decoy.durability;
}

/**
 * Get the effectiveness of a decoy against a specific faction.
 *
 * Effectiveness is 0-1 where 1.0 means fully convincing and 0.0 means
 * the faction has seen through the ruse. If no faction is specified,
 * returns the average effectiveness across all factions that have
 * inspected it, or 1.0 if no faction has inspected yet.
 *
 * @param id        - Decoy pile ID
 * @param factionId - Optional faction to check against
 * @returns Effectiveness 0-1, or -1 if the decoy doesn't exist
 */
export function getDecoyEffectiveness(
	id: string,
	factionId?: string,
): number {
	const decoy = decoys.get(id);
	if (!decoy) return -1;

	if (factionId !== undefined) {
		return decoy.factionEffectiveness.get(factionId) ?? DEFAULT_EFFECTIVENESS;
	}

	// Average across all inspecting factions
	if (decoy.factionEffectiveness.size === 0) {
		return DEFAULT_EFFECTIVENESS;
	}

	let sum = 0;
	for (const eff of decoy.factionEffectiveness.values()) {
		sum += eff;
	}
	return sum / decoy.factionEffectiveness.size;
}

/**
 * Record that an AI faction has inspected a decoy pile.
 *
 * Each inspection drops that faction's effectiveness by 0.2 (clamped to 0).
 * This represents the AI "learning" that the pile is fake.
 *
 * @param pileId    - Decoy pile ID
 * @param factionId - The faction that inspected the decoy
 * @returns The new effectiveness for that faction, or -1 if decoy doesn't exist
 */
export function recordAIInspection(
	pileId: string,
	factionId: string,
): number {
	const decoy = decoys.get(pileId);
	if (!decoy) return -1;

	const current =
		decoy.factionEffectiveness.get(factionId) ?? DEFAULT_EFFECTIVENESS;
	const raw = current - EFFECTIVENESS_DROP_PER_INSPECTION;
	// Round to 10 decimal places to avoid floating-point drift (0.2 steps)
	const updated = Math.max(MIN_EFFECTIVENESS, Math.round(raw * 1e10) / 1e10);
	decoy.factionEffectiveness.set(factionId, updated);

	return updated;
}

/**
 * Clear all decoy state. For testing and new-game initialization.
 */
export function reset(): void {
	decoys = new Map();
	nextId = 1;
}
