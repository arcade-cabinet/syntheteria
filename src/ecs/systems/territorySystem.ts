/**
 * Territory system — faction tile painting via proximity to units and buildings.
 *
 * Each tile can be claimed by a faction based on nearby units/buildings.
 * Contested tiles (multiple factions within claim range) are marked contested.
 * Territory size per faction is tracked for victory condition checks.
 */

import type { World } from "koota";
import {
	TERRITORY_BUILDING_RADIUS,
	TERRITORY_UNIT_RADIUS,
} from "../../config/gameDefaults";
import { Building } from "../traits/building";
import { UnitFaction, UnitPos } from "../traits/unit";

export interface TileTerritory {
	factionId: string;
	/** True if multiple factions have claim on this tile. */
	contested: boolean;
}

export interface TerritorySnapshot {
	/** Map from "x,z" → TileTerritory. Only claimed tiles appear. */
	tiles: Map<string, TileTerritory>;
	/** Tile count per faction (excluding contested). */
	counts: Map<string, number>;
	/** Total passable tiles on the board. */
	totalTiles: number;
}

/**
 * Compute a snapshot of territorial control from the current ECS state.
 *
 * Does not mutate ECS — pure read-only query. Called at end of turn
 * and by the minimap renderer.
 */
export function computeTerritory(
	world: World,
	boardWidth: number,
	boardHeight: number,
): TerritorySnapshot {
	// Map from "x,z" → Set of factionIds that claim it
	const claims = new Map<string, Set<string>>();

	function addClaim(cx: number, cz: number, factionId: string, radius: number) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const dist = Math.abs(dx) + Math.abs(dz);
				if (dist > radius) continue;
				const tx = cx + dx;
				const tz = cz + dz;
				if (tx < 0 || tx >= boardWidth || tz < 0 || tz >= boardHeight) continue;
				const key = `${tx},${tz}`;
				let set = claims.get(key);
				if (!set) {
					set = new Set();
					claims.set(key, set);
				}
				set.add(factionId);
			}
		}
	}

	// Unit claims
	for (const e of world.query(UnitPos, UnitFaction)) {
		const pos = e.get(UnitPos);
		const faction = e.get(UnitFaction);
		if (!pos || !faction || !faction.factionId) continue;
		addClaim(pos.tileX, pos.tileZ, faction.factionId, TERRITORY_UNIT_RADIUS);
	}

	// Building claims
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || !b.factionId) continue;
		addClaim(b.tileX, b.tileZ, b.factionId, TERRITORY_BUILDING_RADIUS);
	}

	// Resolve claims → TileTerritory
	const tiles = new Map<string, TileTerritory>();
	const counts = new Map<string, number>();

	for (const [key, factionSet] of claims) {
		if (factionSet.size === 1) {
			const factionId = factionSet.values().next().value!;
			tiles.set(key, { factionId, contested: false });
			counts.set(factionId, (counts.get(factionId) ?? 0) + 1);
		} else {
			// Contested — pick the faction with most presence for display, mark contested
			// For now, use the first faction alphabetically for deterministic display
			const sorted = [...factionSet].sort();
			tiles.set(key, { factionId: sorted[0], contested: true });
		}
	}

	const totalTiles = boardWidth * boardHeight;

	return { tiles, counts, totalTiles };
}

/**
 * Get territory percentage for a faction.
 */
export function getTerritoryPercent(
	snapshot: TerritorySnapshot,
	factionId: string,
): number {
	if (snapshot.totalTiles === 0) return 0;
	const count = snapshot.counts.get(factionId) ?? 0;
	return (count / snapshot.totalTiles) * 100;
}
