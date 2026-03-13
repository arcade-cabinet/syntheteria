/**
 * Breach Zones — cultist spawn locations generated during world creation.
 *
 * Breach zones are clusters of cells at the edges of habitation and power zones
 * where the ecumenopolis's structural integrity has failed, exposing the surface
 * to wormhole energy. Cultists emerge from these fractures.
 *
 * ~5-8% of passable cells adjacent to impassable zones become breach zones.
 * Each breach zone is a cluster of 2-5 contiguous cells.
 */

import type {
	GeneratedEcumenopolisData,
	GeneratedSectorCell,
} from "../world/generation";

export interface BreachZone {
	/** Unique identifier for this breach zone */
	id: string;
	/** Grid coordinates of the breach center cell */
	centerQ: number;
	centerR: number;
	/** All cells that belong to this breach cluster */
	cells: { q: number; r: number }[];
	/** Whether this breach zone is near the northern cult site */
	isPrimary: boolean;
}

// Module-level state
let breachZones: BreachZone[] = [];

function tileKey(q: number, r: number) {
	return `${q},${r}`;
}

const NEIGHBOR_OFFSETS = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1],
] as const;

/**
 * Identify breach zone candidates from generated world data.
 *
 * Strategy: find passable cells that border impassable cells (breach/power zones),
 * then cluster them into breach zones. This creates natural spawn points at the
 * fractured edges of the ecumenopolis.
 */
export function generateBreachZones(
	worldData: GeneratedEcumenopolisData,
): BreachZone[] {
	const { sectorCells, pointsOfInterest } = worldData;

	const cellMap = new Map<string, GeneratedSectorCell>();
	for (const cell of sectorCells) {
		cellMap.set(tileKey(cell.q, cell.r), cell);
	}

	// Find passable cells adjacent to impassable breach/power zones
	const edgeCells: GeneratedSectorCell[] = [];
	for (const cell of sectorCells) {
		if (!cell.passable) continue;
		// Skip cells very close to home base — give the player breathing room
		const homeBase = pointsOfInterest.find((p) => p.type === "home_base");
		if (homeBase) {
			const dq = cell.q - homeBase.q;
			const dr = cell.r - homeBase.r;
			if (Math.sqrt(dq * dq + dr * dr) < 4) continue;
		}

		let bordersImpassable = false;
		for (const [dq, dr] of NEIGHBOR_OFFSETS) {
			const neighbor = cellMap.get(tileKey(cell.q + dq, cell.r + dr));
			if (!neighbor || !neighbor.passable) {
				bordersImpassable = true;
				break;
			}
		}
		if (bordersImpassable) {
			edgeCells.push(cell);
		}
	}

	// Deterministic seeded selection: pick ~6-8% of edge cells as breach seeds
	const targetFraction = 0.07;
	const targetCount = Math.max(
		3,
		Math.floor(edgeCells.length * targetFraction),
	);

	// Sort deterministically by coordinate hash
	const sorted = [...edgeCells].sort((a, b) => {
		const ha = hashCoord(a.q, a.r);
		const hb = hashCoord(b.q, b.r);
		return ha - hb;
	});

	// Pick every Nth cell to get even distribution
	const stride = Math.max(1, Math.floor(sorted.length / targetCount));
	const seedCells: GeneratedSectorCell[] = [];
	for (let i = 0; i < sorted.length && seedCells.length < targetCount; i += stride) {
		seedCells.push(sorted[i]);
	}

	// Find the cult site POI for primary marking
	const cultSite = pointsOfInterest.find(
		(p) => p.type === "northern_cult_site",
	);

	// Build breach zone clusters around each seed cell
	const used = new Set<string>();
	const zones: BreachZone[] = [];

	for (let i = 0; i < seedCells.length; i++) {
		const seed = seedCells[i];
		const key = tileKey(seed.q, seed.r);
		if (used.has(key)) continue;

		const cluster: { q: number; r: number }[] = [{ q: seed.q, r: seed.r }];
		used.add(key);

		// Grow cluster to 2-4 additional cells
		const clusterSize = 2 + (hashCoord(seed.q, seed.r) % 3);
		const frontier = [{ q: seed.q, r: seed.r }];

		while (cluster.length < clusterSize && frontier.length > 0) {
			const current = frontier.shift()!;
			for (const [dq, dr] of NEIGHBOR_OFFSETS) {
				const nq = current.q + dq;
				const nr = current.r + dr;
				const nk = tileKey(nq, nr);
				if (used.has(nk)) continue;
				const neighbor = cellMap.get(nk);
				if (!neighbor || !neighbor.passable) continue;
				cluster.push({ q: nq, r: nr });
				used.add(nk);
				frontier.push({ q: nq, r: nr });
				if (cluster.length >= clusterSize) break;
			}
		}

		// Determine if this zone is near the cult site
		let isPrimary = false;
		if (cultSite) {
			const dq = seed.q - cultSite.q;
			const dr = seed.r - cultSite.r;
			isPrimary = Math.sqrt(dq * dq + dr * dr) < 6;
		}

		zones.push({
			id: `breach_${i}`,
			centerQ: seed.q,
			centerR: seed.r,
			cells: cluster,
			isPrimary,
		});
	}

	return zones;
}

function hashCoord(q: number, r: number): number {
	const qh = Math.imul(q ^ 0x45d9f3b, 0x45d9f3b);
	const rh = Math.imul(r ^ 0x119de1f3, 0x119de1f3);
	return ((qh ^ rh) >>> 0) % 10000;
}

// ─── Runtime API ──────────────────────────────────────────────────────────────

/**
 * Load breach zones from world generation into runtime state.
 * Called once during game initialization after world generation.
 */
export function loadBreachZones(zones: BreachZone[]) {
	breachZones = [...zones];
}

/**
 * Get all breach zones. Returns empty array before loadBreachZones is called.
 */
export function getBreachZones(): readonly BreachZone[] {
	return breachZones;
}

/**
 * Get breach zones sorted by distance from a given position (nearest first).
 */
export function getBreachZonesNear(
	q: number,
	r: number,
): readonly BreachZone[] {
	return [...breachZones].sort((a, b) => {
		const da = (a.centerQ - q) ** 2 + (a.centerR - r) ** 2;
		const db = (b.centerQ - q) ** 2 + (b.centerR - r) ** 2;
		return da - db;
	});
}

/**
 * Get only the primary breach zones (near cult site) — strongest spawn points.
 */
export function getPrimaryBreachZones(): readonly BreachZone[] {
	return breachZones.filter((z) => z.isPrimary);
}

/**
 * Check whether a grid coordinate is within any breach zone.
 */
export function isBreachZoneCell(q: number, r: number): boolean {
	for (const zone of breachZones) {
		for (const cell of zone.cells) {
			if (cell.q === q && cell.r === r) return true;
		}
	}
	return false;
}

export function resetBreachZones() {
	breachZones = [];
}
