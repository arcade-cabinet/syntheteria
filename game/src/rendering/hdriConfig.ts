/**
 * HDRI environment configuration for Syntheteria.
 *
 * HDRIs are selected for the industrial, storm-ravaged machine planet aesthetic.
 * The active HDRI can change based on storm intensity and game time-of-day.
 *
 * Source library: /Volumes/home/assets/2DPhotorealistic/HDRI/1K/
 * All files are 1K EXR sky-only domes (no ground geometry).
 */

export interface HdriPreset {
	/** Display name for debug/UI */
	label: string;
	/** Path relative to public/ */
	file: string;
	/** Background skybox intensity (0-1+). Lower = darker sky. */
	backgroundIntensity: number;
	/** Environment lighting intensity for scene objects */
	environmentIntensity: number;
}

/**
 * Available HDRI presets.
 *
 * - storm_overcast:  DaySkyHDRI020B — Heavy dark storm clouds, primary look
 * - storm_dramatic:  EveningSkyHDRI030B — Ominous thunderstorm glow
 * - overcast_heavy:  DaySkyHDRI021B — Thick overcast, sun barely visible
 * - evening_cloudy:  EveningSkyHDRI001B — Dramatic evening cloud formations
 * - night_hazy:      NightSkyHDRI005 — Hazy moonlit night with city glow
 */
export const HDRI_PRESETS = {
	storm_overcast: {
		label: "Storm Overcast",
		file: "/textures/hdri/storm_overcast.exr",
		backgroundIntensity: 0.4,
		environmentIntensity: 0.8,
	},
	storm_dramatic: {
		label: "Storm Dramatic",
		file: "/textures/hdri/storm_dramatic.exr",
		backgroundIntensity: 0.35,
		environmentIntensity: 0.7,
	},
	overcast_heavy: {
		label: "Overcast Heavy",
		file: "/textures/hdri/overcast_heavy.exr",
		backgroundIntensity: 0.5,
		environmentIntensity: 0.9,
	},
	evening_cloudy: {
		label: "Evening Cloudy",
		file: "/textures/hdri/evening_cloudy.exr",
		backgroundIntensity: 0.3,
		environmentIntensity: 0.6,
	},
	night_hazy: {
		label: "Night Hazy",
		file: "/textures/hdri/night_hazy.exr",
		backgroundIntensity: 0.15,
		environmentIntensity: 0.3,
	},
	day_industrial_003: {
		label: "Day Industrial 003",
		file: "/textures/hdri/DayEnvironmentHDRI003_1K_HDR.exr",
		backgroundIntensity: 0.6,
		environmentIntensity: 1.0,
	},
	day_industrial_007: {
		label: "Day Industrial 007",
		file: "/textures/hdri/DayEnvironmentHDRI007_1K_HDR.exr",
		backgroundIntensity: 0.55,
		environmentIntensity: 0.95,
	},
	day_industrial_011: {
		label: "Day Industrial 011",
		file: "/textures/hdri/DayEnvironmentHDRI011_1K_HDR.exr",
		backgroundIntensity: 0.5,
		environmentIntensity: 0.9,
	},
	day_industrial_015: {
		label: "Day Industrial 015",
		file: "/textures/hdri/DayEnvironmentHDRI015_1K_HDR.exr",
		backgroundIntensity: 0.55,
		environmentIntensity: 0.95,
	},
} as const satisfies Record<string, HdriPreset>;

export type HdriPresetKey = keyof typeof HDRI_PRESETS;

/** Default HDRI — the primary stormy industrial look */
export const DEFAULT_HDRI: HdriPresetKey = "storm_overcast";

/**
 * Select HDRI preset based on storm intensity.
 * Higher storm intensity = more dramatic sky.
 *
 * @param stormIntensity - 0.0 to 1.5 (from power system)
 * @returns The preset key to use
 */
export function getHdriForStormIntensity(
	stormIntensity: number,
): HdriPresetKey {
	if (stormIntensity >= 1.2) return "storm_dramatic";
	if (stormIntensity >= 0.9) return "storm_overcast";
	if (stormIntensity >= 0.6) return "overcast_heavy";
	if (stormIntensity >= 0.3) return "evening_cloudy";
	return "day_industrial_003";
}
