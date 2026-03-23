import { applyFoundingToCity, applySurveyToCity } from "./cityLifecycle";
import { syncActiveWorldSessionState } from "./cityTransition";
import { requireActiveWorldSession } from "./session";

function getCityForPoi(cityInstanceId: number) {
	const session = requireActiveWorldSession();
	const city = session.cityInstances.find(
		(candidate) => candidate.id === cityInstanceId,
	);
	if (!city) {
		throw new Error(`City instance ${cityInstanceId} does not exist.`);
	}
	return city;
}

export function surveyCitySite(cityInstanceId: number) {
	const city = getCityForPoi(cityInstanceId);
	const previousState = city.state;
	applySurveyToCity(city);
	if (city.state !== previousState) {
		syncActiveWorldSessionState();
	}
	return city;
}

export function foundCitySite(cityInstanceId: number) {
	const city = getCityForPoi(cityInstanceId);
	const previousState = city.state;
	applyFoundingToCity(city);
	if (city.state !== previousState) {
		syncActiveWorldSessionState();
	}
	return city;
}
