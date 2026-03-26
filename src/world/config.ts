/**
 * World configuration — climate profiles used by the labyrinth generator.
 *
 * Ported from feature branch src/world/config.ts — only the parts needed
 * by the board generator.
 */

export type ClimateProfile = "temperate" | "wet" | "arid" | "frozen";

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

export const CLIMATE_PROFILE_SPECS: Record<ClimateProfile, ClimateProfileSpec> =
	{
		temperate: {
			label: "Coastal",
			description:
				"Shoreline sector. Ecumenopolis meets ocean zones along one margin.",
			waterLevel: 0.35,
			sandLevel: 0.45,
			mountainLevel: 0.7,
			grassMoistureLevel: 0.5,
			elevationBias: 0,
			moistureBias: 0,
		},
		wet: {
			label: "Archipelago",
			description:
				"Island megastructures scattered across abyssal platform grating.",
			waterLevel: 0.55,
			sandLevel: 0.5,
			mountainLevel: 0.74,
			grassMoistureLevel: 0.42,
			elevationBias: -0.03,
			moistureBias: 0.16,
		},
		arid: {
			label: "Inland",
			description:
				"Deep continental coverage. Vast unbroken ecumenopolis, minimal abyssal zones.",
			waterLevel: 0.15,
			sandLevel: 0.58,
			mountainLevel: 0.72,
			grassMoistureLevel: 0.7,
			elevationBias: 0.04,
			moistureBias: -0.2,
		},
		frozen: {
			label: "Strait",
			description:
				"Twin landmasses divided by a deep ocean channel under steel grating.",
			waterLevel: 0.45,
			sandLevel: 0.46,
			mountainLevel: 0.64,
			grassMoistureLevel: 0.58,
			elevationBias: 0.06,
			moistureBias: -0.05,
		},
	};
