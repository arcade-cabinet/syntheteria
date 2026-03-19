/**
 * @package robots
 *
 * Robot archetypes, placement, marks, class actions, and specialization tracks.
 */

// --- Archetypes (spawn functions + defaults) ---
export {
	SUPPORT_DEFAULTS,
	spawnSupport,
	CAVALRY_DEFAULTS,
	spawnCavalry,
	RANGED_DEFAULTS,
	spawnRanged,
	WORKER_DEFAULTS,
	spawnWorker,
	SCOUT_DEFAULTS,
	spawnScout,
	INFANTRY_DEFAULTS,
	spawnInfantry,
} from "./archetypes";

// --- Cult mechs ---
export {
	CULT_INFANTRY_DEFAULTS,
	spawnCultInfantry,
	CULT_RANGED_DEFAULTS,
	spawnCultRanged,
	CULT_SHAMAN_DEFAULTS,
	spawnCultShaman,
	CULT_CAVALRY_DEFAULTS,
	spawnCultCavalry,
	CULT_ARCHON_DEFAULTS,
	spawnCultArchon,
	CULT_TERRITORY_MILESTONES,
	CULT_TIER_UNIT_TYPES,
	CULT_MAX_ENEMIES_PER_TIER,
	getEscalationTier,
	spawnCultMechByType,
} from "./CultMechs";
export type { CultMechType } from "./CultMechs";

// --- Class actions ---
export {
	CLASS_ACTIONS,
	getClassActions,
	getClassAction,
	hasClassAction,
	getClassActionsByCategory,
	getActionsForUnit,
	canUseAction,
} from "./classActions";
export type { ActionCategory, ClassActionDef } from "./classActions";

// --- Marks ---
export {
	MARK_DEFS,
	MAX_MARK_LEVEL,
	MARK_SPECIALIZATIONS,
	getMarkSpecializations,
	hasMarkSpecEffect,
	getMarkSpecEffectValue,
	MARK_EFFECTS,
} from "./marks";
export type { BotMark, MarkDef, MarkSpecialization } from "./marks";

// --- Placement ---
export {
	buildPlacementFlags,
	findAffinitySpawn,
	getSpawnCenters,
	computeSpawnCenters,
	placeRobots,
} from "./placement";
export type { RobotPlacementFlag, SimpleBoardInfo } from "./placement";

// --- Types ---
export type { RobotClass, BotTier } from "./types";

// --- Specialization tracks ---
export {
	TRACK_REGISTRY,
	getTracksForClass,
	getSpecializedActions,
	getAllTrackTechs,
} from "./specializations/trackRegistry";
export type { TrackEntry } from "./specializations/trackRegistry";

// --- Specialization track techs (consumed by config/techTreeDefs) ---
export { CAVALRY_TRACK_TECHS } from "./specializations/cavalryTracks";
export { INFANTRY_TRACK_TECHS } from "./specializations/infantryTracks";
export { RANGED_SPEC_TECHS } from "./specializations/rangedTracks";
export { SCOUT_TRACK_TECHS } from "./specializations/scoutTracks";
export { SUPPORT_TRACK_TECHS } from "./specializations/supportTracks";
export { WORKER_TRACK_TECHS } from "./specializations/workerTracks";
