/**
 * Weather-structure damage bridge — connects storm damage to cube structures.
 *
 * Storms damage exposed cube piles. Shelters protect cubes. But storm damage
 * needs to feed into the structural collapse system so that damaged support
 * blocks trigger cascade failures.
 *
 * This bridge runs each weather tick and:
 * 1. Checks current weather conditions
 * 2. Identifies exposed structures (not sheltered)
 * 3. Applies weather damage to structural blocks
 * 4. Returns collapse events for the physics/rendering layer
 *
 * Integration points:
 *   - weatherEffects: getWeatherGameplayModifiers() for damage values
 *   - shelterSystem: isPositionSheltered() for protection checks
 *   - cubePileTracker: getPiles() for exposed cube locations
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A structural block registered for weather damage processing. */
export interface WeatherBlock {
	blockId: string;
	position: Vec3;
	materialType: string;
	currentHP: number;
	maxHP: number;
}

/** Result of weather damage on a single block. */
export interface WeatherDamageEvent {
	blockId: string;
	damageTaken: number;
	remainingHP: number;
	destroyed: boolean;
	wasExposed: boolean;
	materialType: string;
}

/** Summary of a weather damage tick. */
export interface WeatherDamageTickResult {
	totalBlocksProcessed: number;
	exposedBlocks: number;
	shelteredBlocks: number;
	totalDamage: number;
	destroyedBlocks: string[];
	events: WeatherDamageEvent[];
}

/** Weather condition input. */
export interface WeatherCondition {
	type: string;
	cubeDamagePerSecond: number;
	intensity: number;
}

/** Shelter check delegate. */
export type ShelterCheckFn = (position: Vec3) => {
	sheltered: boolean;
	weatherDamageReduction: number;
};

// ---------------------------------------------------------------------------
// Material weather resistance (0-1, higher = more resistant)
// ---------------------------------------------------------------------------

const MATERIAL_WEATHER_RESISTANCE: Record<string, number> = {
	scrap_iron: 0.3,
	iron: 0.6,
	copper: 0.5,
	e_waste: 0.1,
	fiber_optics: 0.2,
	rare_alloy: 0.9,
};

const DEFAULT_RESISTANCE = 0.3;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const blocks = new Map<string, WeatherBlock>();
let shelterCheck: ShelterCheckFn = () => ({ sheltered: false, weatherDamageReduction: 0 });
let totalDamageApplied = 0;
let totalBlocksDestroyed = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a structural block for weather damage tracking.
 */
export function registerBlock(block: WeatherBlock): void {
	blocks.set(block.blockId, { ...block, position: { ...block.position } });
}

/**
 * Remove a block from tracking (e.g., manually demolished).
 */
export function unregisterBlock(blockId: string): void {
	blocks.delete(blockId);
}

/**
 * Update a block's HP (e.g., after repair).
 */
export function updateBlockHP(blockId: string, hp: number): void {
	const block = blocks.get(blockId);
	if (block) {
		block.currentHP = Math.min(hp, block.maxHP);
	}
}

/**
 * Set the shelter check function.
 * Called with a block's position; returns whether it's sheltered and by how much.
 */
export function setShelterCheck(fn: ShelterCheckFn): void {
	shelterCheck = fn;
}

/**
 * Process one tick of weather damage on all registered blocks.
 *
 * For each block:
 * 1. Check if position is sheltered
 * 2. If not sheltered (or partially), apply weather damage
 * 3. Damage = cubeDamagePerSecond * intensity * delta * (1 - weatherResistance) * (1 - shelterReduction)
 * 4. If HP drops to 0, mark as destroyed
 *
 * @param weather - Current weather conditions
 * @param delta - Time step in seconds
 * @returns Tick result with all damage events
 */
export function processWeatherDamage(
	weather: WeatherCondition,
	delta: number,
): WeatherDamageTickResult {
	const events: WeatherDamageEvent[] = [];
	let exposedCount = 0;
	let shelteredCount = 0;
	let tickDamage = 0;
	const destroyed: string[] = [];

	for (const [blockId, block] of blocks) {
		const shelterStatus = shelterCheck(block.position);

		if (shelterStatus.sheltered && shelterStatus.weatherDamageReduction >= 1.0) {
			// Fully sheltered — no damage
			shelteredCount++;
			events.push({
				blockId,
				damageTaken: 0,
				remainingHP: block.currentHP,
				destroyed: false,
				wasExposed: false,
				materialType: block.materialType,
			});
			continue;
		}

		exposedCount++;
		const resistance = MATERIAL_WEATHER_RESISTANCE[block.materialType] ?? DEFAULT_RESISTANCE;
		const shelterReduction = shelterStatus.weatherDamageReduction;

		const rawDamage = weather.cubeDamagePerSecond * weather.intensity * delta;
		const mitigatedDamage = rawDamage * (1 - resistance) * (1 - shelterReduction);
		const finalDamage = Math.max(0, Math.round(mitigatedDamage * 100) / 100);

		block.currentHP = Math.max(0, block.currentHP - finalDamage);
		tickDamage += finalDamage;

		const isDestroyed = block.currentHP <= 0;
		if (isDestroyed) {
			destroyed.push(blockId);
		}

		events.push({
			blockId,
			damageTaken: finalDamage,
			remainingHP: block.currentHP,
			destroyed: isDestroyed,
			wasExposed: true,
			materialType: block.materialType,
		});
	}

	// Remove destroyed blocks
	for (const id of destroyed) {
		blocks.delete(id);
	}

	totalDamageApplied += tickDamage;
	totalBlocksDestroyed += destroyed.length;

	return {
		totalBlocksProcessed: events.length,
		exposedBlocks: exposedCount,
		shelteredBlocks: shelteredCount,
		totalDamage: tickDamage,
		destroyedBlocks: destroyed,
		events,
	};
}

/**
 * Get a block's current state.
 */
export function getBlock(blockId: string): WeatherBlock | null {
	const block = blocks.get(blockId);
	return block ? { ...block } : null;
}

/**
 * Get all tracked blocks.
 */
export function getAllBlocks(): WeatherBlock[] {
	return Array.from(blocks.values()).map((b) => ({ ...b }));
}

/**
 * Get cumulative stats.
 */
export function getStats(): { totalDamageApplied: number; totalBlocksDestroyed: number } {
	return { totalDamageApplied, totalBlocksDestroyed };
}

/**
 * Reset all state. For testing.
 */
export function reset(): void {
	blocks.clear();
	shelterCheck = () => ({ sheltered: false, weatherDamageReduction: 0 });
	totalDamageApplied = 0;
	totalBlocksDestroyed = 0;
}
