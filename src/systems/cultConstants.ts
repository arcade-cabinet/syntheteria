/**
 * @module cultConstants
 *
 * Shared constants, module state, and helper functions for the cult subsystem.
 * All mutable state lives here so that cultSpawning, cultPatrols, cultPOI,
 * cultCorruption, and cultEscalation can share it without circular imports.
 */

import type { World } from "koota";
import { resetWanderState } from "../ai/steering/wanderSteering";
import { Board } from "../traits";
import type { StormProfile } from "../world/config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_SPAWN_INTERVAL = 5;
export const MIN_SPAWN_INTERVAL = 2;
export const BASE_WAVE_SIZE = 1;
export const MAX_WAVE_SIZE = 4;
export const MAX_TOTAL_CULTISTS = 12;
export const MAX_ESCALATION_TERRITORY = 80;
export const CORRUPTION_NODE_CHANCE = 0.3;

/** Maximum breach altars from breach zone spawning (prevents altar sprawl). */
export const MAX_BREACH_ALTARS = 6;

/** Number of POIs placed at game start on abandoned/dust terrain. */
export const INITIAL_POI_COUNT_MIN = 3;
export const INITIAL_POI_COUNT_MAX = 6;

/** Cult mech patrol radius around their home POI (manhattan). */
export const PATROL_RADIUS = 4;

/** Floor types where cult POIs can spawn at game start. */
export const CULT_TERRAIN = new Set(["ruins", "desert"]);

// ---------------------------------------------------------------------------
// Storm profile overrides
// ---------------------------------------------------------------------------

export interface StormCultistParams {
	baseSpawnInterval: number;
	maxWaveSize: number;
	maxTotalCultists: number;
}

export const STORM_CULTIST_PARAMS: Record<StormProfile, StormCultistParams> = {
	stable: {
		baseSpawnInterval: 7,
		maxWaveSize: 2,
		maxTotalCultists: MAX_TOTAL_CULTISTS,
	},
	volatile: {
		baseSpawnInterval: BASE_SPAWN_INTERVAL,
		maxWaveSize: MAX_WAVE_SIZE,
		maxTotalCultists: MAX_TOTAL_CULTISTS,
	},
	cataclysmic: { baseSpawnInterval: 3, maxWaveSize: 6, maxTotalCultists: 20 },
};

export function readStormProfile(world: World): StormProfile {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.stormProfile;
	}
	return "volatile";
}

export function getStormCultistParams(storm: StormProfile): StormCultistParams {
	return STORM_CULTIST_PARAMS[storm];
}

// ---------------------------------------------------------------------------
// Cult faction IDs
// ---------------------------------------------------------------------------

export const CULT_FACTIONS = [
	"static_remnants",
	"null_monks",
	"lost_signal",
] as const;

// ---------------------------------------------------------------------------
// Module state — shared across cult subsystem files
// ---------------------------------------------------------------------------

export let breachZones: Array<{ x: number; z: number }> = [];
export const altarZones = new Set<string>();
export const corruptedTiles = new Set<string>();
/** POI positions placed at game start (keyed by "x,z"). */
export let poiPositions: Array<{ x: number; z: number }> = [];
export let poisInitialized = false;

/** Setter for breachZones (needed because `let` exports are read-only from outside). */
export function setBreachZones(zones: Array<{ x: number; z: number }>): void {
	breachZones = zones;
}

/** Mark POIs as initialized. */
export function setPoisInitialized(val: boolean): void {
	poisInitialized = val;
}

/** Append a POI position. */
export function addPOIPosition(pos: { x: number; z: number }): void {
	poiPositions.push(pos);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isCultFaction(factionId: string): boolean {
	return (CULT_FACTIONS as readonly string[]).includes(factionId);
}

export function readTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getCorruptedTiles(): ReadonlySet<string> {
	return corruptedTiles;
}

export function getBreachZones(): ReadonlyArray<{ x: number; z: number }> {
	return breachZones;
}

export function getAltarZones(): ReadonlySet<string> {
	return altarZones;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function _reset(): void {
	breachZones = [];
	altarZones.clear();
	corruptedTiles.clear();
	poiPositions = [];
	poisInitialized = false;
	resetWanderState();
}
