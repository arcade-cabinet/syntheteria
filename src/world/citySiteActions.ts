import { canEnterCitySite, canFoundCitySite } from "./cityLifecycle";
import {
	type CityPurposePresentation,
	describeCityState,
	getCityPurposePresentation,
} from "./cityPresentation";
import {
	type DistrictCapabilityViewModel,
	getDistrictCapabilities,
	summarizeDistrictCapabilities,
} from "./districtCapabilities";
import {
	type DistrictOperationViewModel,
	getDistrictOperations,
} from "./districtOperations";
import {
	type DistrictStructureViewModel,
	getDistrictStructuresFromSnapshots,
} from "./districtStructures";
import { getActiveWorldSession } from "./session";
import type { CityRuntimeSnapshot, NearbyPoiContext } from "./snapshots";

export interface CitySiteAction {
	id: "survey" | "found" | "enter" | "return";
	label: string;
	meta: string;
	variant: "primary" | "secondary";
}

export interface CitySiteViewModel {
	actionFlowSummary: string;
	actions: CitySiteAction[];
	capabilities: DistrictCapabilityViewModel[];
	capabilitySummary: string;
	operations: DistrictOperationViewModel[];
	structures: DistrictStructureViewModel[];
	canEnter: boolean;
	canFound: boolean;
	canSurvey: boolean;
	cityStatus: string;
	cityStatusMeta: string;
	presentation: CityPurposePresentation;
}

export function getCitySiteViewModel(args: {
	city: CityRuntimeSnapshot | null;
	context: NearbyPoiContext;
	mode: "world" | "city";
}): CitySiteViewModel {
	const { city, context, mode } = args;
	const presentation = getCityPurposePresentation(context.poiType);
	const canSurvey = city?.state === "latent";
	const canFound = city ? canFoundCitySite(context.poiType, city.state) : false;
	const canEnter = city ? canEnterCitySite(city.state) : false;
	const session = getActiveWorldSession();
	const persistedStructures = city
		? (session?.sectorStructures ?? []).filter(
				(structure) =>
					structure.anchor_key === `${city.world_q},${city.world_r}`,
			)
		: [];
	const structures = getDistrictStructuresFromSnapshots({
		poiType: context.poiType,
		state: city?.state ?? "latent",
		structures: persistedStructures,
	});
	const capabilities = getDistrictCapabilities({
		poiType: context.poiType,
		state: city?.state ?? "latent",
		structures,
	});
	const operations = getDistrictOperations({
		poiType: context.poiType,
		state: city?.state ?? "latent",
		structures,
	});
	const actions: CitySiteAction[] = [];

	if (canSurvey) {
		actions.push({
			id: "survey",
			label: presentation.surveyLabel,
			meta: "mark linked interior as surveyed",
			variant: "secondary",
		});
	}
	if (canFound) {
		actions.push({
			id: "found",
			label: presentation.foundationLabel,
			meta: "establish substation and claim district capability",
			variant: "primary",
		});
	}
	if (canEnter) {
		actions.push({
			id: "enter",
			label: presentation.enterLabel,
			meta: "transition into linked city",
			variant: "secondary",
		});
	}
	if (mode === "city") {
		actions.push({
			id: "return",
			label: "Return To World",
			meta: "restore outdoor scene",
			variant: "secondary",
		});
	}

	return {
		presentation,
		structures,
		capabilities,
		operations,
		capabilitySummary: summarizeDistrictCapabilities(capabilities, structures),
		canSurvey,
		canFound,
		canEnter,
		cityStatus: describeCityState(city?.state),
		cityStatusMeta: city
			? `Layout seed ${city.layout_seed} · ${city.generation_status}`
			: "No linked city instance.",
		actionFlowSummary:
			"Surveying commits a readable district layout to the archive. Establishing a substation upgrades the site into a controlled operational node. Entering transfers command relay into the denser district interior.",
		actions,
	};
}
