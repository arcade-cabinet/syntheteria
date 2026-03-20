import type { World } from "koota";
import { FACTION_DEFINITIONS } from "../factions";
import { UnitPos } from "../traits";
import { spawnSupport } from "./BuilderBot";
import { spawnCavalry } from "./CavalryBot";
import {
	spawnCultCavalry,
	spawnCultInfantry,
	spawnCultRanged,
} from "./CultMechs";
import { spawnRanged } from "./GuardBot";
import { spawnWorker } from "./HarvesterBot";
import type { BotMark } from "./marks";
import { spawnScout } from "./ScoutBot";
import { spawnInfantry } from "./SentinelBot";
import type { RobotClass } from "./types";

export interface RobotPlacementFlag {
	robotType: RobotClass;
	factionId: string;
	count: number;
	zone: "player_start" | "faction_start" | "random_passable";
	marks?: BotMark[];
}

/**
 * Build placement flags for the current game config.
 * All factions get the same starter squad composition.
 * Player gets a full 6-bot squad; AI factions get a 4-bot squad.
 */
export function buildPlacementFlags(
	playerFactionId: string | null,
	activeFactionIds: string[],
): RobotPlacementFlag[] {
	const flags: RobotPlacementFlag[] = [];

	// Player starter squad — all 6 faction bot types
	if (playerFactionId) {
		flags.push(
			{
				robotType: "scout",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
			{
				robotType: "infantry",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
			{
				robotType: "cavalry",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
			{
				robotType: "ranged",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
			{
				robotType: "support",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
			{
				robotType: "worker",
				factionId: "player",
				count: 1,
				zone: "player_start",
			},
		);
	}

	// AI factions — 4 combat bots each (same types as player)
	for (const factionId of activeFactionIds) {
		if (factionId === playerFactionId) continue;
		flags.push(
			{ robotType: "scout", factionId, count: 1, zone: "faction_start" },
			{ robotType: "infantry", factionId, count: 1, zone: "faction_start" },
			{ robotType: "cavalry", factionId, count: 1, zone: "faction_start" },
			{ robotType: "ranged", factionId, count: 1, zone: "faction_start" },
		);
	}

	return flags;
}

export interface SimpleBoardInfo {
	width: number;
	height: number;
	isPassable: (x: number, z: number) => boolean;
	/** Biome type at tile. Returns undefined for out-of-bounds. */
	getBiomeType?: (x: number, z: number) => string | undefined;
}

const SPAWNERS: Record<
	RobotClass,
	(world: World, x: number, z: number, factionId: string) => unknown
> = {
	scout: spawnScout,
	infantry: spawnInfantry,
	cavalry: spawnCavalry,
	ranged: spawnRanged,
	support: spawnSupport,
	worker: spawnWorker,
	cult_infantry: spawnCultInfantry,
	cult_ranged: spawnCultRanged,
	cult_cavalry: spawnCultCavalry,
};

// ─── Terrain-affinity spawn finder ──────────────────────────────────────────

/** Minimum manhattan distance between any two faction spawn clusters. */
const MIN_FACTION_DISTANCE = 15;

function scoreTile(
	x: number,
	z: number,
	terrainAffinity: string,
	board: SimpleBoardInfo,
	placedCenters: Array<{ x: number; z: number }>,
): number {
	let affinityCount = 0;
	const radius = 5;
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			const tx = x + dx;
			const tz = z + dz;
			if (tx < 0 || tz < 0 || tx >= board.width || tz >= board.height) continue;
			const ft = board.getBiomeType?.(tx, tz);
			if (ft === terrainAffinity) affinityCount++;
		}
	}

	let minDist = Infinity;
	for (const center of placedCenters) {
		const dist = Math.abs(x - center.x) + Math.abs(z - center.z);
		minDist = Math.min(minDist, dist);
	}

	if (placedCenters.length > 0 && minDist < MIN_FACTION_DISTANCE) {
		return -1;
	}

	const distBonus = placedCenters.length > 0 ? Math.min(minDist, 50) : 0;
	return affinityCount * 3 + distBonus;
}

export function findAffinitySpawn(
	terrainAffinity: string,
	board: SimpleBoardInfo,
	placedCenters: Array<{ x: number; z: number }>,
	occupied: Set<string>,
): { x: number; z: number } | null {
	let bestTile: { x: number; z: number } | null = null;
	let bestScore = -Infinity;

	const step = board.width >= 64 ? 2 : 1;

	for (let z = 2; z < board.height - 2; z += step) {
		for (let x = 2; x < board.width - 2; x += step) {
			if (!board.isPassable(x, z)) continue;
			if (occupied.has(`${x},${z}`)) continue;

			const score = scoreTile(x, z, terrainAffinity, board, placedCenters);
			if (score > bestScore) {
				bestScore = score;
				bestTile = { x, z };
			}
		}
	}

	return bestTile;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find a passable tile near (cx,cz), expanding outward by ring.
 * minSpread: minimum Manhattan distance from any already-occupied tile
 * (prevents units from clumping on adjacent tiles).
 */
function findPassableNear(
	cx: number,
	cz: number,
	radius: number,
	board: SimpleBoardInfo,
	occupied: Set<string>,
	minSpread = 2,
): { x: number; z: number } | null {
	// First pass: respect minSpread for proper unit distribution
	for (let r = minSpread; r <= radius; r++) {
		for (let dx = -r; dx <= r; dx++) {
			for (let dz = -r; dz <= r; dz++) {
				if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // ring only
				const x = cx + dx;
				const z = cz + dz;
				if (x < 0 || z < 0 || x >= board.width || z >= board.height) continue;
				const key = `${x},${z}`;
				if (occupied.has(key) || !board.isPassable(x, z)) continue;
				// Check minimum distance from ALL occupied tiles
				let tooClose = false;
				for (const occ of occupied) {
					const [ox, oz] = occ.split(",").map(Number);
					if (Math.abs(x - ox) + Math.abs(z - oz) < minSpread) {
						tooClose = true;
						break;
					}
				}
				if (!tooClose) return { x, z };
			}
		}
	}
	// Fallback: any passable unoccupied tile (no spread requirement)
	for (let r = 0; r <= radius; r++) {
		for (let dx = -r; dx <= r; dx++) {
			for (let dz = -r; dz <= r; dz++) {
				const x = cx + dx;
				const z = cz + dz;
				if (x < 0 || z < 0 || x >= board.width || z >= board.height) continue;
				const key = `${x},${z}`;
				if (!occupied.has(key) && board.isPassable(x, z)) {
					return { x, z };
				}
			}
		}
	}
	return null;
}

// ─── Faction spawn center cache ─────────────────────────────────────────────

let _spawnCenters = new Map<string, { x: number; z: number }>();

export function getSpawnCenters(): Map<string, { x: number; z: number }> {
	return _spawnCenters;
}

/**
 * Compute and cache terrain-affinity spawn centers for all active factions.
 */
export function computeSpawnCenters(
	board: SimpleBoardInfo,
	playerFactionId?: string | null,
	activeFactionIds?: string[],
): void {
	_spawnCenters = new Map();
	const placedCenters: Array<{ x: number; z: number }> = [];
	const occupied = new Set<string>();

	// Player first
	if (playerFactionId) {
		const playerDef = FACTION_DEFINITIONS.find((f) => f.id === playerFactionId);
		if (playerDef) {
			const center = findAffinitySpawn(
				playerDef.terrainAffinity,
				board,
				placedCenters,
				occupied,
			);
			if (center) {
				_spawnCenters.set("player", center);
				placedCenters.push(center);
			} else {
				const cx = Math.floor(board.width / 2);
				const cz = Math.floor(board.height / 2);
				_spawnCenters.set("player", { x: cx, z: cz });
				placedCenters.push({ x: cx, z: cz });
			}
		}
	}

	// AI factions
	const aiIds = activeFactionIds
		? activeFactionIds.filter((id) => id !== playerFactionId)
		: FACTION_DEFINITIONS.map((f) => f.id).filter(
				(id) => id !== playerFactionId,
			);

	for (const factionId of aiIds) {
		const def = FACTION_DEFINITIONS.find((f) => f.id === factionId);
		if (!def) continue;
		const center = findAffinitySpawn(
			def.terrainAffinity,
			board,
			placedCenters,
			occupied,
		);
		if (center) {
			_spawnCenters.set(factionId, center);
			placedCenters.push(center);
		}
	}
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function placeRobots(
	world: World,
	flags: RobotPlacementFlag[],
	board: SimpleBoardInfo,
): void {
	const occupied = new Set<string>();

	for (const entity of world.query(UnitPos)) {
		const pos = entity.get(UnitPos);
		if (pos) occupied.add(`${pos.tileX},${pos.tileZ}`);
	}

	for (const flag of flags) {
		const spawner = SPAWNERS[flag.robotType];

		const spawnCenter = _spawnCenters.get(flag.factionId);

		for (let i = 0; i < flag.count; i++) {
			let tile: { x: number; z: number } | null = null;

			if (flag.zone === "player_start" || flag.zone === "faction_start") {
				if (spawnCenter) {
					tile = findPassableNear(
						spawnCenter.x,
						spawnCenter.z,
						10,
						board,
						occupied,
					);
				}
			} else {
				const cx = Math.floor(board.width / 2);
				const cz = Math.floor(board.height / 2);
				tile = findPassableNear(
					cx,
					cz,
					Math.max(board.width, board.height),
					board,
					occupied,
				);
			}

			if (tile) {
				spawner(world, tile.x, tile.z, flag.factionId);
				occupied.add(`${tile.x},${tile.z}`);
			}
		}
	}
}
