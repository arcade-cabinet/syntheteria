export type SectorScale = "small" | "standard" | "large";
export type Difficulty = "story" | "standard" | "hard";
export type ClimateProfile = "temperate" | "wet" | "arid" | "frozen";
export type StormProfile = "stable" | "volatile" | "cataclysmic";

/** Per-faction slot in New Game setup. */
export interface FactionSlot {
	factionId: string;
	role: "player" | "ai" | "off";
}

export interface NewGameConfig {
	worldSeed: number;
	sectorScale: SectorScale;
	difficulty: Difficulty;
	climateProfile: ClimateProfile;
	stormProfile: StormProfile;
	/** All four factions — each set to player, ai, or off. Cults are always present. */
	factions: FactionSlot[];
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
	stormProfile: "cataclysmic",
	factions: [
		{ factionId: "reclaimers", role: "player" },
		{ factionId: "volt_collective", role: "ai" },
		{ factionId: "signal_choir", role: "ai" },
		{ factionId: "iron_creed", role: "ai" },
	],
};

export const SECTOR_SCALE_SPECS: Record<SectorScale, SectorScaleSpec> = {
	small: {
		width: 44,
		height: 44,
		label: "Small",
		description: "Shorter campaign. ~2,000 tiles.",
	},
	standard: {
		width: 64,
		height: 64,
		label: "Standard",
		description: "Balanced campaign. ~4,000 tiles.",
	},
	large: {
		width: 96,
		height: 96,
		label: "Large",
		description: "Epic campaign. ~9,000 tiles.",
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
			label: "Coastal",
			description: "Shoreline sector. Ecumenopolis meets sealed ocean along one margin.",
			waterLevel: 0.35,
			sandLevel: 0.45,
			mountainLevel: 0.7,
			grassMoistureLevel: 0.5,
			elevationBias: 0,
			moistureBias: 0,
		},
		wet: {
			label: "Archipelago",
			description: "Island megastructures scattered across abyssal platform grating.",
			waterLevel: 0.55,
			sandLevel: 0.5,
			mountainLevel: 0.74,
			grassMoistureLevel: 0.42,
			elevationBias: -0.03,
			moistureBias: 0.16,
		},
		arid: {
			label: "Inland",
			description: "Deep continental coverage. Vast unbroken ecumenopolis, minimal abyssal zones.",
			waterLevel: 0.15,
			sandLevel: 0.58,
			mountainLevel: 0.72,
			grassMoistureLevel: 0.7,
			elevationBias: 0.04,
			moistureBias: -0.2,
		},
		frozen: {
			label: "Strait",
			description: "Twin landmasses divided by a deep ocean channel under steel grating.",
			waterLevel: 0.45,
			sandLevel: 0.46,
			mountainLevel: 0.64,
			grassMoistureLevel: 0.58,
			elevationBias: 0.06,
			moistureBias: -0.05,
		},
	};

export const STORM_PROFILE_SPECS: Record<StormProfile, StormProfileSpec> = {
	stable: {
		label: "Calm",
		description: "Minimal storm cycling. Infrastructure stress manageable.",
		baseStormIntensity: 0.55,
		stormOscillation: 0.14,
		stormSurgeMax: 0.16,
	},
	volatile: {
		label: "Active",
		description: "Regular hypercane pressure with recurring surges.",
		baseStormIntensity: 0.7,
		stormOscillation: 0.2,
		stormSurgeMax: 0.3,
	},
	cataclysmic: {
		label: "Catastrophic",
		description: "Violent hypercane arcs and sustained infrastructure collapse.",
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

/** Return the factionId of the player-controlled faction, or null if observer mode. */
export function getPlayerFactionId(config: NewGameConfig): string | null {
	return config.factions.find((f) => f.role === "player")?.factionId ?? null;
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
