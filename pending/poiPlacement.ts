/**
 * POI placement system — finds usable space on generated terrain
 * and places points of interest from config.
 *
 * Separate from terrain generation. Reads POI definitions from
 * config/pois.json and finds valid locations on the generated map.
 */

import poisConfig from "../config/pois.json";
import type { WorldPoiType } from "./contracts";
import type { GeneratedSectorCell } from "./generation";

export interface GeneratedSectorPointOfInterest {
	type: WorldPoiType;
	name: string;
	q: number;
	r: number;
	discovered: boolean;
}

// ─── PRNG ───────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};
}

// ─── POI Placement ──────────────────────────────────────────────────────────

/**
 * Place POIs on generated terrain. Reads definitions from config,
 * finds passable cells near target positions, applies jitter for variety.
 *
 * POIs need REAL positions on the map — they query terrain for usable
 * space because you can't place a research station in a wall.
 */
export function placeInitialPOIs(
	cells: GeneratedSectorCell[],
	gridWidth: number,
	gridHeight: number,
	worldSeed: number,
): GeneratedSectorPointOfInterest[] {
	const rng = mulberry32(worldSeed * 7919 + 31);
	const passable = cells.filter((c) => c.passable);

	if (passable.length === 0) return [];

	const placed: GeneratedSectorPointOfInterest[] = [];
	const occupiedKeys = new Set<string>();

	for (const def of poisConfig.pointsOfInterest) {
		const targetQ = Math.floor(def.relativeQ * gridWidth);
		const targetR = Math.floor(def.relativeR * gridHeight);

		// Find nearest passable cell that isn't already occupied by another POI
		let best: GeneratedSectorCell | null = null;
		let bestDist = Infinity;
		for (const cell of passable) {
			const key = `${cell.q},${cell.r}`;
			if (occupiedKeys.has(key)) continue;
			const dist = Math.abs(cell.q - targetQ) + Math.abs(cell.r - targetR);
			if (dist < bestDist) {
				bestDist = dist;
				best = cell;
			}
		}

		if (!best) continue;

		// Deterministic jitter so POIs aren't all on the exact grid intersections
		const jitterQ = Math.floor(rng() * 3) - 1;
		const jitterR = Math.floor(rng() * 3) - 1;
		const finalQ = Math.max(0, Math.min(gridWidth - 1, best.q + jitterQ));
		const finalR = Math.max(0, Math.min(gridHeight - 1, best.r + jitterR));

		occupiedKeys.add(`${finalQ},${finalR}`);
		placed.push({
			type: def.type as WorldPoiType,
			name: def.name,
			q: finalQ,
			r: finalR,
			discovered: def.discoveredAtStart,
		});
	}

	return placed;
}
