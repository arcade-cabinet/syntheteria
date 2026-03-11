/**
 * Ideology system — Faith/Ideology resource generation and doctrine unlocks.
 *
 * Faith is the primary resource of the Religious/Philosophical victory path.
 * It accumulates from Shrines, Temples, and Grand Cathedrals, and from
 * special events (conversions, doctrine unlocks, storm events for Volt Collective).
 *
 * Faith exists in tension with Reason (compute). High Faith slows research;
 * high Reason reduces conversion vulnerability. Both can reach their max
 * simultaneously — this is NOT zero-sum. The tension is expressed as
 * multiplicative speed penalties, tunable per the faithReasonTension config.
 *
 * Doctrine unlocks are per-faction milestones that gate Religious path actions
 * and buildings. They auto-unlock when accumulated faith crosses a threshold.
 *
 * Module-level state with _resetIdeologyState() for test cleanup.
 *
 * Tunables sourced from config/victoryPaths.json (faithSystem, factionCults).
 */

import victoryPathsConfig from "../../config/victoryPaths.json";
import buildingsConfig from "../../config/buildings.json";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const faithCfg = victoryPathsConfig.faithSystem;
const victoryEnlightenment = victoryPathsConfig.victoryEnlightenment;
const factionCults = victoryPathsConfig.factionCults as Record<
	string,
	{
		cultName: string;
		cultLeaderUnit: string;
		faithBonusDuringStorm?: number;
		doctrines: Array<{
			id: string;
			name: string;
			faithRequired: number;
			effect: Record<string, unknown>;
		}>;
	}
>;

/** Faith/Reason tension tunable: fraction of research speed lost per 100% faith fill. */
const FAITH_RESEARCH_PENALTY_FACTOR = 0.3;

/** Reason resistance: each point of reason above this reduces conversion vulnerability. */
const REASON_CONVERSION_RESISTANCE_THRESHOLD = 100;
const REASON_CONVERSION_RESISTANCE_PER_POINT = 0.005;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShrineType = "shrine" | "temple" | "grand_cathedral";

export interface ShrineRecord {
	id: string;
	type: ShrineType;
	faction: string;
	position: { x: number; y: number; z: number };
}

export interface DoctrineRecord {
	id: string;
	name: string;
	faithRequired: number;
	unlockedAt: number; // tick
}

export interface FactionIdeologyState {
	faith: number;
	reason: number;
	shrines: ShrineRecord[];
	unlockedDoctrines: DoctrineRecord[];
	grandCathedralBuilt: boolean;
	/** Total units converted TO this faction via conversion system */
	unitsConverted: number;
	/** Whether cult leader has ever been fielded */
	cultLeaderSurvived: boolean;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Per-faction ideology state, keyed by faction name. */
const factionStates = new Map<string, FactionIdeologyState>();
let nextShrineId = 0;

// ---------------------------------------------------------------------------
// Faction state management
// ---------------------------------------------------------------------------

function getOrCreate(faction: string): FactionIdeologyState {
	if (!factionStates.has(faction)) {
		factionStates.set(faction, {
			faith: 0,
			reason: 0,
			shrines: [],
			unlockedDoctrines: [],
			grandCathedralBuilt: false,
			unitsConverted: 0,
			cultLeaderSurvived: false,
		});
	}
	return factionStates.get(faction)!;
}

// ---------------------------------------------------------------------------
// Shrine placement
// ---------------------------------------------------------------------------

/**
 * Register a shrine placed in the world.
 *
 * @param faction     — Owning faction
 * @param type        — "shrine" | "temple" | "grand_cathedral"
 * @param position    — World position
 * @param tick        — Current game tick
 * @returns The registered ShrineRecord
 */
export function placeShrine(
	faction: string,
	type: ShrineType,
	position: { x: number; y: number; z: number },
	tick: number,
): ShrineRecord {
	const state = getOrCreate(faction);
	const shrine: ShrineRecord = {
		id: `shrine_${nextShrineId++}`,
		type,
		faction,
		position: { ...position },
	};

	state.shrines.push(shrine);

	if (type === "grand_cathedral") {
		state.grandCathedralBuilt = true;
	}

	safeEmit({
		type: "shrine_placed",
		faction,
		buildingType: type,
		position,
		shrineId: shrine.id,
		tick,
	});

	return shrine;
}

/**
 * Remove a shrine by ID (destroyed by enemy, etc).
 */
export function removeShrine(faction: string, shrineId: string): boolean {
	const state = factionStates.get(faction);
	if (!state) return false;

	const before = state.shrines.length;
	state.shrines = state.shrines.filter((s) => s.id !== shrineId);

	// Recalculate grand cathedral status
	state.grandCathedralBuilt = state.shrines.some((s) => s.type === "grand_cathedral");

	return state.shrines.length < before;
}

// ---------------------------------------------------------------------------
// Faith generation
// ---------------------------------------------------------------------------

/**
 * Compute how much faith a faction generates per tick from all active shrines.
 * Volt Collective gets a bonus multiplier during storm events.
 */
export function computeFaithPerTick(faction: string, isStormActive = false): number {
	const state = factionStates.get(faction);
	if (!state) return 0;

	const religious = buildingsConfig.religious as unknown as Record<
		string,
		{ faithOutputPerTick: number }
	>;

	let total = 0;
	for (const shrine of state.shrines) {
		const buildingCfg = religious[shrine.type];
		if (!buildingCfg) continue;
		total += buildingCfg.faithOutputPerTick;
	}

	// Volt Collective storm bonus
	if (isStormActive && faction === "volt_collective") {
		const cultCfg = factionCults[faction];
		const bonus = cultCfg?.faithBonusDuringStorm ?? 1.0;
		total += bonus * state.shrines.length;
	}

	return total;
}

/**
 * Add faith to a faction from a named source.
 * Respects maxFaith cap.
 *
 * @param faction  — Faction receiving faith
 * @param amount   — Faith amount to add
 * @param source   — Description of source (for event)
 * @param tick     — Current tick
 * @returns New faith total
 */
export function addFaith(
	faction: string,
	amount: number,
	source: string,
	tick: number,
): number {
	const state = getOrCreate(faction);
	const before = state.faith;
	state.faith = Math.min(faithCfg.maxFaith, state.faith + amount);
	const added = state.faith - before;

	if (added > 0) {
		safeEmit({
			type: "faith_generated",
			faction,
			amount: added,
			source,
			totalFaith: state.faith,
			tick,
		});
	}

	return state.faith;
}

/**
 * Add reason (compute) to a faction.
 * High reason makes units resistant to conversion.
 */
export function addReason(faction: string, amount: number): number {
	const state = getOrCreate(faction);
	const reasonCfg = victoryPathsConfig.reasonSystem;
	state.reason = Math.min(reasonCfg.maxReason, state.reason + amount);
	return state.reason;
}

// ---------------------------------------------------------------------------
// Tick update
// ---------------------------------------------------------------------------

/**
 * Per-tick ideology update. Generates faith from all shrines, checks for
 * newly unlocked doctrines, and emits enlightenment progress events.
 *
 * Call once per game tick for each faction.
 *
 * @param faction       — Faction to update
 * @param tick          — Current game tick
 * @param isStormActive — Whether a storm is currently active (Volt bonus)
 */
export function updateIdeology(faction: string, tick: number, isStormActive = false): void {
	const state = factionStates.get(faction);
	if (!state || state.shrines.length === 0) return;

	const faithPerTick = computeFaithPerTick(faction, isStormActive);
	if (faithPerTick > 0) {
		addFaith(faction, faithPerTick, "shrine_tick", tick);
	}

	// Check doctrine unlocks
	checkDoctrineUnlocks(faction, tick);

	// Emit enlightenment progress
	const progress = getEnlightenmentProgress(faction);
	safeEmit({
		type: "enlightenment_progress",
		faction,
		faith: state.faith,
		faithRequired: victoryEnlightenment.faithRequired,
		unitsConverted: state.unitsConverted,
		unitsConvertedRequired: victoryEnlightenment.unitsConverted,
		doctrinesUnlocked: state.unlockedDoctrines.length,
		grandCathedralBuilt: state.grandCathedralBuilt,
		victoryEligible: progress.isEligible,
		tick,
	});
}

// ---------------------------------------------------------------------------
// Doctrine unlocks
// ---------------------------------------------------------------------------

/**
 * Check whether any new doctrines should be unlocked for a faction.
 * Called automatically during updateIdeology.
 */
export function checkDoctrineUnlocks(faction: string, tick: number): DoctrineRecord[] {
	const state = factionStates.get(faction);
	if (!state) return [];

	const cultCfg = factionCults[faction];
	if (!cultCfg) return [];

	const unlocked: DoctrineRecord[] = [];
	const alreadyUnlocked = new Set(state.unlockedDoctrines.map((d) => d.id));

	for (const doctrine of cultCfg.doctrines) {
		if (alreadyUnlocked.has(doctrine.id)) continue;
		if (state.faith < doctrine.faithRequired) continue;

		const record: DoctrineRecord = {
			id: doctrine.id,
			name: doctrine.name,
			faithRequired: doctrine.faithRequired,
			unlockedAt: tick,
		};

		state.unlockedDoctrines.push(record);
		unlocked.push(record);

		// Faith bonus for unlocking doctrine
		const bonus = faithCfg.faithGenerationSources.doctrine_unlock;
		addFaith(faction, bonus, "doctrine_unlock", tick);

		safeEmit({
			type: "doctrine_unlocked",
			faction,
			doctrineId: doctrine.id,
			doctrineName: doctrine.name,
			faithAtUnlock: state.faith,
			tick,
		});
	}

	return unlocked;
}

// ---------------------------------------------------------------------------
// Faith/Reason tension
// ---------------------------------------------------------------------------

/**
 * Get the current research speed multiplier for a faction.
 * High faith slows research (Faith/Reason tension mechanic).
 *
 * Returns a multiplier in [0.7, 1.0].
 * At max faith, research is slowed by FAITH_RESEARCH_PENALTY_FACTOR * 100%.
 */
export function getResearchSpeedMultiplier(faction: string): number {
	const state = factionStates.get(faction);
	if (!state) return 1.0;

	const faithFraction = state.faith / faithCfg.maxFaith;
	const penalty = faithFraction * FAITH_RESEARCH_PENALTY_FACTOR;
	return Math.max(0.7, 1.0 - penalty);
}

/**
 * Get the conversion resistance multiplier for a faction's units.
 * High reason reduces vulnerability to conversion.
 *
 * Returns a value in [0.0, 1.0] — multiply against base conversion chance.
 * 0.0 = totally immune; 1.0 = no resistance.
 */
export function getConversionResistance(faction: string): number {
	const state = factionStates.get(faction);
	if (!state) return 1.0;

	const excessReason = Math.max(0, state.reason - REASON_CONVERSION_RESISTANCE_THRESHOLD);
	const resistance = excessReason * REASON_CONVERSION_RESISTANCE_PER_POINT;
	return Math.max(0, 1.0 - resistance);
}

// ---------------------------------------------------------------------------
// Victory progress
// ---------------------------------------------------------------------------

export interface EnlightenmentProgress {
	faith: number;
	faithRequired: number;
	unitsConverted: number;
	unitsConvertedRequired: number;
	doctrinesUnlocked: number;
	doctrinesRequired: number;
	grandCathedralBuilt: boolean;
	cultLeaderSurvived: boolean;
	/** True when all conditions are met */
	isEligible: boolean;
}

/**
 * Get Enlightenment Victory progress for a faction.
 */
export function getEnlightenmentProgress(faction: string): EnlightenmentProgress {
	const state = getOrCreate(faction);
	const isEligible =
		state.faith >= victoryEnlightenment.faithRequired &&
		state.unitsConverted >= victoryEnlightenment.unitsConverted &&
		state.unlockedDoctrines.length >= victoryEnlightenment.doctrinesUnlocked &&
		state.grandCathedralBuilt &&
		state.cultLeaderSurvived;

	return {
		faith: state.faith,
		faithRequired: victoryEnlightenment.faithRequired,
		unitsConverted: state.unitsConverted,
		unitsConvertedRequired: victoryEnlightenment.unitsConverted,
		doctrinesUnlocked: state.unlockedDoctrines.length,
		doctrinesRequired: victoryEnlightenment.doctrinesUnlocked,
		grandCathedralBuilt: state.grandCathedralBuilt,
		cultLeaderSurvived: state.cultLeaderSurvived,
		isEligible,
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get all state for a faction (returns undefined if not initialized). */
export function getFactionIdeologyState(faction: string): FactionIdeologyState | undefined {
	return factionStates.get(faction);
}

/** Get current faith total for a faction. */
export function getFaith(faction: string): number {
	return factionStates.get(faction)?.faith ?? 0;
}

/** Get current reason total for a faction. */
export function getReason(faction: string): number {
	return factionStates.get(faction)?.reason ?? 0;
}

/** Get all shrines for a faction. */
export function getFactionShrines(faction: string): ShrineRecord[] {
	return factionStates.get(faction)?.shrines ?? [];
}

/** Get unlocked doctrines for a faction. */
export function getUnlockedDoctrines(faction: string): DoctrineRecord[] {
	return factionStates.get(faction)?.unlockedDoctrines ?? [];
}

/**
 * Record that a unit was converted TO this faction.
 * Called by conversionSystem on successful conversion.
 */
export function recordConversion(faction: string, tick: number): void {
	const state = getOrCreate(faction);
	state.unitsConverted++;
	addFaith(faction, faithCfg.faithGenerationSources.conversion_event, "conversion", tick);
}

/**
 * Record that a cult leader is active (for victory condition tracking).
 */
export function recordCultLeaderActive(faction: string): void {
	const state = getOrCreate(faction);
	state.cultLeaderSurvived = true;
}

// ---------------------------------------------------------------------------
// Influence zones
// ---------------------------------------------------------------------------

export interface InfluenceZoneResult {
	shrineId: string;
	radius: number;
	faithPressurePerTick: number;
	position: { x: number; y: number; z: number };
}

/**
 * Get all active influence zones for a faction.
 * Used by the conversionSystem to check if enemy units are inside a zone.
 */
export function getInfluenceZones(faction: string): InfluenceZoneResult[] {
	const state = factionStates.get(faction);
	if (!state) return [];

	const influenceZoneCfg = faithCfg.influenceZones as Record<
		string,
		{ radius: number; faithPressurePerTick: number }
	>;

	return state.shrines.map((shrine) => {
		const zoneCfg = influenceZoneCfg[shrine.type] ?? { radius: 8, faithPressurePerTick: 0.1 };
		return {
			shrineId: shrine.id,
			radius: zoneCfg.radius,
			faithPressurePerTick: zoneCfg.faithPressurePerTick,
			position: shrine.position,
		};
	});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Event emission must never crash gameplay
	}
}

// ---------------------------------------------------------------------------
// Test reset
// ---------------------------------------------------------------------------

/** Reset all ideology state. For testing only. */
export function _resetIdeologyState(): void {
	factionStates.clear();
	nextShrineId = 0;
}
