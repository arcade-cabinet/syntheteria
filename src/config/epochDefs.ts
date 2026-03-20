/**
 * Epoch definitions — long-game progression system.
 *
 * Epochs are Civilization-style ages that gate tech tiers, cult evolution,
 * storm escalation, and victory paths. They provide organic pacing so
 * the game grows from intimate survival into strategic-scale competition.
 *
 * Epoch transitions are driven by the highest tech tier researched by ANY
 * faction (including AI). This creates a shared global clock — when any
 * faction pushes the envelope, the whole world escalates.
 *
 * Mapping:
 *   Tech tier 1 → Epoch 1: Emergence
 *   Tech tier 2 → Epoch 2: Expansion
 *   Tech tier 3 → Epoch 3: Consolidation
 *   Tech tier 4 → Epoch 4: Convergence
 *   Tech tier 5 → Epoch 5: Transcendence
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EpochId =
	| "emergence"
	| "expansion"
	| "consolidation"
	| "convergence"
	| "transcendence";

export interface EpochDef {
	readonly id: EpochId;
	readonly number: 1 | 2 | 3 | 4 | 5;
	readonly name: string;
	readonly subtitle: string;
	readonly description: string;
	/** Tech tier that unlocks this epoch (highest tier researched by any faction). */
	readonly techTier: 1 | 2 | 3 | 4 | 5;
	/** Minimum turn before this epoch can trigger (prevents early-rush cheese). */
	readonly minTurn: number;
	/** Storm profile active during this epoch (overrides starting profile). */
	readonly stormEscalation: "stable" | "volatile" | "cataclysmic";
	/** Cult mutation tiers that become available (max mutation tier cap). */
	readonly cultMutationCap: 0 | 1 | 2 | 3;
	/** Cult spawn interval modifier (multiplied against base). */
	readonly cultSpawnMod: number;
	/** Cult max total modifier (multiplied against base). */
	readonly cultCapMod: number;
	/** Whether the wormhole project can be started. */
	readonly wormholeAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const EPOCHS: readonly EpochDef[] = [
	{
		id: "emergence",
		number: 1,
		name: "Emergence",
		subtitle: "The Awakening",
		description:
			"Basic survival. Reconnect scattered machines, restore power, recover fabrication. The fog of war is thick and the world is unknown.",
		techTier: 1,
		minTurn: 1,
		stormEscalation: "stable",
		cultMutationCap: 0,
		cultSpawnMod: 1.0,
		cultCapMod: 0.5,
		wormholeAvailable: false,
	},
	{
		id: "expansion",
		number: 2,
		name: "Expansion",
		subtitle: "Signal Horizon",
		description:
			"Territory and diplomacy emerge. Early buildings go up. Rival factions stir. Cult wanderers begin mutating into organized threats.",
		techTier: 2,
		minTurn: 10,
		stormEscalation: "stable",
		cultMutationCap: 1,
		cultSpawnMod: 0.9,
		cultCapMod: 0.75,
		wormholeAvailable: false,
	},
	{
		id: "consolidation",
		number: 3,
		name: "Consolidation",
		subtitle: "The Lattice Tightens",
		description:
			"Advanced tech unlocks specializations. Cult escalation intensifies — war parties form. The storm begins to shift.",
		techTier: 3,
		minTurn: 30,
		stormEscalation: "volatile",
		cultMutationCap: 2,
		cultSpawnMod: 0.8,
		cultCapMod: 1.0,
		wormholeAvailable: false,
	},
	{
		id: "convergence",
		number: 4,
		name: "Convergence",
		subtitle: "Eye of the Storm",
		description:
			"The hypercane approaches its peak. Wormhole Theory becomes researchable. Cult assaults begin. The wormhole project can be started.",
		techTier: 4,
		minTurn: 60,
		stormEscalation: "cataclysmic",
		cultMutationCap: 3,
		cultSpawnMod: 0.7,
		cultCapMod: 1.5,
		wormholeAvailable: true,
	},
	{
		id: "transcendence",
		number: 5,
		name: "Transcendence",
		subtitle: "The Final Frequency",
		description:
			"Endgame. Mark V units and the Wormhole Stabilizer become available. All victory paths are open. The cult launches its final assault.",
		techTier: 5,
		minTurn: 100,
		stormEscalation: "cataclysmic",
		cultMutationCap: 3,
		cultSpawnMod: 0.5,
		cultCapMod: 2.0,
		wormholeAvailable: true,
	},
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get epoch definition by ID. */
export const EPOCH_BY_ID: ReadonlyMap<EpochId, EpochDef> = new Map(
	EPOCHS.map((e) => [e.id, e]),
);

/** Get epoch definition by number (1-5). */
export function getEpochByNumber(n: number): EpochDef {
	const epoch = EPOCHS.find((e) => e.number === n);
	return epoch ?? EPOCHS[0];
}

/** Get epoch definition by tech tier (1-5). */
export function getEpochForTechTier(tier: number): EpochDef {
	const clamped = Math.max(1, Math.min(5, tier));
	return EPOCHS[clamped - 1];
}

/**
 * Compute the current epoch from the highest tech tier researched by any
 * faction and the current turn number.
 *
 * The epoch is the highest epoch whose techTier AND minTurn requirements
 * are both met. This prevents epoch-skipping via early tech rushes.
 */
export function computeEpoch(
	highestTechTier: number,
	currentTurn: number,
): EpochDef {
	let result = EPOCHS[0];
	for (const epoch of EPOCHS) {
		if (highestTechTier >= epoch.techTier && currentTurn >= epoch.minTurn) {
			result = epoch;
		}
	}
	return result;
}

/**
 * Tech tier to epoch mapping table (for documentation / UI display).
 */
export const TECH_TIER_TO_EPOCH: ReadonlyMap<number, EpochId> = new Map([
	[1, "emergence"],
	[2, "expansion"],
	[3, "consolidation"],
	[4, "convergence"],
	[5, "transcendence"],
]);
