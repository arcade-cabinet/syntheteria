import type { ResourcePool } from "../systems/resources";
import type { NearbyPoiContext, SceneMode } from "./snapshots";

export type RuntimeState = {
	activeCityInstanceId: number | null;
	activeScene: SceneMode;
	cityKitLabOpen: boolean;
	citySiteModalOpen: boolean;
	citySiteModalContext: NearbyPoiContext | null;
	currentTick: number;
	nearbyPoi: NearbyPoiContext | null;
	resources: ResourcePool;
};
