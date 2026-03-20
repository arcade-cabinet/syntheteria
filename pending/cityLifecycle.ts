import type { CityInstanceRecord } from "../db/worldPersistence";
import {
	type CityInstanceState,
	DEFAULT_CITY_GENERATION_STATUS,
	isFoundableCityPoiType,
	type WorldPoiType,
} from "./contracts";

export function getInitialCityState(poiType: WorldPoiType): CityInstanceState {
	return poiType === "home_base" ? "founded" : "latent";
}

export function surveyCityState(state: CityInstanceState): CityInstanceState {
	return state === "latent" ? "surveyed" : state;
}

export function foundCityState(state: CityInstanceState): CityInstanceState {
	if (state === "founded") {
		return state;
	}
	return "founded";
}

export function enterCityState(state: CityInstanceState): CityInstanceState {
	return surveyCityState(state);
}

export function canFoundCitySite(
	poiType: WorldPoiType,
	state: CityInstanceState,
): boolean {
	return isFoundableCityPoiType(poiType) && state !== "founded";
}

export function canEnterCitySite(state: CityInstanceState): boolean {
	return state !== "latent";
}

export function createGeneratedCitySeed(
	poiType: WorldPoiType,
	name: string,
	worldQ: number,
	worldR: number,
	layoutSeed: number,
) {
	return {
		poiType,
		name,
		worldQ,
		worldR,
		layoutSeed,
		state: getInitialCityState(poiType),
		generationStatus: DEFAULT_CITY_GENERATION_STATUS,
	} as const;
}

export function applySurveyToCity(city: CityInstanceRecord) {
	city.state = surveyCityState(city.state);
	return city;
}

export function applyFoundingToCity(city: CityInstanceRecord) {
	city.state = foundCityState(city.state);
	return city;
}

export function applyEntryToCity(city: CityInstanceRecord) {
	city.state = enterCityState(city.state);
	return city;
}
