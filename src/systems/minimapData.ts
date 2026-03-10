/**
 * Minimap data system — generates 2D minimap data from game state.
 *
 * Produces a grid of pixels representing terrain, entities, buildings,
 * fog of war, and territory boundaries. The UI renders this as a
 * minimap overlay.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MinimapPixelType =
	| "terrain"
	| "water"
	| "player_unit"
	| "enemy_unit"
	| "ally_unit"
	| "building"
	| "deposit"
	| "fog"
	| "territory_border"
	| "hazard";

export interface MinimapPixel {
	type: MinimapPixelType;
	faction?: string;
	intensity?: number; // 0-1 for varying brightness
}

export interface MinimapConfig {
	resolution: number; // pixels per side (e.g., 128)
	worldSize: number; // world units per side
	showFog: boolean;
	showTerritoryBorders: boolean;
	showHazards: boolean;
}

export interface MinimapEntity {
	id: string;
	x: number;
	z: number;
	type: "unit" | "building" | "deposit" | "hazard";
	faction: string;
}

export interface MinimapTerrainCell {
	height: number; // 0-1 normalized
	isWater: boolean;
}

export interface MinimapTerritoryCell {
	faction: string | null;
	isBorder: boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let mapConfig: MinimapConfig = {
	resolution: 128,
	worldSize: 200,
	showFog: true,
	showTerritoryBorders: true,
	showHazards: true,
};

/** Terrain grid — set once on map generation. */
let terrainGrid: MinimapTerrainCell[][] = [];

/** Fog of war grid — true = revealed. */
let fogGrid: boolean[][] = [];

/** Current entities for minimap rendering. */
const entities: Map<string, MinimapEntity> = new Map();

/** Territory ownership grid. */
let territoryGrid: MinimapTerritoryCell[][] = [];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Initialize minimap with terrain data.
 */
export function initMinimap(
	config: MinimapConfig,
	terrain: MinimapTerrainCell[][],
): void {
	mapConfig = { ...config };
	terrainGrid = terrain;

	// Initialize fog grid (all hidden)
	fogGrid = Array.from({ length: config.resolution }, () =>
		Array(config.resolution).fill(false),
	);

	// Initialize territory grid
	territoryGrid = Array.from({ length: config.resolution }, () =>
		Array.from({ length: config.resolution }, () => ({
			faction: null,
			isBorder: false,
		})),
	);
}

/**
 * Configure minimap display options.
 */
export function setMinimapConfig(partial: Partial<MinimapConfig>): void {
	mapConfig = { ...mapConfig, ...partial };
}

// ---------------------------------------------------------------------------
// Entity tracking
// ---------------------------------------------------------------------------

/**
 * Update an entity's position on the minimap.
 */
export function updateMinimapEntity(entity: MinimapEntity): void {
	entities.set(entity.id, entity);
}

/**
 * Remove an entity from the minimap.
 */
export function removeMinimapEntity(id: string): void {
	entities.delete(id);
}

// ---------------------------------------------------------------------------
// Fog of war
// ---------------------------------------------------------------------------

/**
 * Reveal fog of war at a world position with a given radius.
 */
export function revealFog(worldX: number, worldZ: number, radius: number): void {
	const cellSize = mapConfig.worldSize / mapConfig.resolution;
	const cellRadius = Math.ceil(radius / cellSize);
	const cx = Math.floor(worldX / cellSize);
	const cz = Math.floor(worldZ / cellSize);

	for (let dx = -cellRadius; dx <= cellRadius; dx++) {
		for (let dz = -cellRadius; dz <= cellRadius; dz++) {
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > cellRadius) continue;

			const px = cx + dx;
			const pz = cz + dz;
			if (
				px >= 0 &&
				px < mapConfig.resolution &&
				pz >= 0 &&
				pz < mapConfig.resolution
			) {
				fogGrid[pz][px] = true;
			}
		}
	}
}

/**
 * Check if a position is revealed.
 */
export function isFogRevealed(worldX: number, worldZ: number): boolean {
	const cellSize = mapConfig.worldSize / mapConfig.resolution;
	const px = Math.floor(worldX / cellSize);
	const pz = Math.floor(worldZ / cellSize);

	if (px < 0 || px >= mapConfig.resolution || pz < 0 || pz >= mapConfig.resolution) {
		return false;
	}

	return fogGrid[pz]?.[px] ?? false;
}

// ---------------------------------------------------------------------------
// Territory
// ---------------------------------------------------------------------------

/**
 * Update territory ownership at a world position.
 */
export function setTerritory(
	worldX: number,
	worldZ: number,
	radius: number,
	faction: string,
): void {
	const cellSize = mapConfig.worldSize / mapConfig.resolution;
	const cellRadius = Math.ceil(radius / cellSize);
	const cx = Math.floor(worldX / cellSize);
	const cz = Math.floor(worldZ / cellSize);

	for (let dx = -cellRadius; dx <= cellRadius; dx++) {
		for (let dz = -cellRadius; dz <= cellRadius; dz++) {
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > cellRadius) continue;

			const px = cx + dx;
			const pz = cz + dz;
			if (
				px >= 0 &&
				px < mapConfig.resolution &&
				pz >= 0 &&
				pz < mapConfig.resolution
			) {
				territoryGrid[pz][px] = {
					faction,
					isBorder: dist >= cellRadius - 1,
				};
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Generate the full minimap pixel grid.
 */
export function generateMinimapData(): MinimapPixel[][] {
	const res = mapConfig.resolution;
	const cellSize = mapConfig.worldSize / res;

	// Start with terrain
	const pixels: MinimapPixel[][] = Array.from({ length: res }, (_, z) =>
		Array.from({ length: res }, (_, x) => {
			// Fog check
			if (mapConfig.showFog && fogGrid[z]?.[x] === false) {
				return { type: "fog" as MinimapPixelType, intensity: 0 };
			}

			// Territory border
			if (
				mapConfig.showTerritoryBorders &&
				territoryGrid[z]?.[x]?.isBorder
			) {
				return {
					type: "territory_border" as MinimapPixelType,
					faction: territoryGrid[z][x].faction ?? undefined,
					intensity: 0.8,
				};
			}

			// Terrain
			const cell = terrainGrid[z]?.[x];
			if (cell?.isWater) {
				return { type: "water" as MinimapPixelType, intensity: 0.3 };
			}

			return {
				type: "terrain" as MinimapPixelType,
				intensity: cell?.height ?? 0.5,
			};
		}),
	);

	// Overlay entities
	for (const entity of entities.values()) {
		const px = Math.floor(entity.x / cellSize);
		const pz = Math.floor(entity.z / cellSize);

		if (px < 0 || px >= res || pz < 0 || pz >= res) continue;

		// Skip entities in fog
		if (mapConfig.showFog && !fogGrid[pz]?.[px]) continue;

		let pixelType: MinimapPixelType;
		switch (entity.type) {
			case "unit":
				pixelType =
					entity.faction === "player"
						? "player_unit"
						: entity.faction === "enemy"
							? "enemy_unit"
							: "ally_unit";
				break;
			case "building":
				pixelType = "building";
				break;
			case "deposit":
				pixelType = "deposit";
				break;
			case "hazard":
				pixelType = "hazard";
				break;
			default:
				pixelType = "terrain";
		}

		pixels[pz][px] = {
			type: pixelType,
			faction: entity.faction,
			intensity: 1.0,
		};
	}

	return pixels;
}

/**
 * Get minimap statistics.
 */
export function getMinimapStats(): {
	resolution: number;
	entityCount: number;
	revealedCells: number;
	totalCells: number;
	revealedPercent: number;
} {
	let revealed = 0;
	const total = mapConfig.resolution * mapConfig.resolution;

	for (const row of fogGrid) {
		for (const cell of row) {
			if (cell) revealed++;
		}
	}

	return {
		resolution: mapConfig.resolution,
		entityCount: entities.size,
		revealedCells: revealed,
		totalCells: total,
		revealedPercent:
			total > 0 ? Math.round((revealed / total) * 10000) / 100 : 0,
	};
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetMinimap(): void {
	terrainGrid = [];
	fogGrid = [];
	territoryGrid = [];
	entities.clear();
	mapConfig = {
		resolution: 128,
		worldSize: 200,
		showFog: true,
		showTerritoryBorders: true,
		showHazards: true,
	};
}
