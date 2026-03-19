/**
 * @package world
 *
 * New-game configuration types and defaults.
 */

export type {
	ClimateProfile,
	ClimateProfileSpec,
	Difficulty,
	FactionSlot,
	NewGameConfig,
	SectorScale,
	SectorScaleSpec,
	StormProfile,
	StormProfileSpec,
} from "./config";
export {
	CLIMATE_PROFILE_SPECS,
	createNewGameConfig,
	DEFAULT_NEW_GAME_CONFIG,
	DIFFICULTY_LABELS,
	getClimateProfileSpec,
	getPlayerFactionId,
	getSectorScaleSpec,
	getStormProfileSpec,
	SECTOR_SCALE_SPECS,
	STORM_PROFILE_SPECS,
} from "./config";
