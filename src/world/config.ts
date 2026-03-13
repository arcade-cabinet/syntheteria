export type SectorScale = "small" | "standard" | "large";
export type Difficulty = "story" | "standard" | "hard";
export type ClimateProfile = "temperate" | "wet" | "arid" | "frozen";
export type StormProfile = "stable" | "volatile" | "cataclysmic";

export interface NewGameConfig {
	worldSeed: number;
	sectorScale: SectorScale;
	difficulty: Difficulty;
	climateProfile: ClimateProfile;
	stormProfile: StormProfile;
}

export interface SectorScaleSpec {
	width: number;
	height: number;
	label: string;
	description: string;
}

export interface ClimateProfileSpec {
	label: string;
	description: string;
	waterLevel: number;
	sandLevel: number;
	mountainLevel: number;
	grassMoistureLevel: number;
	elevationBias: number;
	moistureBias: number;
}

export interface StormProfileSpec {
	label: string;
	description: string;
	baseStormIntensity: number;
	stormOscillation: number;
	stormSurgeMax: number;
}

export const DEFAULT_NEW_GAME_CONFIG: Omit<NewGameConfig, "worldSeed"> = {
	sectorScale: "standard",
	difficulty: "standard",
	climateProfile: "temperate",
	stormProfile: "volatile",
};

export const SECTOR_SCALE_SPECS: Record<SectorScale, SectorScaleSpec> = {
	small: {
		width: 28,
		height: 28,
		label: "Small",
		description: "Fast start, tighter district lattice, shorter campaigns.",
	},
	standard: {
		width: 40,
		height: 40,
		label: "Standard",
		description: "Default intended experience with balanced district breadth.",
	},
	large: {
		width: 56,
		height: 56,
		label: "Large",
		description:
			"Broader machine-world, slower expansion, wider sector variety.",
	},
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
	story: "Story",
	standard: "Standard",
	hard: "Hard",
};

export const CLIMATE_PROFILE_SPECS: Record<ClimateProfile, ClimateProfileSpec> =
	{
		temperate: {
			label: "Temperate",
			description: "Balanced coastlines, meadow belts, and moderate uplands.",
			waterLevel: 0.35,
			sandLevel: 0.45,
			mountainLevel: 0.7,
			grassMoistureLevel: 0.5,
			elevationBias: 0,
			moistureBias: 0,
		},
		wet: {
			label: "Wet",
			description: "Floodplains, broad rivers, and saturated grasslands.",
			waterLevel: 0.4,
			sandLevel: 0.5,
			mountainLevel: 0.74,
			grassMoistureLevel: 0.42,
			elevationBias: -0.03,
			moistureBias: 0.16,
		},
		arid: {
			label: "Arid",
			description: "Dry basins, canyon margins, and sparse green zones.",
			waterLevel: 0.28,
			sandLevel: 0.58,
			mountainLevel: 0.72,
			grassMoistureLevel: 0.7,
			elevationBias: 0.04,
			moistureBias: -0.2,
		},
		frozen: {
			label: "Frozen",
			description: "Cold waters, exposed ridgelines, and austere plains.",
			waterLevel: 0.38,
			sandLevel: 0.46,
			mountainLevel: 0.64,
			grassMoistureLevel: 0.58,
			elevationBias: 0.06,
			moistureBias: -0.05,
		},
	};

export const STORM_PROFILE_SPECS: Record<StormProfile, StormProfileSpec> = {
	stable: {
		label: "Stable",
		description: "Calmer cycles with fewer extreme surges.",
		baseStormIntensity: 0.55,
		stormOscillation: 0.14,
		stormSurgeMax: 0.16,
	},
	volatile: {
		label: "Volatile",
		description: "Default storm pressure with recurring surges.",
		baseStormIntensity: 0.7,
		stormOscillation: 0.2,
		stormSurgeMax: 0.3,
	},
	cataclysmic: {
		label: "Cataclysmic",
		description: "Violent arcs and sustained infrastructure stress.",
		baseStormIntensity: 0.92,
		stormOscillation: 0.28,
		stormSurgeMax: 0.42,
	},
};

export function createNewGameConfig(
	worldSeed: number,
	overrides: Partial<Omit<NewGameConfig, "worldSeed">> = {},
): NewGameConfig {
	return {
		worldSeed: worldSeed >>> 0,
		...DEFAULT_NEW_GAME_CONFIG,
		...overrides,
	};
}

export function getSectorScaleSpec(sectorScale: SectorScale) {
	return SECTOR_SCALE_SPECS[sectorScale];
}

export function getClimateProfileSpec(climateProfile: ClimateProfile) {
	return CLIMATE_PROFILE_SPECS[climateProfile];
}

export function getStormProfileSpec(stormProfile: StormProfile) {
	return STORM_PROFILE_SPECS[stormProfile];
}
