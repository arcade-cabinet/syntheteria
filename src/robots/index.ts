/**
 * @package robots
 *
 * Robot archetypes, placement, marks, class actions, and specialization tracks.
 */

// --- Archetypes (spawn functions + defaults) ---
export {
	CAVALRY_DEFAULTS,
	INFANTRY_DEFAULTS,
	RANGED_DEFAULTS,
	SCOUT_DEFAULTS,
	SUPPORT_DEFAULTS,
	spawnCavalry,
	spawnInfantry,
	spawnRanged,
	spawnScout,
	spawnSupport,
	spawnWorker,
	WORKER_DEFAULTS,
} from "./archetypes";
export type { CultMechType } from "./CultMechs";
// --- Cult mechs ---
export {
	CULT_ARCHON_DEFAULTS,
	CULT_CAVALRY_DEFAULTS,
	CULT_INFANTRY_DEFAULTS,
	CULT_MAX_ENEMIES_PER_TIER,
	CULT_RANGED_DEFAULTS,
	CULT_SHAMAN_DEFAULTS,
	CULT_TERRITORY_MILESTONES,
	CULT_TIER_UNIT_TYPES,
	getEscalationTier,
	spawnCultArchon,
	spawnCultCavalry,
	spawnCultInfantry,
	spawnCultMechByType,
	spawnCultRanged,
	spawnCultShaman,
} from "./CultMechs";
export type { ActionCategory, ClassActionDef } from "./classActions";
// --- Class actions ---
export {
	CLASS_ACTIONS,
	canUseAction,
	getActionsForUnit,
	getClassAction,
	getClassActions,
	getClassActionsByCategory,
	hasClassAction,
} from "./classActions";
export type { BotMark, MarkDef, MarkSpecialization } from "./marks";
// --- Marks ---
export {
	getMarkSpecEffectValue,
	getMarkSpecializations,
	hasMarkSpecEffect,
	MARK_DEFS,
	MARK_EFFECTS,
	MARK_SPECIALIZATIONS,
	MAX_MARK_LEVEL,
} from "./marks";
export type { RobotPlacementFlag, SimpleBoardInfo } from "./placement";
// --- Placement ---
export {
	buildPlacementFlags,
	computeSpawnCenters,
	findAffinitySpawn,
	getSpawnCenters,
	placeRobots,
} from "./placement";
// --- Specialization track techs (consumed by config/techTreeDefs) ---
export { CAVALRY_TRACK_TECHS } from "./specializations/cavalryTracks";
export { INFANTRY_TRACK_TECHS } from "./specializations/infantryTracks";
export { RANGED_SPEC_TECHS } from "./specializations/rangedTracks";
export { SCOUT_TRACK_TECHS } from "./specializations/scoutTracks";
export { SUPPORT_TRACK_TECHS } from "./specializations/supportTracks";
export type { TrackEntry } from "./specializations/trackRegistry";
// --- Specialization tracks ---
export {
	getAllTrackTechs,
	getSpecializedActions,
	getTracksForClass,
	TRACK_REGISTRY,
} from "./specializations/trackRegistry";
export { WORKER_TRACK_TECHS } from "./specializations/workerTracks";
// --- Types ---
export type { BotTier, RobotClass } from "./types";
