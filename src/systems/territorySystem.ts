/**
 * Territory System — Per-faction cell ownership and competition tracking.
 *
 * Each sector grid cell (q,r) can be claimed by at most one faction.
 * Cells are claimed by having units or buildings within a claim radius.
 * When a faction's units enter another faction's territory, a tension
 * event is recorded for the owning faction to react to defensively.
 *
 * Territory size drives cultist escalation — the larger a faction's
 * footprint, the more cultist pressure it attracts.
 */

import { Building, Identity, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import { worldToGrid } from "../world/sectorCoordinates";
import {
	ALL_ECONOMY_FACTIONS,
	type EconomyFactionId,
	RIVAL_FACTIONS,
} from "./factionEconomy";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Radius (in grid cells) around a unit that it claims for its faction */
const UNIT_CLAIM_RADIUS = 2;

/** Radius (in grid cells) around a building that it claims for its faction */
const BUILDING_CLAIM_RADIUS = 3;

/** How many ticks between full territory recalculations */
const RECALC_INTERVAL = 30;

/**
 * Cultist escalation multiplier per territory cell.
 * Larger territory = more cultist pressure.
 */
const CULTIST_PRESSURE_PER_CELL = 0.01;

/** Base cultist escalation before territory modifier */
const CULTIST_PRESSURE_BASE = 0.1;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TerritoryCell {
	q: number;
	r: number;
	owner: EconomyFactionId;
	/** How many claim sources (units + buildings) this faction has here */
	strength: number;
}

export interface TerritoryTension {
	/** The faction whose territory is being encroached */
	defender: EconomyFactionId;
	/** The faction encroaching */
	intruder: EconomyFactionId;
	/** Grid position of the intrusion */
	q: number;
	r: number;
	/** Entity ID of the intruding unit */
	intruderEntityId: string;
}

export interface FactionTerritoryStats {
	/** Number of cells this faction controls */
	cellCount: number;
	/** Set of border cell keys (adjacent to unclaimed or rival territory) */
	borderCells: Set<string>;
}

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Cell ownership map. Key is "q,r", value is the owning faction and strength.
 * Only cells with at least one claim source are stored.
 */
const cellOwnership = new Map<string, TerritoryCell>();

/** Per-faction territory statistics (computed on recalc) */
const factionStats = new Map<EconomyFactionId, FactionTerritoryStats>();

/** Tension events from the last recalculation */
let currentTensions: TerritoryTension[] = [];

/** Tick counter for periodic recalculation */
let ticksSinceRecalc = RECALC_INTERVAL;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cellKey(q: number, r: number): string {
	return `${q},${r}`;
}

/**
 * Intermediate accumulator: for each cell, track claim strength per faction.
 */
type ClaimAccumulator = Map<
	string,
	Map<EconomyFactionId, { strength: number; q: number; r: number }>
>;

function addClaims(
	acc: ClaimAccumulator,
	centerQ: number,
	centerR: number,
	radius: number,
	faction: EconomyFactionId,
) {
	for (let dq = -radius; dq <= radius; dq++) {
		for (let dr = -radius; dr <= radius; dr++) {
			// Use Chebyshev distance for rectangular grid
			if (Math.abs(dq) + Math.abs(dr) > radius * 1.5) continue;
			const q = centerQ + dq;
			const r = centerR + dr;
			const key = cellKey(q, r);

			let factionClaims = acc.get(key);
			if (!factionClaims) {
				factionClaims = new Map();
				acc.set(key, factionClaims);
			}

			const existing = factionClaims.get(faction);
			if (existing) {
				existing.strength++;
			} else {
				factionClaims.set(faction, { strength: 1, q, r });
			}
		}
	}
}

function computeBorderCells(
	ownership: Map<string, TerritoryCell>,
	faction: EconomyFactionId,
): Set<string> {
	const borders = new Set<string>();
	const offsets = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
		[1, 1],
		[1, -1],
		[-1, 1],
		[-1, -1],
	];

	for (const [key, cell] of ownership) {
		if (cell.owner !== faction) continue;

		for (const [dq, dr] of offsets) {
			const neighborKey = cellKey(cell.q + dq, cell.r + dr);
			const neighbor = ownership.get(neighborKey);
			if (!neighbor || neighbor.owner !== faction) {
				borders.add(key);
				break;
			}
		}
	}

	return borders;
}

// ─── Core Recalculation ──────────────────────────────────────────────────────

function recalculate() {
	const acc: ClaimAccumulator = new Map();
	const tensions: TerritoryTension[] = [];

	// Gather claims from units
	for (const entity of world.query(Unit, WorldPosition, Identity)) {
		const identity = entity.get(Identity);
		if (!identity) continue;

		const faction = identity.faction as EconomyFactionId;
		if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		const { q, r } = worldToGrid(pos.x, pos.z);
		addClaims(acc, q, r, UNIT_CLAIM_RADIUS, faction);
	}

	// Gather claims from buildings
	for (const entity of world.query(Building, WorldPosition, Identity)) {
		const identity = entity.get(Identity);
		if (!identity) continue;

		const faction = identity.faction as EconomyFactionId;
		if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		const { q, r } = worldToGrid(pos.x, pos.z);
		addClaims(acc, q, r, BUILDING_CLAIM_RADIUS, faction);
	}

	// Resolve ownership: strongest claim wins, ties go to first faction
	cellOwnership.clear();
	for (const [key, factionClaims] of acc) {
		let bestFaction: EconomyFactionId | null = null;
		let bestStrength = 0;
		let bestQ = 0;
		let bestR = 0;

		for (const [faction, claim] of factionClaims) {
			if (claim.strength > bestStrength) {
				bestFaction = faction;
				bestStrength = claim.strength;
				bestQ = claim.q;
				bestR = claim.r;
			}
		}

		if (bestFaction) {
			cellOwnership.set(key, {
				q: bestQ,
				r: bestR,
				owner: bestFaction,
				strength: bestStrength,
			});
		}
	}

	// Detect tensions: units in rival territory
	for (const entity of world.query(Unit, WorldPosition, Identity)) {
		const identity = entity.get(Identity);
		if (!identity) continue;

		const faction = identity.faction as EconomyFactionId;
		if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		const { q, r } = worldToGrid(pos.x, pos.z);
		const key = cellKey(q, r);
		const cell = cellOwnership.get(key);

		if (cell && cell.owner !== faction) {
			tensions.push({
				defender: cell.owner,
				intruder: faction,
				q,
				r,
				intruderEntityId: identity.id,
			});
		}
	}

	currentTensions = tensions;

	// Compute per-faction stats
	factionStats.clear();
	const cellCounts = new Map<EconomyFactionId, number>();
	for (const cell of cellOwnership.values()) {
		cellCounts.set(cell.owner, (cellCounts.get(cell.owner) ?? 0) + 1);
	}

	for (const faction of ALL_ECONOMY_FACTIONS) {
		factionStats.set(faction, {
			cellCount: cellCounts.get(faction) ?? 0,
			borderCells: computeBorderCells(cellOwnership, faction),
		});
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the territory system tick. Recalculates periodically.
 */
export function territorySystem() {
	ticksSinceRecalc++;
	if (ticksSinceRecalc >= RECALC_INTERVAL) {
		recalculate();
		ticksSinceRecalc = 0;
	}
}

/**
 * Force an immediate territory recalculation (useful for tests or after
 * large state changes like spawning).
 */
export function forceRecalculate() {
	recalculate();
	ticksSinceRecalc = 0;
}

/**
 * Get the owning faction of a grid cell, or null if unclaimed.
 */
export function getCellOwner(q: number, r: number): EconomyFactionId | null {
	return cellOwnership.get(cellKey(q, r))?.owner ?? null;
}

/**
 * Get the full ownership record for a cell.
 */
export function getCellTerritory(q: number, r: number): TerritoryCell | null {
	return cellOwnership.get(cellKey(q, r)) ?? null;
}

/**
 * Get all owned cells for a faction.
 */
export function getFactionCells(faction: EconomyFactionId): TerritoryCell[] {
	const result: TerritoryCell[] = [];
	for (const cell of cellOwnership.values()) {
		if (cell.owner === faction) {
			result.push(cell);
		}
	}
	return result;
}

/**
 * Get territory statistics for a faction.
 */
export function getFactionTerritoryStats(
	faction: EconomyFactionId,
): FactionTerritoryStats {
	return factionStats.get(faction) ?? { cellCount: 0, borderCells: new Set() };
}

/**
 * Get the total number of cells controlled by a faction.
 */
export function getFactionTerritorySize(faction: EconomyFactionId): number {
	return factionStats.get(faction)?.cellCount ?? 0;
}

/**
 * Get all current territory tensions (rival units in owned territory).
 */
export function getTerritoryTensions(): readonly TerritoryTension[] {
	return currentTensions;
}

/**
 * Get tensions where a specific faction is the defender.
 */
export function getTensionsForDefender(
	faction: EconomyFactionId,
): TerritoryTension[] {
	return currentTensions.filter((t) => t.defender === faction);
}

/**
 * Get the cultist escalation factor based on total non-cultist territory.
 * Larger combined territory of player + rival factions = more cultist pressure.
 */
export function getCultistEscalationFactor(): number {
	let totalNonCultistCells = 0;
	for (const faction of ALL_ECONOMY_FACTIONS) {
		if (faction === "cultist") continue;
		totalNonCultistCells += getFactionTerritorySize(faction);
	}
	return (
		CULTIST_PRESSURE_BASE + totalNonCultistCells * CULTIST_PRESSURE_PER_CELL
	);
}

/**
 * Get all cell ownership data (for rendering / serialization).
 */
export function getAllCellOwnership(): ReadonlyMap<string, TerritoryCell> {
	return cellOwnership;
}

/**
 * Get border cells for a faction (cells adjacent to unclaimed/rival territory).
 * Returns cell keys in "q,r" format.
 */
export function getFactionBorderCells(faction: EconomyFactionId): Set<string> {
	return factionStats.get(faction)?.borderCells ?? new Set();
}

/**
 * Check if a position is in a faction's territory.
 */
export function isInFactionTerritory(
	worldX: number,
	worldZ: number,
	faction: EconomyFactionId,
): boolean {
	const { q, r } = worldToGrid(worldX, worldZ);
	return getCellOwner(q, r) === faction;
}

/**
 * Reset territory state — call on new game.
 */
export function resetTerritorySystem() {
	cellOwnership.clear();
	factionStats.clear();
	currentTensions = [];
	ticksSinceRecalc = RECALC_INTERVAL;
}
