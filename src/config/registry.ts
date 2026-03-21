/**
 * Config registry — unified API for all game configuration.
 *
 * Provides:
 * - Type-safe access to all config values
 * - Runtime overrides (for balance harness testing)
 * - Snapshot/restore for test isolation
 *
 * Config is organized by domain:
 *   victory.turnCap, victory.networkPercent, victory.reclamationPercent
 *   epochs[0..4].cultSpawnMod, epochs[0..4].cultCapMod
 *   buildings.motor_pool.buildCost, buildings.motor_pool.hp
 *   balance.cultSpawnInterval, balance.cultMaxTotal
 *   score.territoryWeight, score.buildingWeight
 *   etc.
 */

import { BIOME_DEFS } from "../terrain";
import { BUILDING_DEFS } from "./buildings";
import { EPOCHS } from "./epochDefs";
import {
	CULT_FINAL_ASSAULT_MULTIPLIER,
	CULT_FINAL_ASSAULT_TURN,
	DIPLOMACY_BACKSTAB_DELAY,
	DIPLOMACY_PEACE_DRIFT_TURNS,
	FORCED_DOMINATION_HOLD_TURNS,
	FORCED_DOMINATION_PERCENT,
	INITIAL_SCAN_RANGE,
	PLAYER_MAX_AP,
	STANDING_DECAY_PER_TURN,
	TERRITORY_BUILDING_RADIUS,
	TERRITORY_UNIT_RADIUS,
	VICTORY_NETWORK_COVERAGE_PERCENT,
	VICTORY_RECLAMATION_MIN_LEVEL,
	VICTORY_RECLAMATION_PERCENT,
	VICTORY_TURN_CAP,
	WORMHOLE_PROJECT_TURNS,
} from "./gameDefaults";

const overrides = new Map<string, unknown>();

/**
 * Get a config value by dot-path. Returns the override if set, else the compiled default.
 *
 * Usage:
 *   getConfig("victory.turnCap")              → 200
 *   getConfig("buildings.motor_pool.hp")       → 80
 *   getConfig("epochs.2.cultSpawnMod")         → 0.6
 *   getConfig("score.territoryWeight")         → 2
 */
export function getConfig<T = unknown>(path: string): T {
	if (overrides.has(path)) return overrides.get(path) as T;
	return getDefaultValue(path) as T;
}

/**
 * Set a runtime override for a config path.
 * Used by the balance harness to test variations.
 */
export function setConfigOverride(path: string, value: unknown): void {
	overrides.set(path, value);
}

/** Clear all runtime overrides (restore compiled defaults). */
export function clearConfigOverrides(): void {
	overrides.clear();
}

/** Get all current overrides as a plain object (for diagnostic reports). */
export function getConfigOverrides(): Record<string, unknown> {
	return Object.fromEntries(overrides);
}

/** Apply multiple overrides at once. */
export function applyConfigOverrides(map: Record<string, unknown>): void {
	for (const [path, value] of Object.entries(map)) {
		overrides.set(path, value);
	}
}

// ---------------------------------------------------------------------------
// Default value resolution
// ---------------------------------------------------------------------------

function getDefaultValue(path: string): unknown {
	const parts = path.split(".");
	const domain = parts[0];

	switch (domain) {
		case "victory":
			return resolveVictory(parts.slice(1));
		case "epochs":
			return resolveEpochs(parts.slice(1));
		case "buildings":
			return resolveBuildings(parts.slice(1));
		case "score":
			return resolveScore(parts.slice(1));
		case "balance":
			return resolveBalance(parts.slice(1));
		case "biomes":
			return resolveBiomes(parts.slice(1));
		case "diplomacy":
			return resolveDiplomacy(parts.slice(1));
		case "territory":
			return resolveTerritory(parts.slice(1));
		default:
			throw new Error(`Unknown config domain: ${domain}`);
	}
}

// ---------------------------------------------------------------------------
// Domain resolvers
// ---------------------------------------------------------------------------

function resolveVictory(parts: string[]): unknown {
	switch (parts[0]) {
		case "turnCap":
			return VICTORY_TURN_CAP;
		case "networkPercent":
			return VICTORY_NETWORK_COVERAGE_PERCENT;
		case "reclamationPercent":
			return VICTORY_RECLAMATION_PERCENT;
		case "reclamationMinLevel":
			return VICTORY_RECLAMATION_MIN_LEVEL;
		case "wormholeProjectTurns":
			return WORMHOLE_PROJECT_TURNS;
		case "forcedDominationPercent":
			return FORCED_DOMINATION_PERCENT;
		case "forcedDominationHoldTurns":
			return FORCED_DOMINATION_HOLD_TURNS;
		default:
			return undefined;
	}
}

function resolveEpochs(parts: string[]): unknown {
	const index = Number(parts[0]);
	if (Number.isNaN(index) || index < 0 || index >= EPOCHS.length)
		return undefined;
	const epoch = EPOCHS[index];
	if (parts.length === 1) return epoch;
	const key = parts[1] as keyof (typeof EPOCHS)[number];
	return key in epoch ? epoch[key] : undefined;
}

function resolveBuildings(parts: string[]): unknown {
	const buildingType = parts[0] as keyof typeof BUILDING_DEFS;
	const def = BUILDING_DEFS[buildingType];
	if (!def) return undefined;
	if (parts.length === 1) return def;
	const key = parts[1] as keyof typeof def;
	return key in def ? def[key] : undefined;
}

const SCORE_WEIGHTS = {
	territoryWeight: 2,
	networkWeight: 3,
	roboformWeight: 2,
	unitWeight: 1,
	buildingWeight: 2,
	buildingTierWeight: 5,
	cultDestroyedWeight: 10,
} as const;

function resolveScore(parts: string[]): unknown {
	const key = parts[0] as keyof typeof SCORE_WEIGHTS;
	return key in SCORE_WEIGHTS ? SCORE_WEIGHTS[key] : undefined;
}

const BALANCE_DEFAULTS = {
	cultSpawnInterval: 4,
	cultMinSpawnInterval: 1,
	cultMaxTotal: 20,
	cultBaseWaveSize: 1,
	cultMaxWaveSize: 4,
	cultMaxEscalationTerritory: 80,
	cultFinalAssaultTurn: CULT_FINAL_ASSAULT_TURN,
	cultFinalAssaultMultiplier: CULT_FINAL_ASSAULT_MULTIPLIER,
	playerMaxAp: PLAYER_MAX_AP,
	initialScanRange: INITIAL_SCAN_RANGE,
} as const;

function resolveBalance(parts: string[]): unknown {
	const key = parts[0] as keyof typeof BALANCE_DEFAULTS;
	return key in BALANCE_DEFAULTS ? BALANCE_DEFAULTS[key] : undefined;
}

function resolveBiomes(parts: string[]): unknown {
	const biomeType = parts[0] as keyof typeof BIOME_DEFS;
	const def = BIOME_DEFS[biomeType];
	if (!def) return undefined;
	if (parts.length === 1) return def;
	const key = parts[1] as keyof typeof def;
	return key in def ? def[key] : undefined;
}

function resolveDiplomacy(parts: string[]): unknown {
	switch (parts[0]) {
		case "peaceDriftTurns":
			return DIPLOMACY_PEACE_DRIFT_TURNS;
		case "backstabDelay":
			return DIPLOMACY_BACKSTAB_DELAY;
		case "standingDecayPerTurn":
			return STANDING_DECAY_PER_TURN;
		default:
			return undefined;
	}
}

function resolveTerritory(parts: string[]): unknown {
	switch (parts[0]) {
		case "unitRadius":
			return TERRITORY_UNIT_RADIUS;
		case "buildingRadius":
			return TERRITORY_BUILDING_RADIUS;
		default:
			return undefined;
	}
}
