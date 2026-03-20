/**
 * Epoch definitions — long-game progression system.
 *
 * Epochs are Civilization-style ages that gate cult evolution,
 * storm escalation, and victory paths. They provide organic pacing so
 * the game grows from intimate survival into strategic-scale competition.
 *
 * Epoch transitions are driven by the highest building tier across ALL
 * factions (including AI) and the current turn number.
 * Building tiers (1–3) map to epoch eligibility:
 *
 *   Building tier 1 → Epoch 1 (always) + Epoch 2 (turn 10+)
 *   Building tier 2 → Epoch 3 (turn 30+)
 *   Building tier 3 → Epoch 4 (turn 60+) + Epoch 5 (turn 100+)
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
	/** Minimum building tier required to unlock this epoch (highest tier across all factions). */
	readonly techTier: 1 | 2 | 3;
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
		techTier: 1,
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
		techTier: 2,
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
		techTier: 3,
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
		techTier: 3,
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

/** Get epoch definition by building tier (1-3). */
export function getEpochForTechTier(tier: number): EpochDef {
	const clamped = Math.max(1, Math.min(3, tier));
	// Find the highest epoch whose techTier requirement is met (ignoring minTurn)
	let result = EPOCHS[0];
	for (const epoch of EPOCHS) {
		if (clamped >= epoch.techTier) {
			result = epoch;
		}
	}
	return result;
}

/**
 * Compute the current epoch from the highest building tier across all
 * factions and the current turn number.
 *
 * The epoch is the highest epoch whose techTier (building tier) AND minTurn
 * requirements are both met. This prevents epoch-skipping via early rushes.
 */
export function computeEpoch(
	highestBuildingTier: number,
	currentTurn: number,
): EpochDef {
	let result = EPOCHS[0];
	for (const epoch of EPOCHS) {
		if (highestBuildingTier >= epoch.techTier && currentTurn >= epoch.minTurn) {
			result = epoch;
		}
	}
	return result;
}

/**
 * Building tier to epoch mapping table (for documentation / UI display).
 * Building tier 1 enables epochs 1-2, tier 2 enables epoch 3, tier 3 enables epochs 4-5.
 */
export const TECH_TIER_TO_EPOCH: ReadonlyMap<number, EpochId> = new Map([
	[1, "expansion"],
	[2, "consolidation"],
	[3, "transcendence"],
]);
