import {
	CITY_MODELS,
	getCityModelById,
	selectZoneModel,
} from "./catalog/cityCatalog";
import type { CityZone } from "./config/types";
import type { CityEdgeDirection } from "./topology";

export type CityAssetFamily =
	| "floor"
	| "wall"
	| "door"
	| "roof"
	| "prop"
	| "detail"
	| "column"
	| "stair"
	| "utility";

export type EdgeDirection = CityEdgeDirection;

export interface CityModuleAsset {
	id: string;
	family: CityAssetFamily;
	sourceAsset: string;
	validZones: CityZone[];
	passable: boolean;
	placement: "cell" | "edge";
	tags: string[];
}

export const CITY_MODULE_ASSETS: readonly CityModuleAsset[] = CITY_MODELS.map(
	(model) => ({
		id: model.id,
		family: model.family,
		sourceAsset: model.sourceAssetPath,
		validZones: model.zoneAffinity,
		passable:
			model.passabilityEffect === "walkable" ||
			model.passabilityEffect === "portal" ||
			model.passabilityEffect === "vertical_connector",
		placement: model.placementType === "edge" ? "edge" : "cell",
		tags: model.tags,
	}),
);

export function getCityAssetsForZone(zone: CityZone, family: CityAssetFamily) {
	const direct = CITY_MODULE_ASSETS.filter(
		(asset) => asset.family === family && asset.validZones.includes(zone),
	);
	if (direct.length > 0) {
		return direct;
	}
	const selected = selectZoneModel(zone, family);
	return selected
		? [
				{
					id: selected.id,
					family: selected.family,
					sourceAsset: selected.sourceAssetPath,
					validZones: selected.zoneAffinity,
					passable:
						selected.passabilityEffect === "walkable" ||
						selected.passabilityEffect === "portal" ||
						selected.passabilityEffect === "vertical_connector",
					placement: selected.placementType === "edge" ? "edge" : "cell",
					tags: selected.tags,
				},
			]
		: [];
}

export { getCityModelById };
