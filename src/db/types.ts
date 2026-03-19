export interface GameRecord {
	id: string;
	seed: string;
	boardW: number;
	boardH: number;
	tileSizeM: number;
	difficulty: "easy" | "normal" | "hard";
	turn: number;
	climateProfile: string;
	stormProfile: string;
	gameDifficulty: string;
	factionSlots: string;
	createdAt: string;
	updatedAt: string;
}

export interface TileRecord {
	gameId: string;
	x: number;
	z: number;
	zone?: string;
	elevation: number;
	passable: boolean;
}

export interface TileResourceRecord {
	gameId: string;
	x: number;
	z: number;
	resourceType: string;
	amount: number;
	depleted: boolean;
}

export interface UnitRecord {
	id: string;
	gameId: string;
	factionId: string;
	tileX: number;
	tileZ: number;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
	mp: number;
	maxMp: number;
	modelId: string;
	/** Specialization track ID. Empty = unspecialized. */
	trackId?: string;
	/** Track version: 1 = base, 2 = upgraded. */
	trackVersion?: 1 | 2;
}

export interface BuildingRecord {
	id: string;
	gameId: string;
	factionId: string;
	tileX: number;
	tileZ: number;
	type: string;
	hp: number;
	maxHp: number;
}

export interface ExploredRecord {
	gameId: string;
	tileX: number;
	tileZ: number;
	explored: boolean;
	visibility: number;
}

export interface ResourceRecord {
	gameId: string;
	factionId: string;
	material: string;
	amount: number;
}

export interface EventRecord {
	gameId: string;
	turn: number;
	type: string;
	payload: unknown;
}

export interface GameSummary {
	id: string;
	seed: string;
	boardW: number;
	boardH: number;
	difficulty: string;
	turn: number;
	createdAt: string;
}

// ─── Analytics Records ──────────────────────────────────────────────────────

export interface CampaignStatisticsRecord {
	gameId: string;
	statsJson: string;
	updatedAt: string;
}

export interface TurnEventLogRecord {
	gameId: string;
	turn: number;
	eventsJson: string;
}

export interface FactionResourceSnapshotRecord {
	gameId: string;
	turn: number;
	factionId: string;
	resourcesJson: string;
}

/** Per-faction counts within a turn snapshot. */
export interface FactionSnapshotData {
	factionId: string;
	unitCount: number;
	buildingCount: number;
	territoryPercent: number;
	resourceTotals: Record<string, number>;
}

export interface TurnSnapshotRecord {
	gameId: string;
	turn: number;
	snapshotJson: string;
}
