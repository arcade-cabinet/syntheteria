import { defineHex, Grid, Orientation } from "honeycomb-grid";
import type { TerrainSetId } from "../config/terrainSetRules";
import { createNewGameConfig, type NewGameConfig } from "../world/config";
import { generateWorldData } from "../world/generation";

export interface WorldDimensions {
	width: number;
	height: number;
}

// In Honeycomb, "dimensions" controls the hex radius.
// Our current terrain art is flat-top (96x83), so the grid orientation must match.
export const HEX_SIZE = 2;

export type FogState = 0 | 1 | 2; // 0=unexplored, 1=abstract, 2=detailed
export type Biome = "water" | "sand" | "dirt" | "grass" | "mountain";

// Define our custom Tile class extending Honeycomb's Hex
export class Tile extends defineHex({
	dimensions: HEX_SIZE,
	orientation: Orientation.FLAT,
}) {
	biome: Biome = "grass";
	fog: FogState = 0;
	terrainSetId: TerrainSetId = "emerald_fields_and_forests";
}

export interface MapFragment {
	id: string;
	grid: Grid<Tile>;
	mergedWith: Set<string>;
	displayOffset: { x: number; z: number };
}

export interface TerrainTileRecord {
	q: number;
	r: number;
	biome: Biome;
	fog: FogState;
	terrainSetId: TerrainSetId;
}

const fragments = new Map<string, MapFragment>();
let nextFragmentId = 0;
let worldDimensions: WorldDimensions = { width: 40, height: 40 };

export function hexToWorld(q: number, r: number) {
	const tile = new Tile({ q, r });
	// Honeycomb's x/y are 2D layout coordinates; in world space we map y onto z.
	return { x: tile.x, y: 0, z: tile.y };
}

export function worldToHex(x: number, z: number) {
	const frag = fragments.values().next().value;
	if (frag) {
		const hex = frag.grid.pointToHex({ x, y: z }, { allowOutside: true });
		return { q: hex.q, r: hex.r };
	}
	const dummyGrid = new Grid(Tile);
	const hex = dummyGrid.pointToHex({ x, y: z }, { allowOutside: true });
	return { q: hex.q, r: hex.r };
}

export function isWalkable(x: number, z: number): boolean {
	const frag = fragments.values().next().value;
	if (!frag) return false;
	const hex = worldToHex(x, z);
	const tile = frag.grid.getHex(hex);
	if (!tile) return false;
	return tile.biome !== "water" && tile.biome !== "mountain";
}

export function getWalkCost(x: number, z: number): number {
	const frag = fragments.values().next().value;
	if (!frag) return 1.0;
	const hex = worldToHex(x, z);
	const tile = frag.grid.getHex(hex);
	if (!tile) return 1.0;
	const biome = tile.biome;
	if (biome === "water" || biome === "mountain") return 0;
	if (biome === "sand") return 1.5;
	if (biome === "dirt") return 1.2;
	if (biome === "grass") return 1.0;
	return 1.0;
}

export function getWorldDimensions() {
	return { ...worldDimensions };
}

export function getWorldHalfExtents() {
	return {
		x: worldDimensions.width / 2,
		z: worldDimensions.height / 2,
	};
}

function buildGridFromTiles(tiles: TerrainTileRecord[]) {
	const hexes = tiles.map((tile) => {
		const hex = new Tile({ q: tile.q, r: tile.r });
		hex.biome = tile.biome;
		hex.fog = tile.fog;
		hex.terrainSetId = tile.terrainSetId;
		return hex;
	});
	return new Grid(Tile, hexes);
}

export function loadTerrainFragment(
	tiles: TerrainTileRecord[],
	dimensions: WorldDimensions,
	fragmentId?: string,
): MapFragment {
	resetTerrainState();
	worldDimensions = { ...dimensions };

	const id = fragmentId ?? `frag_${nextFragmentId++}`;
	const fragment: MapFragment = {
		id,
		grid: buildGridFromTiles(tiles),
		mergedWith: new Set(),
		displayOffset: { x: 0, z: 0 },
	};

	fragments.set(id, fragment);
	return fragment;
}

export function createFragment(config?: NewGameConfig): MapFragment {
	if (fragments.size > 0) {
		return fragments.values().next().value!;
	}

	const nextConfig =
		config ??
		createNewGameConfig(42, {
			mapSize: "standard",
			climateProfile: "temperate",
		});
	const generatedWorld = generateWorldData(nextConfig);
	return loadTerrainFragment(generatedWorld.tiles, generatedWorld.map);
}

export function getFragment(id: string): MapFragment | undefined {
	return fragments.get(id);
}

export function getAllFragments(): MapFragment[] {
	return Array.from(fragments.values());
}

export function getPrimaryFragment(): MapFragment | undefined {
	return fragments.values().next().value;
}

export function requirePrimaryFragment(): MapFragment {
	const fragment = getPrimaryFragment();
	if (!fragment) {
		throw new Error("No terrain fragment is loaded.");
	}
	return fragment;
}

export function deleteFragment(id: string) {
	fragments.delete(id);
}

export function resetTerrainState() {
	fragments.clear();
	nextFragmentId = 0;
	worldDimensions = { width: 40, height: 40 };
}

const DRIFT_RATE = 0.003;

export function clusterFragments(
	fragmentCenters: Map<string, { x: number; z: number }>,
	radius: number,
) {
	if (fragmentCenters.size <= 1) return;

	let cx = 0,
		cz = 0;
	for (const center of fragmentCenters.values()) {
		cx += center.x;
		cz += center.z;
	}
	cx /= fragmentCenters.size;
	cz /= fragmentCenters.size;

	for (const [fragId, center] of fragmentCenters) {
		const frag = fragments.get(fragId);
		if (!frag) continue;

		const dx = center.x - cx;
		const dz = center.z - cz;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > radius) {
			const scale = radius / dist;
			const displayX = cx + dx * scale;
			const displayZ = cz + dz * scale;
			frag.displayOffset.x = displayX - center.x;
			frag.displayOffset.z = displayZ - center.z;
		}
	}
}

export function updateDisplayOffsets() {
	for (const frag of fragments.values()) {
		frag.displayOffset.x *= 1 - DRIFT_RATE;
		frag.displayOffset.z *= 1 - DRIFT_RATE;

		if (
			Math.abs(frag.displayOffset.x) < 0.01 &&
			Math.abs(frag.displayOffset.z) < 0.01
		) {
			frag.displayOffset.x = 0;
			frag.displayOffset.z = 0;
		}
	}
}

export function getTerrainHeight(x: number, z: number): number {
	return 0; // 2.5D game, no height variation
}

// --- Fog helpers ---

export function getFogAt(
	fragment: MapFragment,
	q: number,
	r: number,
): FogState {
	const tile = fragment.grid.getHex({ q, r });
	return tile ? tile.fog : 0;
}

export function setFogAt(
	fragment: MapFragment,
	q: number,
	r: number,
	state: FogState,
) {
	let tile = fragment.grid.getHex({ q, r });
	if (tile && tile.fog < state) {
		tile.fog = state;
	}
}
