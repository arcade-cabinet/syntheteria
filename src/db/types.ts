/**
 * DB record types for RTS persistence.
 * These are flat row-oriented records — not ECS traits.
 */

export interface GameRecord {
	id: string;
	seed: string;
	difficulty: "easy" | "normal" | "hard";
	elapsedTicks: number;
	gameSpeed: number;
	createdAt: string;
	updatedAt: string;
}

export interface GameSummary {
	id: string;
	seed: string;
	difficulty: string;
	elapsedTicks: number;
	createdAt: string;
}

export interface UnitRecord {
	id: string;
	gameId: string;
	entityId: string;
	unitType: string;
	displayName: string;
	faction: string;
	x: number;
	y: number;
	z: number;
	speed: number;
	fragmentId: string;
	componentsJson: string;
	pathJson: string;
	pathIndex: number;
	moving: boolean;
}

export interface BuildingRecord {
	id: string;
	gameId: string;
	entityId: string;
	buildingType: string;
	faction: string;
	x: number;
	y: number;
	z: number;
	powered: boolean;
	operational: boolean;
	fragmentId: string;
	buildingComponentsJson: string;
}

export interface LightningRodRecord {
	buildingId: string;
	gameId: string;
	rodCapacity: number;
	currentOutput: number;
	protectionRadius: number;
}

export interface ResourcePoolRecord {
	gameId: string;
	scrapMetal: number;
	circuitry: number;
	powerCells: number;
	durasteel: number;
}

export interface ScavengePointRecord {
	gameId: string;
	x: number;
	z: number;
	remaining: number;
	resourceType: string;
	amountPerScavenge: number;
}

export interface FogCellRecord {
	gameId: string;
	fragmentId: string;
	cellIndex: number;
	state: number;
}
