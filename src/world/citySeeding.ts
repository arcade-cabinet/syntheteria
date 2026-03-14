/**
 * City seeding — creates initial city instance records from POIs.
 *
 * Separate from terrain generation and POI placement.
 * Each POI gets a city seed with a layout seed for future generation.
 */

import type { CityGenerationStatus, CityInstanceState } from "./contracts";
import { DEFAULT_CITY_GENERATION_STATUS } from "./contracts";
import type { GeneratedSectorPointOfInterest } from "./poiPlacement";

export interface GeneratedCityInstanceSeed {
	poiType: string;
	name: string;
	worldQ: number;
	worldR: number;
	layoutSeed: number;
	generationStatus: CityGenerationStatus;
	state: CityInstanceState;
}

function mulberry32(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};
}

/**
 * Create city instance seeds from placed POIs.
 * Each POI becomes a potential city site.
 */
export function seedCityInstances(
	pois: GeneratedSectorPointOfInterest[],
	worldSeed: number,
): GeneratedCityInstanceSeed[] {
	const rng = mulberry32(worldSeed * 6271 + 17);

	return pois.map((poi) => ({
		poiType: poi.type,
		name: poi.name,
		worldQ: poi.q,
		worldR: poi.r,
		layoutSeed: Math.floor(rng() * 0xffffffff) ^ worldSeed,
		generationStatus: DEFAULT_CITY_GENERATION_STATUS,
		state: poi.type === "home_base" ? ("founded" as const) : ("latent" as const),
	}));
}
