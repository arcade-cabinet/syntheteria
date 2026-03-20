/**
 * @package config
 *
 * All game data files — tunables, tech tree, recipes, movement, diplomacy, etc.
 * Config is data, not code. No logic beyond simple lookups.
 */

export type { BuildingBlueprint, BuildingComponent } from "./buildingDefs";
// --- Building blueprints ---
export { BUILDING_BLUEPRINTS, getBuildingDisplayName } from "./buildingDefs";
// --- Building definitions (data) ---
export type {
	BuildingDef,
	CultStructureDef,
	CultStructureType,
} from "./buildings";
export { BUILDING_DEFS, CULT_STRUCTURE_DEFS } from "./buildings";
// --- Building unlock chains ---
export type {
	BuildingTierDef,
	BuildingUnlockDef,
} from "./buildingUnlockDefs";
export {
	BUILDING_UNLOCK_CHAINS,
	isBuildingUnlocked,
	MOTOR_POOL_MARK_TIERS,
	MOTOR_POOL_UNIT_TIERS,
	STARTER_BUILDINGS,
} from "./buildingUnlockDefs";
export type {
	StandingAction,
	StandingTier,
	StandingTierName,
} from "./diplomacyDefs";
// --- Diplomacy ---
export {
	ALLIANCE_FOG_SHARING,
	BREAK_ALLIANCE_PENALTY as DIPLO_BREAK_ALLIANCE,
	BREAK_TRADE_PENALTY as DIPLO_BREAK_TRADE,
	getStandingTier,
	STANDING_CHANGES as DIPLO_STANDING_CHANGES,
	STANDING_DECAY_PER_TURN as DIPLO_STANDING_DECAY,
	STANDING_TIERS,
	TRADE_INCOME_SHARE_PERCENT as DIPLO_TRADE_SHARE,
	WAR_BORDER_CONTEST_RADIUS,
} from "./diplomacyDefs";
export type { EpochDef, EpochId } from "./epochDefs";
// --- Epochs ---
export {
	computeEpoch,
	EPOCH_BY_ID,
	EPOCHS,
	getEpochByNumber,
	getEpochForTechTier,
	TECH_TIER_TO_EPOCH,
} from "./epochDefs";
export type { FactionAiBias } from "./factionAiDefs";
// --- Faction AI ---
export {
	FACTION_AI_BIASES,
	FACTION_AI_IDS,
	getDominantBias,
} from "./factionAiDefs";
// --- Game defaults ---
export {
	BREAK_ALLIANCE_PENALTY,
	BREAK_TRADE_PENALTY,
	CAMERA_FOV,
	CAMERA_Y,
	CAMERA_Z_OFFSET,
	CULT_FINAL_ASSAULT_MULTIPLIER,
	CULT_FINAL_ASSAULT_TURN,
	DEFAULT_AI_UNIT_COLOR,
	DEFAULT_DIFFICULTY,
	DIFFICULTIES,
	DIPLOMACY_BACKSTAB_DELAY,
	DIPLOMACY_PEACE_DRIFT_TURNS,
	ELEVATION_STEP_M,
	FACTION_COLORS_CSS,
	FORCED_DOMINATION_HOLD_TURNS,
	FORCED_DOMINATION_PERCENT,
	HIGHLIGHT_COLOR,
	HIGHLIGHT_EMISSIVE,
	INITIAL_SCAN_RANGE,
	PLAYER_MAX_AP,
	PLAYER_SENTINEL_HP,
	PLAYER_UNIT_COLOR,
	SELECT_EMISSIVE,
	STANDING_CHANGES,
	STANDING_DECAY_PER_TURN,
	STANDING_DISPLAY,
	STANDING_THRESHOLDS,
	TERRITORY_BUILDING_RADIUS,
	TERRITORY_UNIT_RADIUS,
	TILE_SIZE_M,
	TRADE_INCOME_SHARE_PERCENT,
	UNIT_DEPTH,
	UNIT_HEIGHT,
	UNIT_MOVE_SPEED,
	UNIT_WIDTH,
	VICTORY_DOMINATION_PERCENT,
	VICTORY_ECONOMIC_TOTAL,
	VICTORY_RESEARCH_LABS,
	VICTORY_RESEARCH_POINTS,
	VICTORY_SURVIVAL_TURNS,
	WORMHOLE_PROJECT_TURNS,
} from "./gameDefaults";
// --- Model paths + 3D GLB resolvers (extends FACTION_COLORS for all factions) ---
export * from "./models";
export type { MovementProfile } from "./movementDefs";
// --- Movement ---
export {
	canUnitAct,
	canUnitMove,
	computeMaxMp,
	getMovementProfile,
	MOVEMENT_PROFILES,
	maxMoveDistance,
} from "./movementDefs";
export type {
	NarrativeThought,
	ThoughtTrigger,
	ThoughtTriggerType,
} from "./narrativeDefs";
// --- Narrative ---
export {
	getThoughtsForTrigger,
	NARRATIVE_THOUGHTS,
	THOUGHT_BY_ID,
} from "./narrativeDefs";
export type { POIDef, POIType } from "./poiDefs";
// --- POI ---
export {
	FOUNDABLE_POI_TYPES,
	POI_BY_TYPE,
	POI_DEFINITIONS,
	POI_DISCOVERY_FRINGE_RADIUS,
	POI_DISCOVERY_RADIUS,
	poiToTile,
} from "./poiDefs";
export type { ComponentRecipe } from "./recipeDefs";
// --- Recipes ---
export {
	COMPONENT_RECIPES,
	getRecipeCostMap,
	RECIPE_BY_ID,
} from "./recipeDefs";
// --- Resource / salvage definitions (data) ---
export type { SalvageDef, YieldRange } from "./resources";
export {
	getAllSalvageModelIds,
	getSalvageTypeForModel,
	SALVAGE_DEFS,
} from "./resources";
export type { TechDef, TechEffect, TechEffectType } from "./techTreeDefs";
// --- Tech tree ---
export { getTechsByTier, TECH_BY_ID, TECH_TREE } from "./techTreeDefs";
export type {
	MarkLevelCost,
	MotorPoolTier,
	MotorPoolTierDef,
} from "./upgradeDefs";
// --- Upgrades ---
export {
	MARK_LEVEL_COSTS,
	MARK_UPGRADE_TICKS,
	MAX_MARK_LEVEL as UPGRADE_MAX_MARK,
	MOTOR_POOL_TIERS,
	UPGRADE_ADJACENCY_RANGE,
} from "./upgradeDefs";
export type { StormVisualParams } from "./weatherDefs";
// --- Weather ---
export {
	CULTIST_ACTIVITY,
	POWER_GENERATION,
	REPAIR_SPEED,
	STORM_VISUAL_PARAMS,
	WEATHER_VISIBILITY,
	WORMHOLE_CYCLE,
} from "./weatherDefs";
