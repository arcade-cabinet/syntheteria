/**
 * @package config
 *
 * All game data files — tunables, tech tree, recipes, movement, diplomacy, etc.
 * Config is data, not code. No logic beyond simple lookups.
 */

// --- Game defaults ---
export {
	TILE_SIZE_M,
	ELEVATION_STEP_M,
	DEFAULT_DIFFICULTY,
	UNIT_MOVE_SPEED,
	PLAYER_MAX_AP,
	PLAYER_SENTINEL_HP,
	HIGHLIGHT_EMISSIVE,
	SELECT_EMISSIVE,
	HIGHLIGHT_COLOR,
	INITIAL_SCAN_RANGE,
	UNIT_WIDTH,
	UNIT_HEIGHT,
	UNIT_DEPTH,
	PLAYER_UNIT_COLOR,
	DEFAULT_AI_UNIT_COLOR,
	FACTION_COLORS,
	FACTION_COLORS_CSS,
	CAMERA_Y,
	CAMERA_Z_OFFSET,
	CAMERA_FOV,
	DIFFICULTIES,
	TERRITORY_UNIT_RADIUS,
	TERRITORY_BUILDING_RADIUS,
	VICTORY_DOMINATION_PERCENT,
	VICTORY_RESEARCH_LABS,
	VICTORY_RESEARCH_POINTS,
	VICTORY_ECONOMIC_TOTAL,
	VICTORY_SURVIVAL_TURNS,
	DIPLOMACY_PEACE_DRIFT_TURNS,
	DIPLOMACY_BACKSTAB_DELAY,
	STANDING_THRESHOLDS,
	STANDING_CHANGES,
	STANDING_DISPLAY,
	TRADE_INCOME_SHARE_PERCENT,
	BREAK_TRADE_PENALTY,
	BREAK_ALLIANCE_PENALTY,
	STANDING_DECAY_PER_TURN,
	CULT_FINAL_ASSAULT_TURN,
	CULT_FINAL_ASSAULT_MULTIPLIER,
	FORCED_DOMINATION_HOLD_TURNS,
	FORCED_DOMINATION_PERCENT,
	WORMHOLE_PROJECT_TURNS,
} from "./gameDefaults";

// --- Building blueprints ---
export { BUILDING_BLUEPRINTS, getBuildingDisplayName } from "./buildingDefs";
export type { BuildingComponent, BuildingBlueprint } from "./buildingDefs";

// --- Diplomacy ---
export {
	STANDING_TIERS,
	getStandingTier,
	STANDING_CHANGES as DIPLO_STANDING_CHANGES,
	TRADE_INCOME_SHARE_PERCENT as DIPLO_TRADE_SHARE,
	ALLIANCE_FOG_SHARING,
	WAR_BORDER_CONTEST_RADIUS,
	BREAK_TRADE_PENALTY as DIPLO_BREAK_TRADE,
	BREAK_ALLIANCE_PENALTY as DIPLO_BREAK_ALLIANCE,
	STANDING_DECAY_PER_TURN as DIPLO_STANDING_DECAY,
} from "./diplomacyDefs";
export type { StandingTier, StandingTierName, StandingAction } from "./diplomacyDefs";

// --- Faction AI ---
export { FACTION_AI_BIASES, FACTION_AI_IDS, getDominantBias } from "./factionAiDefs";
export type { FactionAiBias } from "./factionAiDefs";

// --- Movement ---
export {
	MOVEMENT_PROFILES,
	computeMaxMp,
	getMovementProfile,
	canUnitMove,
	canUnitAct,
	maxMoveDistance,
} from "./movementDefs";
export type { MovementProfile } from "./movementDefs";

// --- Narrative ---
export { NARRATIVE_THOUGHTS, THOUGHT_BY_ID, getThoughtsForTrigger } from "./narrativeDefs";
export type { ThoughtTriggerType, ThoughtTrigger, NarrativeThought } from "./narrativeDefs";

// --- POI ---
export {
	POI_DISCOVERY_RADIUS,
	POI_DISCOVERY_FRINGE_RADIUS,
	FOUNDABLE_POI_TYPES,
	POI_DEFINITIONS,
	POI_BY_TYPE,
	poiToTile,
} from "./poiDefs";
export type { POIType, POIDef } from "./poiDefs";

// --- Recipes ---
export { COMPONENT_RECIPES, RECIPE_BY_ID, getRecipeCostMap } from "./recipeDefs";
export type { ComponentRecipe } from "./recipeDefs";

// --- Tech tree ---
export { TECH_TREE, TECH_BY_ID, getTechsByTier } from "./techTreeDefs";
export type { TechEffectType, TechEffect, TechDef } from "./techTreeDefs";

// --- Upgrades ---
export {
	MAX_MARK_LEVEL as UPGRADE_MAX_MARK,
	MARK_LEVEL_COSTS,
	MARK_UPGRADE_TICKS,
	MOTOR_POOL_TIERS,
	UPGRADE_ADJACENCY_RANGE,
} from "./upgradeDefs";
export type { MarkLevelCost, MotorPoolTier, MotorPoolTierDef } from "./upgradeDefs";

// --- Weather ---
export {
	WEATHER_VISIBILITY,
	POWER_GENERATION,
	CULTIST_ACTIVITY,
	REPAIR_SPEED,
	STORM_VISUAL_PARAMS,
	WORMHOLE_CYCLE,
} from "./weatherDefs";
export type { StormVisualParams } from "./weatherDefs";
