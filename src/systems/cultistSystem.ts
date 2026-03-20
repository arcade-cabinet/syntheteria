/**
 * @module cultistSystem
 *
 * Barrel re-export for the cult subsystem. All logic lives in:
 *   - cultConstants.ts  — shared state, helpers, storm params
 *   - cultEscalation.ts — escalation stages, sect biases
 *   - cultPOI.ts        — POI initialization at game start
 *   - cultSpawning.ts   — breach zones, spawn loop
 *   - cultPatrols.ts    — stage-aware patrol behavior
 *   - cultCorruption.ts — corruption spread, structure cleanup
 */

export type { StormCultistParams } from "./cultConstants";
// --- Constants & state ---
export {
	_reset,
	getAltarZones,
	getBreachZones,
	getCorruptedTiles,
	getStormCultistParams,
} from "./cultConstants";
// --- Corruption ---
export { cleanupDestroyedStructures, spreadCorruption } from "./cultCorruption";
// --- Encounter tracker ---
export {
	_resetCultEncounters,
	fireCultEncounter,
	fireELArrival,
	fireHumanEncounter,
	hasELArrivalFired,
	hasFiredEncounter,
	hasFiredHumanEncounter,
} from "./cultEncounterTracker";
export type { EscalationStage, SectBias } from "./cultEscalation";
// --- Escalation ---
export { getEscalationStage, SECT_BIASES } from "./cultEscalation";
// --- Patrols ---
export { runCultPatrols } from "./cultPatrols";
// --- POI ---
export { getPOIPositions, initCultPOIs } from "./cultPOI";
// --- Spawning ---
export { checkCultistSpawn, initBreachZones } from "./cultSpawning";
