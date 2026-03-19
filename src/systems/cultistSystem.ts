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

// --- Constants & state ---
export {
	getStormCultistParams,
	getCorruptedTiles,
	getBreachZones,
	getAltarZones,
	_reset,
} from "./cultConstants";
export type { StormCultistParams } from "./cultConstants";

// --- Escalation ---
export { getEscalationStage, SECT_BIASES } from "./cultEscalation";
export type { EscalationStage, SectBias } from "./cultEscalation";

// --- POI ---
export { initCultPOIs, getPOIPositions } from "./cultPOI";

// --- Spawning ---
export { initBreachZones, checkCultistSpawn } from "./cultSpawning";

// --- Patrols ---
export { runCultPatrols } from "./cultPatrols";

// --- Corruption ---
export { cleanupDestroyedStructures, spreadCorruption } from "./cultCorruption";
