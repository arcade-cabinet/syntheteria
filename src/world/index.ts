/**
 * @package world
 *
 * New-game configuration types and defaults.
 */

export {
	DEFAULT_NEW_GAME_CONFIG,
	SECTOR_SCALE_SPECS,
	DIFFICULTY_LABELS,
	CLIMATE_PROFILE_SPECS,
	STORM_PROFILE_SPECS,
	createNewGameConfig,
	getPlayerFactionId,
	getSectorScaleSpec,
	getClimateProfileSpec,
	getStormProfileSpec,
} from "./config";
export type {
	SectorScale,
	Difficulty,
	ClimateProfile,
	StormProfile,
	FactionSlot,
	NewGameConfig,
	SectorScaleSpec,
	ClimateProfileSpec,
	StormProfileSpec,
} from "./config";
