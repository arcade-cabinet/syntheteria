/**
 * Deposit render data system — bridges ore deposit entities to rendering.
 *
 * The oreSpawner manages deposit creation and game-logic state. This module
 * maintains a parallel registry of per-deposit render parameters so the
 * renderer can produce organic geological formations with the correct
 * procedural noise, PBR colour, depletion visuals, fog-of-war visibility,
 * and targeting indicators — all without importing Three.js or config files.
 *
 * Module-level Map state with `reset()` for test isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** Procedural-generation parameters for a single ore type. */
export interface OreRenderParams {
	/** Base hex colour string, e.g. "#8B7355". */
	color: string;
	/** Uniform scale multiplier for the deposit mesh. */
	baseScale: number;
	/** Max random height offset applied to noise peaks. */
	heightVariation: number;
	/** PBR roughness, 0-1. */
	roughness: number;
	/** Emissive glow intensity, 0-1. */
	emissiveIntensity: number;
	/** Frequency fed into the noise function that shapes the deposit. */
	noiseFrequency: number;
}

/** Full render info exposed to the renderer via collectDepositRenderData(). */
export interface DepositRenderInfo {
	depositId: string;
	position: Vec3;
	oreType: string;
	/** 0 = full, 1 = completely depleted. */
	depletionPercent: number;
	/** Whether the player has discovered this deposit (fog of war). */
	discovered: boolean;
	/** Entity ID currently mining this deposit, or null. */
	targeted: string | null;
	/** Procedural generation parameters (adjusted for depletion). */
	renderParams: OreRenderParams & {
		/** Per-deposit noise seed for deterministic shape. */
		noiseSeed: number;
	};
}

// ---------------------------------------------------------------------------
// Internal record stored per deposit
// ---------------------------------------------------------------------------

interface DepositRecord {
	depositId: string;
	position: Vec3;
	oreType: string;
	currentQuantity: number;
	maxQuantity: number;
	discovered: boolean;
	targetedBy: string | null;
	noiseSeed: number;
}

// ---------------------------------------------------------------------------
// Ore type render param table — hardcoded, no config imports
// ---------------------------------------------------------------------------

const ORE_RENDER_PARAMS: Record<string, OreRenderParams> = {
	scrap_iron: {
		color: "#8B7355",
		baseScale: 1.2,
		heightVariation: 0.4,
		roughness: 0.8,
		emissiveIntensity: 0,
		noiseFrequency: 3.0,
	},
	iron: {
		color: "#696969",
		baseScale: 1.5,
		heightVariation: 0.6,
		roughness: 0.5,
		emissiveIntensity: 0,
		noiseFrequency: 2.5,
	},
	copper: {
		color: "#B87333",
		baseScale: 1.0,
		heightVariation: 0.3,
		roughness: 0.4,
		emissiveIntensity: 0.05,
		noiseFrequency: 4.0,
	},
	e_waste: {
		color: "#556B2F",
		baseScale: 0.8,
		heightVariation: 0.5,
		roughness: 0.9,
		emissiveIntensity: 0.1,
		noiseFrequency: 5.0,
	},
	fiber_optics: {
		color: "#00CED1",
		baseScale: 0.6,
		heightVariation: 0.2,
		roughness: 0.2,
		emissiveIntensity: 0.3,
		noiseFrequency: 8.0,
	},
	rare_alloy: {
		color: "#DAA520",
		baseScale: 2.0,
		heightVariation: 0.8,
		roughness: 0.15,
		emissiveIntensity: 0.2,
		noiseFrequency: 2.0,
	},
};

/** Default params for unknown ore types. */
const DEFAULT_RENDER_PARAMS: OreRenderParams = {
	color: "#808080",
	baseScale: 1.0,
	heightVariation: 0.3,
	roughness: 0.5,
	emissiveIntensity: 0,
	noiseFrequency: 3.0,
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let nextSeed = 1;
const deposits = new Map<string, DepositRecord>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic seed from a deposit registration order. */
function allocSeed(): number {
	return nextSeed++;
}

/**
 * Compute depletion percent: 0 = full, 1 = empty.
 * Guards against division by zero and negative values.
 */
function depletionPercent(current: number, max: number): number {
	if (max <= 0) return 1;
	const clamped = Math.max(0, Math.min(current, max));
	return 1 - clamped / max;
}

/**
 * Hex colour string to [r, g, b] in 0-255 range.
 */
function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace("#", "");
	return [
		Number.parseInt(h.substring(0, 2), 16),
		Number.parseInt(h.substring(2, 4), 16),
		Number.parseInt(h.substring(4, 6), 16),
	];
}

/**
 * [r, g, b] (0-255) back to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
	return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`.toUpperCase();
}

/**
 * Desaturate a hex colour by a factor (0 = no change, 1 = fully grey).
 */
function desaturate(hex: string, factor: number): string {
	const [r, g, b] = hexToRgb(hex);
	const grey = 0.299 * r + 0.587 * g + 0.114 * b;
	const f = Math.max(0, Math.min(1, factor));
	return rgbToHex(r + (grey - r) * f, g + (grey - g) * f, b + (grey - b) * f);
}

/**
 * Euclidean distance in XZ plane.
 */
function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a deposit for rendering. Call once after oreSpawner creates a
 * deposit entity.
 *
 * @throws Error if the depositId is already registered.
 */
export function registerDeposit(
	depositId: string,
	position: Vec3,
	oreType: string,
	quantity: number,
	maxQuantity: number,
): void {
	if (deposits.has(depositId)) {
		throw new Error(`Deposit "${depositId}" is already registered`);
	}
	deposits.set(depositId, {
		depositId,
		position: { ...position },
		oreType,
		currentQuantity: quantity,
		maxQuantity,
		discovered: false,
		targetedBy: null,
		noiseSeed: allocSeed(),
	});
}

/**
 * Remove a deposit from the render registry.
 * No-op if the deposit was not registered.
 */
export function unregisterDeposit(depositId: string): void {
	deposits.delete(depositId);
}

/**
 * Update the remaining quantity of a deposit so the renderer can show
 * depletion via scale reduction and colour desaturation.
 *
 * @throws Error if the deposit is not registered.
 */
export function updateDepositQuantity(
	depositId: string,
	current: number,
	max: number,
): void {
	const rec = deposits.get(depositId);
	if (!rec) {
		throw new Error(`Deposit "${depositId}" is not registered`);
	}
	rec.currentQuantity = current;
	rec.maxQuantity = max;
}

/**
 * Toggle fog-of-war visibility for a deposit.
 *
 * @throws Error if the deposit is not registered.
 */
export function setDepositDiscovered(
	depositId: string,
	discovered: boolean,
): void {
	const rec = deposits.get(depositId);
	if (!rec) {
		throw new Error(`Deposit "${depositId}" is not registered`);
	}
	rec.discovered = discovered;
}

/**
 * Mark which entity (bot/player) is currently mining this deposit,
 * or null to clear.
 *
 * @throws Error if the deposit is not registered.
 */
export function setDepositTargeted(
	depositId: string,
	targetedBy: string | null,
): void {
	const rec = deposits.get(depositId);
	if (!rec) {
		throw new Error(`Deposit "${depositId}" is not registered`);
	}
	rec.targetedBy = targetedBy;
}

/**
 * Look up the base (non-depletion-adjusted) render parameters for an ore
 * type. Returns default grey params for unknown types.
 */
export function getOreRenderParams(oreType: string): OreRenderParams {
	return ORE_RENDER_PARAMS[oreType] ?? { ...DEFAULT_RENDER_PARAMS };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Collect render info for every registered deposit. The renderer calls this
 * once per frame (or on change) to get the full set of data it needs.
 *
 * Depletion is applied to the render params:
 * - baseScale shrinks linearly (min 30 % of original at full depletion)
 * - colour desaturates proportionally to depletion
 */
export function collectDepositRenderData(): DepositRenderInfo[] {
	const result: DepositRenderInfo[] = [];

	for (const rec of deposits.values()) {
		const baseParams = getOreRenderParams(rec.oreType);
		const depl = depletionPercent(rec.currentQuantity, rec.maxQuantity);

		// Scale shrinks from 100 % → 30 % as depletion goes 0 → 1
		const scaleFactor = 1 - depl * 0.7;
		const adjustedColor = desaturate(baseParams.color, depl * 0.6);

		result.push({
			depositId: rec.depositId,
			position: { ...rec.position },
			oreType: rec.oreType,
			depletionPercent: depl,
			discovered: rec.discovered,
			targeted: rec.targetedBy,
			renderParams: {
				...baseParams,
				baseScale: baseParams.baseScale * scaleFactor,
				color: adjustedColor,
				noiseSeed: rec.noiseSeed,
			},
		});
	}

	return result;
}

/**
 * Return render info for only discovered (fog-revealed) deposits.
 */
export function getDiscoveredDeposits(): DepositRenderInfo[] {
	return collectDepositRenderData().filter((d) => d.discovered);
}

/**
 * Return render info for deposits within `radius` of `position` (XZ plane).
 */
export function getDepositsInRange(
	position: Vec3,
	radius: number,
): DepositRenderInfo[] {
	return collectDepositRenderData().filter((d) => {
		return distXZ(position, d.position) <= radius;
	});
}

/**
 * Return render info for deposits that are fully depleted (quantity = 0).
 */
export function getDepletedDeposits(): DepositRenderInfo[] {
	return collectDepositRenderData().filter((d) => d.depletionPercent >= 1);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Clear all state. Call in beforeEach() for test isolation.
 */
export function reset(): void {
	deposits.clear();
	nextSeed = 1;
}
