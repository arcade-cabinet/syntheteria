/**
 * Noise attraction system — sound propagation that attracts enemies.
 *
 * When the player grinds ore, they are stationary and vulnerable. The
 * grinding NOISE attracts nearby enemies, creating tension between
 * faster harvesting (louder, better drill) and stealth. This forms a
 * core skill ceiling: experienced players harvest during storms (noise
 * masked) or behind walls (noise blocked). Beginners attract enemies
 * by grinding in the open.
 *
 * Noise events are emitted by actions (harvesting, combat, building,
 * compression, movement) and persist for a configurable duration.
 * AI listeners registered in the system are notified when noise
 * exceeds their hearing threshold at their position.
 *
 * Noise falls off with inverse-square distance from the source and
 * is capped at 1.0 when multiple sources combine. A global multiplier
 * allows weather or environmental modifiers (e.g. rain masking noise).
 *
 * Pure logic — no config dependency, no ECS coupling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Vec3 = { x: number; y: number; z: number };

export type NoiseType =
	| "harvesting"
	| "combat"
	| "movement"
	| "building"
	| "compression";

export interface NoiseEvent {
	/** Unique identifier for this noise event */
	id: string;
	/** Entity making the noise */
	sourceId: string;
	/** World position of the noise source */
	position: Vec3;
	/** Noise intensity (0-1) */
	noiseLevel: number;
	/** How far the noise carries in meters */
	noiseRadius: number;
	/** Category of action producing the noise */
	type: NoiseType;
	/** How long the noise persists in seconds */
	duration: number;
	/** Game time when the noise started */
	startTime: number;
}

export interface ListenerInfo {
	entityId: string;
	position: Vec3;
	hearingRange: number;
	faction: string;
}

export interface AttractedEnemy {
	entityId: string;
	distanceToNoise: number;
}

// ---------------------------------------------------------------------------
// Noise presets — keyed by action + tier/variant
// ---------------------------------------------------------------------------

export type NoisePresetKey =
	| "harvesting_basic"
	| "harvesting_improved"
	| "harvesting_advanced"
	| "compression"
	| "combat_melee"
	| "combat_ranged"
	| "building"
	| "movement_normal"
	| "movement_sprint"
	| "furnace_running";

export interface NoisePreset {
	noiseLevel: number;
	noiseRadius: number;
	duration: number;
}

export const NOISE_PRESETS: Record<NoisePresetKey, NoisePreset> = {
	harvesting_basic: { noiseLevel: 0.3, noiseRadius: 15, duration: 1.0 },
	harvesting_improved: { noiseLevel: 0.5, noiseRadius: 25, duration: 1.0 },
	harvesting_advanced: { noiseLevel: 0.7, noiseRadius: 40, duration: 1.0 },
	compression: { noiseLevel: 0.8, noiseRadius: 30, duration: 0.5 },
	combat_melee: { noiseLevel: 0.4, noiseRadius: 20, duration: 0.3 },
	combat_ranged: { noiseLevel: 0.6, noiseRadius: 50, duration: 0.2 },
	building: { noiseLevel: 0.2, noiseRadius: 10, duration: 1.0 },
	movement_normal: { noiseLevel: 0.05, noiseRadius: 5, duration: 0.1 },
	movement_sprint: { noiseLevel: 0.15, noiseRadius: 10, duration: 0.1 },
	furnace_running: { noiseLevel: 0.3, noiseRadius: 20, duration: 1.0 },
};

// ---------------------------------------------------------------------------
// Tool tier to preset key mapping
// ---------------------------------------------------------------------------

const HARVESTING_TIER_MAP: Record<number, NoisePresetKey> = {
	0: "harvesting_basic",
	1: "harvesting_basic",
	2: "harvesting_improved",
	3: "harvesting_advanced",
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let nextNoiseId = 0;

/** All active noise events, keyed by noise ID. */
const activeNoises = new Map<string, NoiseEvent>();

/** Registered AI listeners that respond to noise. */
const listeners = new Map<string, ListenerInfo>();

/** Global noise multiplier (weather, environment). 1.0 = normal. */
let noiseMultiplier = 1.0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distance3d(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Resolve a noise type + tool tier into a preset key.
 *
 * For harvesting, the tier selects basic/improved/advanced.
 * For combat, tier 0 = melee, tier >= 1 = ranged.
 * For movement, tier 0 = normal, tier >= 1 = sprint.
 * For everything else, the type name is the key.
 */
function resolvePresetKey(type: NoiseType, toolTier: number): NoisePresetKey {
	switch (type) {
		case "harvesting":
			return HARVESTING_TIER_MAP[toolTier] ?? "harvesting_advanced";
		case "combat":
			return toolTier >= 1 ? "combat_ranged" : "combat_melee";
		case "movement":
			return toolTier >= 1 ? "movement_sprint" : "movement_normal";
		case "building":
			return "building";
		case "compression":
			return "compression";
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit a noise event from an action.
 *
 * Looks up the noise preset based on type + tool tier, applies the
 * global noise multiplier, and stores the event. Returns the noise
 * event ID.
 *
 * @param sourceId - Entity producing the noise
 * @param position - World position of the noise source
 * @param type - Category of action
 * @param toolTier - Tool quality tier (0 = basic, 1-3 = upgrades)
 * @param currentTime - Current game time in seconds
 * @returns Noise event ID
 */
export function emitNoise(
	sourceId: string,
	position: Vec3,
	type: NoiseType,
	toolTier: number,
	currentTime: number,
): string {
	const presetKey = resolvePresetKey(type, toolTier);
	const preset = NOISE_PRESETS[presetKey];

	const id = `noise_${nextNoiseId++}`;

	const event: NoiseEvent = {
		id,
		sourceId,
		position: { ...position },
		noiseLevel: Math.min(1.0, preset.noiseLevel * noiseMultiplier),
		noiseRadius: preset.noiseRadius * noiseMultiplier,
		type,
		duration: preset.duration,
		startTime: currentTime,
	};

	activeNoises.set(id, event);
	return id;
}

/**
 * Emit a noise event from a specific preset key, bypassing tier
 * resolution. Useful for furnaces, specific movement modes, etc.
 *
 * @param sourceId - Entity producing the noise
 * @param position - World position of the noise source
 * @param presetKey - Explicit preset key
 * @param currentTime - Current game time in seconds
 * @returns Noise event ID
 */
export function emitNoiseFromPreset(
	sourceId: string,
	position: Vec3,
	presetKey: NoisePresetKey,
	currentTime: number,
): string {
	const preset = NOISE_PRESETS[presetKey];
	const type: NoiseType = presetKey.startsWith("harvesting")
		? "harvesting"
		: presetKey.startsWith("combat")
			? "combat"
			: presetKey.startsWith("movement")
				? "movement"
				: presetKey === "compression"
					? "compression"
					: "building";

	const id = `noise_${nextNoiseId++}`;

	const event: NoiseEvent = {
		id,
		sourceId,
		position: { ...position },
		noiseLevel: Math.min(1.0, preset.noiseLevel * noiseMultiplier),
		noiseRadius: preset.noiseRadius * noiseMultiplier,
		type,
		duration: preset.duration,
		startTime: currentTime,
	};

	activeNoises.set(id, event);
	return id;
}

/**
 * Remove expired noise events.
 *
 * @param currentTime - Current game time in seconds
 * @returns Number of events pruned
 */
export function updateNoiseEvents(currentTime: number): number {
	let pruned = 0;
	for (const [id, event] of activeNoises) {
		if (currentTime >= event.startTime + event.duration) {
			activeNoises.delete(id);
			pruned++;
		}
	}
	return pruned;
}

/**
 * Get all currently active noise events.
 */
export function getActiveNoiseEvents(): NoiseEvent[] {
	return Array.from(activeNoises.values());
}

/**
 * Calculate the combined noise level perceived at a position.
 *
 * Multiple noise sources add together (capped at 1.0). Each source's
 * contribution falls off with inverse-square distance: the noise level
 * at distance d from a source with radius r is:
 *
 *   contribution = noiseLevel * (1 - (d / r)²)
 *
 * ...clamped to 0 if d > r. This gives full intensity at the source
 * and zero at the radius boundary, with a smooth falloff curve.
 *
 * @param position - World position to sample
 * @param currentTime - Current game time (for filtering expired events)
 * @returns Combined noise level (0-1)
 */
export function getNoiseAtPosition(position: Vec3, currentTime: number): number {
	let combined = 0;

	for (const event of activeNoises.values()) {
		// Skip expired events
		if (currentTime >= event.startTime + event.duration) {
			continue;
		}

		const dist = distance3d(position, event.position);

		// Outside noise radius — no contribution
		if (dist >= event.noiseRadius) {
			continue;
		}

		// Inverse-square falloff within radius
		const ratio = dist / event.noiseRadius;
		const contribution = event.noiseLevel * (1 - ratio * ratio);
		combined += contribution;
	}

	return Math.min(1.0, combined);
}

// ---------------------------------------------------------------------------
// Listener registry — AI entities that respond to noise
// ---------------------------------------------------------------------------

/**
 * Register an AI entity as a potential noise responder.
 *
 * @param entityId - Unique entity ID
 * @param position - Entity's current world position
 * @param hearingRange - Maximum distance at which the entity can hear noise
 * @param faction - Entity's faction (used for filtering friendly noise)
 */
export function registerListener(
	entityId: string,
	position: Vec3,
	hearingRange: number,
	faction: string,
): void {
	listeners.set(entityId, {
		entityId,
		position: { ...position },
		hearingRange,
		faction,
	});
}

/**
 * Remove a listener from the registry.
 */
export function unregisterListener(entityId: string): void {
	listeners.delete(entityId);
}

/**
 * Update a listener's position (e.g. after movement).
 */
export function updateListenerPosition(
	entityId: string,
	position: Vec3,
): void {
	const listener = listeners.get(entityId);
	if (listener) {
		listener.position = { ...position };
	}
}

/**
 * Get all registered listeners within range of a noise source.
 *
 * A listener is "in range" if the distance between the noise position
 * and the listener is less than or equal to the smaller of:
 *   - the noise's radius
 *   - the listener's hearing range
 *
 * @param noisePos - Noise source position
 * @param noiseRadius - Noise propagation radius
 * @returns Array of listeners that can hear the noise
 */
export function getListenersInRange(
	noisePos: Vec3,
	noiseRadius: number,
): ListenerInfo[] {
	const results: ListenerInfo[] = [];

	for (const listener of listeners.values()) {
		const dist = distance3d(noisePos, listener.position);
		const effectiveRange = Math.min(noiseRadius, listener.hearingRange);
		if (dist <= effectiveRange) {
			results.push({ ...listener });
		}
	}

	return results;
}

/**
 * Get enemies that would be attracted to noise above a threshold
 * within a given radius of a position.
 *
 * Checks all registered listeners. A listener is "attracted" if:
 *   1. It is within the search radius
 *   2. The combined noise level at its position exceeds the threshold
 *
 * @param position - Center of the search area
 * @param radius - Search radius in meters
 * @param noiseThreshold - Minimum noise level to trigger attraction (0-1)
 * @returns Array of attracted enemies with their distance to the position
 */
export function getAttractedEnemies(
	position: Vec3,
	radius: number,
	noiseThreshold: number,
): AttractedEnemy[] {
	const results: AttractedEnemy[] = [];
	const currentTime = _getCurrentTimeForQuery();

	for (const listener of listeners.values()) {
		const dist = distance3d(position, listener.position);
		if (dist > radius) continue;

		const noiseAtListener = getNoiseAtPosition(listener.position, currentTime);
		if (noiseAtListener >= noiseThreshold) {
			results.push({
				entityId: listener.entityId,
				distanceToNoise: dist,
			});
		}
	}

	results.sort((a, b) => a.distanceToNoise - b.distanceToNoise);
	return results;
}

// ---------------------------------------------------------------------------
// Global noise multiplier
// ---------------------------------------------------------------------------

/**
 * Set the global noise multiplier. Affects all future emitNoise calls.
 * Values < 1.0 reduce noise (e.g. rain masking). Values > 1.0 amplify.
 * Clamped to >= 0.
 */
export function setNoiseMultiplier(mult: number): void {
	noiseMultiplier = Math.max(0, mult);
}

/**
 * Get the current global noise multiplier.
 */
export function getNoiseMultiplier(): number {
	return noiseMultiplier;
}

// ---------------------------------------------------------------------------
// Query time — used by getAttractedEnemies to pass currentTime
// ---------------------------------------------------------------------------

let _queryTime = 0;

/**
 * Set the time used by getAttractedEnemies for noise calculations.
 * Call this each frame before querying attracted enemies.
 */
export function setCurrentTime(time: number): void {
	_queryTime = time;
}

function _getCurrentTimeForQuery(): number {
	return _queryTime;
}

// ---------------------------------------------------------------------------
// Reset — for testing
// ---------------------------------------------------------------------------

/**
 * Clear all noise attraction state. For testing.
 */
export function reset(): void {
	activeNoises.clear();
	listeners.clear();
	noiseMultiplier = 1.0;
	nextNoiseId = 0;
	_queryTime = 0;
}
