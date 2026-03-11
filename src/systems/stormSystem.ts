/**
 * Storm escalation system — 5-phase pacing, wealth-based raid scaling,
 * per-faction aggression timers, and cooldown-based event scheduling.
 *
 * Phases are defined in config/combat.json (stormPacing.phases), ordered by
 * minGameTick threshold. The current phase is the highest-indexed phase whose
 * minGameTick is <= the current game tick.
 *
 * Raid strength formula (from GDD §5.3):
 *   raidStrength = cubeCount * 0.5 + buildingCount * 2 + techLevel * 10
 * Multiplied by the active phase's raidWealthMultiplier.
 *
 * Per-faction aggression: each faction has an independent cooldown timer.
 * When the cooldown expires, the faction is "ready to aggress". The ready
 * flag is consumed when an event is scheduled.
 *
 * All tunables sourced from config/combat.json (stormPacing section).
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StormPhase {
	id: string;
	minGameTick: number;
	raidCooldownTicks: number;
	raidWealthMultiplier: number;
	aggressionMultiplier: number;
	stormIntensity: number;
}

export interface AggressionState {
	faction: string;
	cooldownTicksRemaining: number;
	isReady: boolean;
	lastEventTick: number;
	totalEvents: number;
}

export interface RaidStrengthInput {
	cubeCount: number;
	buildingCount: number;
	techLevel: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getStormPacingCfg() {
	return (
		config.combat as typeof config.combat & {
			stormPacing: {
				phases: StormPhase[];
				raidStrengthWeights: {
					cubeCountFactor: number;
					buildingCountFactor: number;
					techLevelFactor: number;
				};
				aggressionCooldownTicksBase: number;
				aggressionEventTypes: string[];
			};
		}
	).stormPacing;
}

function getPHASES(): StormPhase[] {
	return getStormPacingCfg()?.phases ?? [];
}
function getSTRENGTH_WEIGHTS() {
	return getStormPacingCfg()?.raidStrengthWeights ?? { cubeCountFactor: 0.5, buildingCountFactor: 2, techLevelFactor: 10 };
}
function getBASE_AGGRESSION_COOLDOWN() {
	return getStormPacingCfg()?.aggressionCooldownTicksBase ?? 100;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentPhaseIndex = 0;
const aggressionStates = new Map<string, AggressionState>();

// ---------------------------------------------------------------------------
// Core formulas
// ---------------------------------------------------------------------------

/**
 * Determine the current storm phase index from the game tick.
 * Returns the index of the highest phase whose minGameTick <= tick.
 */
export function getPhaseIndexForTick(tick: number): number {
	let idx = 0;
	for (let i = 0; i < getPHASES().length; i++) {
		if (tick >= getPHASES()[i].minGameTick) {
			idx = i;
		}
	}
	return idx;
}

/**
 * Get the current storm phase definition.
 */
export function getCurrentPhase(): StormPhase {
	return getPHASES()[currentPhaseIndex];
}

/**
 * Get the current storm phase index (0-4).
 */
export function getCurrentPhaseIndex(): number {
	return currentPhaseIndex;
}

/**
 * Calculate raw raid strength for a faction's economy.
 * Formula: cubeCount*0.5 + buildingCount*2 + techLevel*10
 * Multiplied by the active phase's raidWealthMultiplier.
 */
export function calculateRaidStrength(input: RaidStrengthInput): number {
	const base =
		input.cubeCount * getSTRENGTH_WEIGHTS().cubeCountFactor +
		input.buildingCount * getSTRENGTH_WEIGHTS().buildingCountFactor +
		input.techLevel * getSTRENGTH_WEIGHTS().techLevelFactor;
	return base * getCurrentPhase().raidWealthMultiplier;
}

/**
 * Get raid strength without the phase wealth multiplier applied.
 * Useful for comparing factions irrespective of current phase.
 */
export function calculateBaseRaidStrength(input: RaidStrengthInput): number {
	return (
		input.cubeCount * getSTRENGTH_WEIGHTS().cubeCountFactor +
		input.buildingCount * getSTRENGTH_WEIGHTS().buildingCountFactor +
		input.techLevel * getSTRENGTH_WEIGHTS().techLevelFactor
	);
}

// ---------------------------------------------------------------------------
// Aggression timers
// ---------------------------------------------------------------------------

/**
 * Register a faction for aggression cooldown tracking.
 * No-op if the faction is already registered.
 */
export function registerFactionAggression(faction: string): void {
	if (!aggressionStates.has(faction)) {
		aggressionStates.set(faction, {
			faction,
			cooldownTicksRemaining: getBASE_AGGRESSION_COOLDOWN(),
			isReady: false,
			lastEventTick: 0,
			totalEvents: 0,
		});
	}
}

/**
 * Get the aggression state for a faction, or undefined if not registered.
 */
export function getFactionAggressionState(faction: string): AggressionState | undefined {
	return aggressionStates.get(faction);
}

/**
 * Get all registered aggression states.
 */
export function getAllAggressionStates(): AggressionState[] {
	return [...aggressionStates.values()];
}

/**
 * Check whether a faction is ready to aggress (cooldown expired).
 * Returns false if the faction is not registered.
 */
export function isFactionReadyToAggress(faction: string): boolean {
	return aggressionStates.get(faction)?.isReady ?? false;
}

/**
 * Consume the ready flag for a faction event (e.g. when a raid is launched).
 * Resets the cooldown based on current phase and faction aggression modifier.
 *
 * @param faction - faction ID
 * @param currentTick - current game tick (recorded as lastEventTick)
 * @returns true if consumed, false if not ready
 */
export function consumeAggressionReady(faction: string, currentTick: number): boolean {
	const state = aggressionStates.get(faction);
	if (!state || !state.isReady) return false;

	const phase = getCurrentPhase();
	const aggressionMod = getAggressionModForFaction(faction);
	// Shorter cooldown when phase aggression is high and faction is aggressive
	const cooldown = Math.max(
		50,
		Math.round(
			phase.raidCooldownTicks / (phase.aggressionMultiplier * aggressionMod),
		),
	);

	state.isReady = false;
	state.cooldownTicksRemaining = cooldown;
	state.lastEventTick = currentTick;
	state.totalEvents++;
	return true;
}

/** Faction aggression modifier from config (default 1.0 if not found). */
function getAggressionModForFaction(faction: string): number {
	const factionAggression = (
		config.combat.raid as typeof config.combat.raid & {
			factionAggression?: Record<string, { aggressionMod: number }>;
		}
	).factionAggression;
	return factionAggression?.[faction]?.aggressionMod ?? 1.0;
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Advance the storm system by one tick.
 *
 * - Updates the current phase based on game tick.
 * - Decrements aggression cooldowns for all registered factions.
 * - Marks factions as ready when their cooldown expires.
 */
export function stormSystem(currentTick: number): void {
	// Update phase
	currentPhaseIndex = getPhaseIndexForTick(currentTick);

	// Tick aggression cooldowns
	for (const state of aggressionStates.values()) {
		if (state.isReady) continue; // already ready, nothing to tick
		if (state.cooldownTicksRemaining > 0) {
			state.cooldownTicksRemaining--;
		}
		if (state.cooldownTicksRemaining <= 0) {
			state.isReady = true;
		}
	}
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetStormSystem(): void {
	currentPhaseIndex = 0;
	aggressionStates.clear();
}
