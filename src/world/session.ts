import type { SaveGameRecord } from "../db/saveGames";
import type {
	CampaignStateRecord,
	CityInstanceRecord,
	ResourceStateRecord,
	WorldMapRecord,
	WorldPointOfInterestRecord,
	WorldTileRecord,
} from "../db/worldPersistence";
import type { NewGameConfig } from "./config";

export interface ActiveWorldSession {
	saveGame: SaveGameRecord;
	config: NewGameConfig;
	worldMap: WorldMapRecord;
	tiles: WorldTileRecord[];
	pointsOfInterest: WorldPointOfInterestRecord[];
	cityInstances: CityInstanceRecord[];
	campaignState: CampaignStateRecord;
	resourceState: ResourceStateRecord;
}

let activeWorldSession: ActiveWorldSession | null = null;

export function setActiveWorldSession(session: ActiveWorldSession) {
	activeWorldSession = session;
}

export function getActiveWorldSession() {
	return activeWorldSession;
}

export function requireActiveWorldSession() {
	if (!activeWorldSession) {
		throw new Error("No active world session is loaded.");
	}
	return activeWorldSession;
}

export function clearActiveWorldSession() {
	activeWorldSession = null;
}
