/**
 * Territory control system — grid-based ownership tracking.
 *
 * Tracks which faction owns each discrete grid cell on the map.
 * Outposts claim all cells within a configurable radius. When
 * claim radii from different factions overlap, those cells are
 * marked as contested.
 *
 * Border cells are the subset of a faction's territory that
 * are adjacent to unclaimed or enemy-owned cells.
 *
 * All tunables sourced from config/territory.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CellKey {
	x: number;
	z: number;
}

export interface Outpost {
	faction: string;
	x: number;
	z: number;
	radius: number;
}

export interface CellOwnership {
	faction: string;
	/** Number of outposts from this faction claiming the cell */
	claimCount: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const territoryCfg = config.territory;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/**
 * Primary ownership map: "x,z" → faction that owns it.
 * A cell is owned by the faction with the most claims.
 * Ties leave the cell contested (tracked separately).
 */
let cellOwners = new Map<string, string>();

/**
 * Per-cell claim tracking: "x,z" → Map<faction, claimCount>.
 * Multiple outposts from the same faction stack; different factions contest.
 */
let cellClaims = new Map<string, Map<string, number>>();

/** All registered outposts */
let outposts: Outpost[] = [];

/** Cached border cells per faction, updated by territoryControlSystem() */
let borderCells = new Map<string, Set<string>>();

/** Total number of cells on the map (set via setMapSize) */
let totalMapCells = 0;

/** Map dimensions */
let mapWidth = 0;
let mapHeight = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellKey(x: number, z: number): string {
	return `${x},${z}`;
}

function parseCellKey(key: string): CellKey {
	const parts = key.split(",");
	return { x: Number(parts[0]), z: Number(parts[1]) };
}

function isInBounds(x: number, z: number): boolean {
	return x >= 0 && x < mapWidth && z >= 0 && z < mapHeight;
}

/**
 * Resolve ownership for a cell given its claims map.
 * The faction with the highest claim count wins.
 * If two factions tie for highest, the cell is contested (no single owner).
 */
function resolveOwner(claims: Map<string, number>): string | null {
	let bestFaction: string | null = null;
	let bestCount = 0;
	let tied = false;

	for (const [faction, count] of claims) {
		if (count > bestCount) {
			bestFaction = faction;
			bestCount = count;
			tied = false;
		} else if (count === bestCount && count > 0) {
			tied = true;
		}
	}

	if (tied) return null; // contested — no single owner
	return bestFaction;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the map dimensions. Must be called before claiming territory.
 * totalMapCells is used for percentage calculations.
 */
export function setMapSize(width: number, height: number): void {
	mapWidth = width;
	mapHeight = height;
	totalMapCells = width * height;
}

/**
 * Claim territory for a faction centered at (outpostX, outpostZ) with the
 * given radius. All grid cells within the circular radius are claimed.
 *
 * Uses the minimumOutpostSpacing from config/territory.json.
 */
export function claimTerritory(
	faction: string,
	outpostX: number,
	outpostZ: number,
	radius: number,
): void {
	const outpost: Outpost = { faction, x: outpostX, z: outpostZ, radius };
	outposts.push(outpost);

	// Claim all cells within the circular radius
	const r = Math.ceil(radius);
	for (let dx = -r; dx <= r; dx++) {
		for (let dz = -r; dz <= r; dz++) {
			const cx = outpostX + dx;
			const cz = outpostZ + dz;

			if (!isInBounds(cx, cz)) continue;

			// Check circular distance
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > radius) continue;

			const key = cellKey(cx, cz);

			// Update claims
			let claims = cellClaims.get(key);
			if (!claims) {
				claims = new Map();
				cellClaims.set(key, claims);
			}
			claims.set(faction, (claims.get(faction) ?? 0) + 1);

			// Resolve ownership
			const owner = resolveOwner(claims);
			if (owner !== null) {
				cellOwners.set(key, owner);
			} else {
				// Contested — remove from owners
				cellOwners.delete(key);
			}
		}
	}
}

/**
 * Get the faction that owns a specific grid cell, or null if unclaimed/contested.
 */
export function getOwner(x: number, z: number): string | null {
	return cellOwners.get(cellKey(x, z)) ?? null;
}

/**
 * Get the fraction of the total map controlled by a faction (0.0–1.0).
 * Returns 0 if the map size has not been set.
 */
export function getTerritoryPercentage(faction: string): number {
	if (totalMapCells === 0) return 0;

	let count = 0;
	for (const owner of cellOwners.values()) {
		if (owner === faction) count++;
	}
	return count / totalMapCells;
}

/**
 * Get all contested cells — cells claimed by multiple factions with
 * equal highest claim counts.
 */
export function getContestedCells(): CellKey[] {
	const contested: CellKey[] = [];

	for (const [key, claims] of cellClaims) {
		if (claims.size < 2) continue;

		const owner = resolveOwner(claims);
		if (owner === null) {
			contested.push(parseCellKey(key));
		}
	}

	return contested;
}

/**
 * Get the border cells for a faction — owned cells adjacent to
 * unclaimed or enemy-owned cells.
 *
 * Uses cached results from the last territoryControlSystem() tick.
 * Call territoryControlSystem() first to ensure fresh data.
 */
export function getBorderCells(faction: string): CellKey[] {
	const borders = borderCells.get(faction);
	if (!borders) return [];
	return Array.from(borders).map(parseCellKey);
}

/**
 * Get all cells owned by a faction.
 */
export function getOwnedCells(faction: string): CellKey[] {
	const cells: CellKey[] = [];
	for (const [key, owner] of cellOwners) {
		if (owner === faction) {
			cells.push(parseCellKey(key));
		}
	}
	return cells;
}

/**
 * Get the total number of cells owned by a faction.
 */
export function getOwnedCellCount(faction: string): number {
	let count = 0;
	for (const owner of cellOwners.values()) {
		if (owner === faction) count++;
	}
	return count;
}

/**
 * Get the resource bonus multiplier for building inside owned territory.
 * Returns the configured bonus if the cell is owned by the faction,
 * otherwise returns 1.0 (no bonus).
 */
export function getResourceBonus(faction: string, x: number, z: number): number {
	const owner = getOwner(x, z);
	if (owner === faction) {
		return territoryCfg.resourceBonusInTerritory;
	}
	return 1.0;
}

/**
 * Get the building cost reduction for building inside owned territory.
 * Returns the configured reduction if the cell is owned by the faction,
 * otherwise returns 1.0 (no reduction).
 */
export function getBuildingCostReduction(
	faction: string,
	x: number,
	z: number,
): number {
	const owner = getOwner(x, z);
	if (owner === faction) {
		return territoryCfg.buildingCostReduction;
	}
	return 1.0;
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/** Orthogonal neighbor offsets */
const NEIGHBOR_OFFSETS: ReadonlyArray<[number, number]> = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
];

/**
 * Territory control system tick function.
 *
 * Updates the border cell cache for all factions. A cell is a border cell
 * if it is owned by a faction and at least one orthogonal neighbor is
 * either out of bounds, unclaimed, or owned by a different faction.
 */
export function territoryControlSystem(): void {
	borderCells.clear();

	for (const [key, owner] of cellOwners) {
		const { x, z } = parseCellKey(key);

		let isBorder = false;
		for (const [dx, dz] of NEIGHBOR_OFFSETS) {
			const nx = x + dx;
			const nz = z + dz;

			if (!isInBounds(nx, nz)) {
				isBorder = true;
				break;
			}

			const neighborOwner = cellOwners.get(cellKey(nx, nz));
			if (neighborOwner !== owner) {
				isBorder = true;
				break;
			}
		}

		if (isBorder) {
			let borders = borderCells.get(owner);
			if (!borders) {
				borders = new Set();
				borderCells.set(owner, borders);
			}
			borders.add(key);
		}
	}
}

/**
 * Reset all territory control state. Used for testing and new-game initialization.
 */
export function resetTerritoryControl(): void {
	cellOwners = new Map();
	cellClaims = new Map();
	outposts = [];
	borderCells = new Map();
	totalMapCells = 0;
	mapWidth = 0;
	mapHeight = 0;
}
