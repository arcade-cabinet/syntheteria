/**
 * OreDeposit Entity Spawner — creates ore deposit entities with physics bodies.
 *
 * Reads ore types from config/mining.json. Each deposit has a type (matching
 * a key in mining.json oreTypes), a quantity (how much ore remains), a 3D
 * position, and a collider radius for Rapier physics.
 *
 * Rapier body creation is injected via an optional callback so the spawner
 * stays pure and testable without WASM.
 */

import miningConfig from "../../config/mining.json";
import biomesConfig from "../../config/biomes.json";

// ---------------------------------------------------------------------------
// Ore type definitions — sourced from config/mining.json oreTypes
// ---------------------------------------------------------------------------

/** Ore type configuration from mining.json */
export interface OreTypeConfig {
	hardness: number;
	grindSpeed: number;
	color: string;
}

/** Valid ore type names — sourced from mining.json */
export const VALID_ORE_TYPES: ReadonlyArray<string> = Object.keys(
	miningConfig.oreTypes,
);

/** Ore type configs sourced from config/mining.json */
export const ORE_TYPE_CONFIGS: Record<string, OreTypeConfig> =
	miningConfig.oreTypes as Record<string, OreTypeConfig>;

// ---------------------------------------------------------------------------
// OreDeposit data type
// ---------------------------------------------------------------------------

export interface OreDepositData {
	/** Unique identifier for this deposit entity */
	id: string;
	/** Ore type — must be a key in VALID_ORE_TYPES */
	type: string;
	/** Remaining quantity of ore in this deposit */
	quantity: number;
	/** World position */
	position: { x: number; y: number; z: number };
	/** Radius of the sphere collider for Rapier physics */
	colliderRadius: number;
	/** Hardness from ore type config */
	hardness: number;
	/** Grind speed from ore type config */
	grindSpeed: number;
	/** Color from ore type config */
	color: string;
}

// ---------------------------------------------------------------------------
// Module state — deposit registry
// ---------------------------------------------------------------------------

let nextDepositId = 0;
const deposits = new Map<string, OreDepositData>();

/** Get all spawned deposits. */
export function getAllDeposits(): OreDepositData[] {
	return Array.from(deposits.values());
}

/** Get a deposit by ID. */
export function getDeposit(id: string): OreDepositData | undefined {
	return deposits.get(id);
}

/** Reset all deposits — for testing. */
export function resetDeposits(): void {
	deposits.clear();
	nextDepositId = 0;
}

// ---------------------------------------------------------------------------
// Spawn functions
// ---------------------------------------------------------------------------

/** Callback for creating a Rapier static body with sphere collider. */
export type CreatePhysicsBody = (
	position: { x: number; y: number; z: number },
	radius: number,
) => void;

/**
 * Spawn a single ore deposit entity.
 *
 * @param config - deposit configuration
 * @param config.type - ore type (must match a key in VALID_ORE_TYPES)
 * @param config.quantity - amount of ore in this deposit
 * @param config.position - world position { x, y, z }
 * @param config.colliderRadius - sphere collider radius (default: 1.0)
 * @param createPhysicsBody - optional callback for Rapier body creation
 * @param oreTypes - optional ore type registry (defaults to VALID_ORE_TYPES)
 * @returns the created OreDepositData
 * @throws Error if ore type is not in the valid ore types list
 */
export function spawnOreDeposit(
	config: {
		type: string;
		quantity: number;
		position: { x: number; y: number; z: number };
		colliderRadius?: number;
	},
	createPhysicsBody?: CreatePhysicsBody,
	oreTypes: ReadonlyArray<string> = VALID_ORE_TYPES,
): OreDepositData {
	// Validate ore type
	if (!oreTypes.includes(config.type)) {
		throw new Error(
			`Invalid ore type "${config.type}". Valid types: ${oreTypes.join(", ")}`,
		);
	}

	const oreConfig = ORE_TYPE_CONFIGS[config.type];
	const colliderRadius = config.colliderRadius ?? 1.0;
	const id = `ore_deposit_${nextDepositId++}`;

	const deposit: OreDepositData = {
		id,
		type: config.type,
		quantity: config.quantity,
		position: { ...config.position },
		colliderRadius,
		hardness: oreConfig?.hardness ?? 1,
		grindSpeed: oreConfig?.grindSpeed ?? 1.0,
		color: oreConfig?.color ?? "#808080",
	};

	// Register in module store
	deposits.set(id, deposit);

	// Create Rapier static body if callback provided
	if (createPhysicsBody) {
		createPhysicsBody(deposit.position, colliderRadius);
	}

	return deposit;
}

// ---------------------------------------------------------------------------
// Biome-weighted ore type selection
// ---------------------------------------------------------------------------

/**
 * Build a weighted ore type table for a named biome.
 *
 * biomes.json resourceMultipliers are used as relative weights.
 * Ore types in VALID_ORE_TYPES that are absent from the biome's
 * resourceMultipliers receive a weight of 1.0 (baseline).
 *
 * @param biomeName - biome key from biomes.json (e.g. "rust_plains")
 * @param oreTypes  - ore types to consider (defaults to VALID_ORE_TYPES)
 * @returns array of { type, weight } entries with total weight > 0
 */
export function buildBiomeOreWeights(
	biomeName: string,
	oreTypes: ReadonlyArray<string> = VALID_ORE_TYPES,
): Array<{ type: string; weight: number }> {
	const biomes = biomesConfig.biomes as Record<
		string,
		{ resourceMultipliers?: Record<string, number> }
	>;
	const multipliers = biomes[biomeName]?.resourceMultipliers ?? {};

	return oreTypes.map((type) => ({
		type,
		weight: multipliers[type] ?? 1.0,
	}));
}

/**
 * Pick a random ore type from a weighted table.
 *
 * @param weights - array from buildBiomeOreWeights
 * @param rng     - random function returning [0, 1)
 * @returns ore type string
 */
export function pickWeightedOreType(
	weights: Array<{ type: string; weight: number }>,
	rng: () => number,
): string {
	const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
	let roll = rng() * totalWeight;
	for (const entry of weights) {
		roll -= entry.weight;
		if (roll <= 0) {
			return entry.type;
		}
	}
	// Fallback — floating-point rounding safety
	return weights[weights.length - 1].type;
}

/**
 * Spawn multiple ore deposits at random valid positions within a world area,
 * selecting ore types according to the biome's resource multipliers.
 *
 * Ore types favoured by the biome (higher resourceMultiplier in biomes.json)
 * appear proportionally more often. Types absent from biome multipliers have
 * weight 1.0 (baseline).
 *
 * @param biomeName - biome key (e.g. "rust_plains") used to weight ore selection
 * @param count     - number of deposits to spawn
 * @param worldSize - width/depth of the square world area
 * @param options   - same options as spawnInitialDeposits
 * @returns array of spawned OreDepositData
 */
export function spawnInitialDepositsInBiome(
	biomeName: string,
	count: number,
	worldSize: number,
	options: {
		minDistance?: number;
		defaultQuantity?: number;
		defaultColliderRadius?: number;
		createPhysicsBody?: CreatePhysicsBody;
		oreTypes?: ReadonlyArray<string>;
		rng?: () => number;
	} = {},
): OreDepositData[] {
	const {
		minDistance = 5,
		defaultQuantity = 100,
		defaultColliderRadius = 1.0,
		createPhysicsBody,
		oreTypes = VALID_ORE_TYPES,
		rng = Math.random,
	} = options;

	const weights = buildBiomeOreWeights(biomeName, oreTypes);
	const half = worldSize / 2;
	const spawned: OreDepositData[] = [];
	const maxAttempts = count * 10;
	let attempts = 0;

	while (spawned.length < count && attempts < maxAttempts) {
		attempts++;

		const x = rng() * worldSize - half;
		const z = rng() * worldSize - half;

		const tooClose = spawned.some((d) => {
			const dx = d.position.x - x;
			const dz = d.position.z - z;
			return Math.sqrt(dx * dx + dz * dz) < minDistance;
		});

		if (tooClose) continue;

		const oreType = pickWeightedOreType(weights, rng);

		const deposit = spawnOreDeposit(
			{
				type: oreType,
				quantity: defaultQuantity,
				position: { x, y: 0, z },
				colliderRadius: defaultColliderRadius,
			},
			createPhysicsBody,
			oreTypes,
		);

		spawned.push(deposit);
	}

	return spawned;
}

/**
 * Spawn multiple ore deposits at random valid positions within a world area.
 *
 * Deposits are placed at random (x, z) within [-worldSize/2, worldSize/2],
 * with y = 0 (ground level). A minimum distance between deposits is enforced.
 *
 * @param count - number of deposits to spawn
 * @param worldSize - width/depth of the square world area
 * @param options - optional overrides
 * @param options.minDistance - minimum distance between deposits (default: 5)
 * @param options.defaultQuantity - default ore quantity per deposit (default: 100)
 * @param options.defaultColliderRadius - default collider radius (default: 1.0)
 * @param options.createPhysicsBody - optional Rapier body creation callback
 * @param options.oreTypes - optional ore type list override
 * @param options.rng - optional random function (default: Math.random) for seeded placement
 * @returns array of spawned OreDepositData
 */
export function spawnInitialDeposits(
	count: number,
	worldSize: number,
	options: {
		minDistance?: number;
		defaultQuantity?: number;
		defaultColliderRadius?: number;
		createPhysicsBody?: CreatePhysicsBody;
		oreTypes?: ReadonlyArray<string>;
		rng?: () => number;
	} = {},
): OreDepositData[] {
	const {
		minDistance = 5,
		defaultQuantity = 100,
		defaultColliderRadius = 1.0,
		createPhysicsBody,
		oreTypes = VALID_ORE_TYPES,
		rng = Math.random,
	} = options;

	const half = worldSize / 2;
	const spawned: OreDepositData[] = [];
	const maxAttempts = count * 10; // prevent infinite loops
	let attempts = 0;

	while (spawned.length < count && attempts < maxAttempts) {
		attempts++;

		const x = rng() * worldSize - half;
		const z = rng() * worldSize - half;

		// Check minimum distance from all existing deposits
		const tooClose = spawned.some((d) => {
			const dx = d.position.x - x;
			const dz = d.position.z - z;
			return Math.sqrt(dx * dx + dz * dz) < minDistance;
		});

		if (tooClose) continue;

		// Pick a random ore type
		const typeIndex = Math.floor(rng() * oreTypes.length);
		const oreType = oreTypes[typeIndex];

		const deposit = spawnOreDeposit(
			{
				type: oreType,
				quantity: defaultQuantity,
				position: { x, y: 0, z },
				colliderRadius: defaultColliderRadius,
			},
			createPhysicsBody,
			oreTypes,
		);

		spawned.push(deposit);
	}

	return spawned;
}
