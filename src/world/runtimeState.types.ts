import type { ResourcePool } from "../systems/resources";
import type { NearbyPoiContext, SceneMode } from "./snapshots";

export interface DistrictOperationEvent {
	id: string;
	cityInstanceId: number | null;
	label: string;
	description: string;
	operationId: string;
	tick: number;
}

export type RuntimeState = {
	activeCityInstanceId: number | null;
	activeScene: SceneMode;
	cityKitLabOpen: boolean;
	citySiteModalOpen: boolean;
	citySiteModalContext: NearbyPoiContext | null;
	currentTick: number;
	districtEvents: DistrictOperationEvent[];
	nearbyPoi: NearbyPoiContext | null;
	resources: ResourcePool;
};
