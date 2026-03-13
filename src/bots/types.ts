export type BotUnitType =
	| "maintenance_bot"
	| "utility_drone"
	| "feral_drone"
	| "fabrication_unit"
	| "field_fighter"
	| "mecha_scout"
	| "mecha_trooper"
	| "mecha_golem"
	| "quadruped_tank";

/** The 6 player-fabricable roles from BOT_AND_ECONOMY_REDESIGN */
export type PlayerBotRole =
	| "technician"
	| "scout"
	| "striker"
	| "fabricator"
	| "guardian"
	| "hauler";

/** The 3 hostile bot roles (hackable into player service) */
export type HostileBotRole = "cult_mech" | "rogue_sentinel" | "siege_engine";

export type BotArchetypeId =
	| "field_technician"
	| "relay_hauler"
	| "fabrication_rig"
	| "substation_engineer"
	| "foundry_seed"
	| "assault_strider"
	| "defense_sentry"
	| "feral_raider"
	| "cult_conduit";

export type BotTrackId =
	| "mobility"
	| "surveying"
	| "repair"
	| "relay"
	| "logistics"
	| "fabrication"
	| "founding"
	| "terrain"
	| "assault"
	| "defense";

export type BotSpeechProfile =
	| "mentor"
	| "scout"
	| "quartermaster"
	| "fabricator"
	| "warden"
	| "feral"
	| "cult";

export type BotSteeringProfile =
	| "biped_scout"
	| "aerial_support"
	| "heavy_ground"
	| "stationary"
	| "feral_quadruped"
	| "cult_channeler";

export type BotNavigationProfile =
	| "sector_surface_standard"
	| "sector_surface_heavy"
	| "sector_aerial"
	| "city_square_service";

export type BotRoleFamily =
	| "utility"
	| "logistics"
	| "industry"
	| "expansion"
	| "combat"
	| "hostile";

export type ChassisClass =
	| "light_biped"
	| "aerial_light"
	| "heavy_mobile"
	| "stationary_industrial"
	| "hostile_quadruped"
	| "human_channeler";

export interface UpgradeTrackDefinition {
	id: BotTrackId;
	label: string;
	description: string;
	baseBonus: number;
	logarithmicFactor: number;
	hardFloor?: number;
	primaryStats: string[];
}

export interface BotArchetypeDefinition {
	id: BotArchetypeId;
	label: string;
	description: string;
	chassisClass: ChassisClass;
	roleFamily: BotRoleFamily;
	defaultUnitType: BotUnitType;
	defaultSpeechProfile: BotSpeechProfile;
	startingMark: number;
	availableTracks: BotTrackId[];
	loreRole: string;
	startingUseCases: string[];
}

export interface BotIdentityProfile {
	archetypeId: BotArchetypeId;
	markLevel: number;
	speechProfile: BotSpeechProfile;
}

export interface BotDefinition {
	unitType: BotUnitType;
	label: string;
	description: string;
	model: string;
	scale: number;
	baseSpeed: number;
	powerDemand: number;
	movingPowerBonus: number;
	archetypeId: BotArchetypeId;
	defaultSpeechProfile: BotSpeechProfile;
	startingFaction: "player" | "feral" | "cultist" | "rogue";
	defaultAiRole: "player_unit" | "hostile_machine" | "cultist";
	steeringProfile: BotSteeringProfile;
	navigationProfile: BotNavigationProfile;
	/** Player role (6 roles) or hostile role (3 roles) */
	role: PlayerBotRole | HostileBotRole;
	/** What the Mark multiplier scales for this role */
	markScaling: string;
}

export interface BotRuntimeProfile extends BotIdentityProfile {
	unitType: BotUnitType;
	roleFamily: BotRoleFamily;
	chassisClass: ChassisClass;
	trackSummary: UpgradeTrackDefinition[];
}

export interface BotTrackRuntimeSummary {
	id: BotTrackId;
	label: string;
	currentLevel: number;
	currentMultiplier: number;
	nextLevelMultiplier: number;
	primaryStats: string[];
}

export interface BotProgressionSummary {
	unitType: BotUnitType;
	archetypeId: BotArchetypeId;
	markLevel: number;
	focusTrackId: BotTrackId;
	trackSummaries: BotTrackRuntimeSummary[];
}
