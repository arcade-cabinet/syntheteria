import type { World } from "koota";
import { playSfx } from "../../audio/sfx";
import { shortestPath, tileNeighbors } from "../../board/adjacency";
import type { GeneratedBoard } from "../../board/types";
import {
	CULT_FINAL_ASSAULT_MULTIPLIER,
	CULT_FINAL_ASSAULT_TURN,
} from "../../config/gameDefaults";
import { pushTurnEvent } from "../../ui/game/turnEvents";
import type { StormProfile } from "../../world/config";
import { CULT_STRUCTURE_DEFS } from "../buildings/cultStructures";
import {
	CULT_MAX_ENEMIES_PER_TIER,
	CULT_TIER_UNIT_TYPES,
	getEscalationTier,
	spawnCultCavalry,
	spawnCultInfantry,
	spawnCultMechByType,
	spawnCultRanged,
} from "../robots/CultMechs";
import { Board } from "../traits/board";
import { Building } from "../traits/building";
import { CultStructure } from "../traits/cult";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits/unit";
import { pushToast } from "./toastNotifications";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_SPAWN_INTERVAL = 5;
const MIN_SPAWN_INTERVAL = 2;
const BASE_WAVE_SIZE = 1;
const MAX_WAVE_SIZE = 4;
const MAX_TOTAL_CULTISTS = 12;
const MAX_ESCALATION_TERRITORY = 80;
const CORRUPTION_NODE_CHANCE = 0.3;

/** Maximum breach altars from breach zone spawning (prevents altar sprawl). */
const MAX_BREACH_ALTARS = 6;

/** Number of POIs placed at game start on abandoned/dust terrain. */
const INITIAL_POI_COUNT_MIN = 3;
const INITIAL_POI_COUNT_MAX = 6;

/** Cult mech patrol radius around their home POI (manhattan). */
const PATROL_RADIUS = 4;

/** Floor types where cult POIs can spawn at game start. */
const CULT_TERRAIN = new Set(["collapsed_zone", "dust_district"]);

// ---------------------------------------------------------------------------
// Storm profile overrides
// ---------------------------------------------------------------------------

export interface StormCultistParams {
	baseSpawnInterval: number;
	maxWaveSize: number;
	maxTotalCultists: number;
}

const STORM_CULTIST_PARAMS: Record<StormProfile, StormCultistParams> = {
	stable: {
		baseSpawnInterval: 7,
		maxWaveSize: 2,
		maxTotalCultists: MAX_TOTAL_CULTISTS,
	},
	volatile: {
		baseSpawnInterval: BASE_SPAWN_INTERVAL,
		maxWaveSize: MAX_WAVE_SIZE,
		maxTotalCultists: MAX_TOTAL_CULTISTS,
	},
	cataclysmic: { baseSpawnInterval: 3, maxWaveSize: 6, maxTotalCultists: 20 },
};

function readStormProfile(world: World): StormProfile {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.stormProfile;
	}
	return "volatile";
}

export function getStormCultistParams(storm: StormProfile): StormCultistParams {
	return STORM_CULTIST_PARAMS[storm];
}

// ---------------------------------------------------------------------------
// Cult faction IDs
// ---------------------------------------------------------------------------

const CULT_FACTIONS = ["static_remnants", "null_monks", "lost_signal"] as const;

// ---------------------------------------------------------------------------
// Per-sect behavior profiles
// ---------------------------------------------------------------------------

/**
 * Bias profile that modifies cult unit behavior per sect:
 *   - Static Remnants: territorial, defend POIs, swarm tactics
 *   - Null Monks: stealth/ambush, target isolated units, spread corruption
 *   - Lost Signal: aggressive chargers, berserker behavior
 */
export interface SectBias {
	/** Extra patrol radius multiplier (>1 = wider patrol, <1 = tighter defense). */
	patrolRadiusMult: number;
	/** If true, prioritize isolated enemies (furthest from other enemies). */
	targetIsolated: boolean;
	/** If true, prefer attacking buildings over units in assault stage. */
	preferBuildings: boolean;
	/** Attack damage bonus (added to base 2). */
	attackBonus: number;
	/** If true, flee threshold is lower (engages more aggressively even in wanderer stage). */
	aggressive: boolean;
	/** If true, prioritize spreading corruption (stay near corruption nodes). */
	spreadCorruption: boolean;
}

export const SECT_BIASES: Record<string, SectBias> = {
	static_remnants: {
		patrolRadiusMult: 0.75, // Tight patrol — defend POIs
		targetIsolated: false,
		preferBuildings: false,
		attackBonus: 0,
		aggressive: false,
		spreadCorruption: false,
	},
	null_monks: {
		patrolRadiusMult: 1.5, // Wide patrol — ambush range
		targetIsolated: true, // Target isolated units
		preferBuildings: false,
		attackBonus: 0,
		aggressive: false,
		spreadCorruption: true, // Prioritize corruption spread
	},
	lost_signal: {
		patrolRadiusMult: 1.0,
		targetIsolated: false,
		preferBuildings: true, // Charge buildings in assault
		attackBonus: 1, // Berserker damage bonus
		aggressive: true, // Engages even in wanderer stage
		spreadCorruption: false,
	},
};

function getSectBias(factionId: string): SectBias {
	return SECT_BIASES[factionId] ?? SECT_BIASES.static_remnants;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let breachZones: Array<{ x: number; z: number }> = [];
const altarZones = new Set<string>();
const corruptedTiles = new Set<string>();
/** POI positions placed at game start (keyed by "x,z"). */
let poiPositions: Array<{ x: number; z: number }> = [];
let poisInitialized = false;

// ---------------------------------------------------------------------------
// POI initialization — place cult structures on abandoned terrain at game start
// ---------------------------------------------------------------------------

/**
 * Place 3-6 cult POIs on collapsed_zone / dust_district tiles during mapgen.
 * Each POI gets a breach_altar + 1 cult mech guard.
 * Called once at game start from initWorldFromBoard or similar.
 */
export function initCultPOIs(
	world: World,
	board: GeneratedBoard,
	seed: number,
): void {
	if (poisInitialized) return;
	poisInitialized = true;

	const { width, height } = board.config;

	// Collect candidate tiles (abandoned terrain, away from edges and center)
	const candidates: Array<{ x: number; z: number }> = [];
	const margin = Math.max(3, Math.floor(width / 8));
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);
	const centerExclusion = Math.floor(Math.min(width, height) / 4);

	for (let z = margin; z < height - margin; z++) {
		for (let x = margin; x < width - margin; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile || !tile.passable) continue;
			if (!CULT_TERRAIN.has(tile.floorType)) continue;
			// Exclude center area (player starts near center)
			const distToCenter = Math.abs(x - centerX) + Math.abs(z - centerZ);
			if (distToCenter < centerExclusion) continue;
			candidates.push({ x, z });
		}
	}

	if (candidates.length === 0) return;

	// Deterministic selection using seed
	const count =
		INITIAL_POI_COUNT_MIN +
		((seed >>> 0) % (INITIAL_POI_COUNT_MAX - INITIAL_POI_COUNT_MIN + 1));
	const poiCount = Math.min(count, candidates.length);

	// Spread POIs apart — pick candidates with minimum spacing
	const MIN_POI_SPACING = Math.max(6, Math.floor(width / 8));
	const selected: Array<{ x: number; z: number }> = [];

	// Simple greedy selection with spacing constraint
	let rng = seed >>> 0;
	for (
		let attempt = 0;
		attempt < candidates.length * 2 && selected.length < poiCount;
		attempt++
	) {
		// LCG pseudo-random
		rng = (rng * 1664525 + 1013904223) >>> 0;
		const idx = rng % candidates.length;
		const c = candidates[idx];

		// Check spacing from already-selected POIs
		const tooClose = selected.some(
			(s) => Math.abs(s.x - c.x) + Math.abs(s.z - c.z) < MIN_POI_SPACING,
		);
		if (tooClose) continue;

		selected.push(c);
	}

	// Spawn POI structures and initial cult mech guards
	for (let i = 0; i < selected.length; i++) {
		const pos = selected[i];
		poiPositions.push(pos);

		const cultFaction = CULT_FACTIONS[i % CULT_FACTIONS.length];
		const zoneKey = `${pos.x},${pos.z}`;
		altarZones.add(zoneKey);

		// Place breach altar
		const altarDef = CULT_STRUCTURE_DEFS.breach_altar;
		world.spawn(
			CultStructure({
				tileX: pos.x,
				tileZ: pos.z,
				structureType: "breach_altar",
				modelId: altarDef.modelId,
				hp: altarDef.hp,
				maxHp: altarDef.hp,
				corruptionRadius: altarDef.corruptionRadius,
				spawnsUnits: altarDef.spawnsUnits,
				spawnInterval: altarDef.spawnInterval,
			}),
		);

		// Spawn initial cult mech guard at adjacent tile
		const neighbors = tileNeighbors(pos.x, pos.z, board);
		if (neighbors.length > 0) {
			const guardTile = neighbors[i % neighbors.length];
			// Rotate mech types: infantry, ranged, cavalry
			const mechType = i % 3;
			if (mechType === 0) {
				spawnCultInfantry(world, guardTile.x, guardTile.z, cultFaction);
			} else if (mechType === 1) {
				spawnCultRanged(world, guardTile.x, guardTile.z, cultFaction);
			} else {
				spawnCultCavalry(world, guardTile.x, guardTile.z, cultFaction);
			}
		}

		// Place human shelter adjacent
		if (neighbors.length > 1) {
			const shelterTile = neighbors[(i + 1) % neighbors.length];
			const shelterDef = CULT_STRUCTURE_DEFS.human_shelter;
			world.spawn(
				CultStructure({
					tileX: shelterTile.x,
					tileZ: shelterTile.z,
					structureType: "human_shelter",
					modelId: shelterDef.modelId,
					hp: shelterDef.hp,
					maxHp: shelterDef.hp,
					corruptionRadius: shelterDef.corruptionRadius,
					spawnsUnits: shelterDef.spawnsUnits,
					spawnInterval: shelterDef.spawnInterval,
				}),
			);
		}
	}
}

export function getPOIPositions(): ReadonlyArray<{ x: number; z: number }> {
	return poiPositions;
}

// ---------------------------------------------------------------------------
// Breach zone initialization (edge spawning)
// ---------------------------------------------------------------------------

export function initBreachZones(board: GeneratedBoard): void {
	breachZones = [];
	const { width, height } = board.config;
	for (let x = 0; x < width; x += 8) {
		if (board.tiles[0]?.[x]?.passable) breachZones.push({ x, z: 0 });
		if (board.tiles[height - 1]?.[x]?.passable)
			breachZones.push({ x, z: height - 1 });
	}
	for (let z = 0; z < height; z += 8) {
		if (board.tiles[z]?.[0]?.passable) breachZones.push({ x: 0, z });
		if (board.tiles[z]?.[width - 1]?.passable)
			breachZones.push({ x: width - 1, z });
	}
}

// ---------------------------------------------------------------------------
// Structure-based spawning — altars with spawnsUnits spawn cult mechs
// ---------------------------------------------------------------------------

/**
 * Pick a cult mech type from available tier types using deterministic selection.
 */
function pickTierMechType(tier: number, salt: number): string {
	const types =
		CULT_TIER_UNIT_TYPES[Math.min(tier, CULT_TIER_UNIT_TYPES.length - 1)];
	return types[(((salt >>> 0) % types.length) + types.length) % types.length];
}

/**
 * Spawns cult mechs at structures with spawnsUnits=true at the correct interval.
 * Called each turn from checkCultistSpawn.
 */
function spawnFromStructures(
	world: World,
	board: GeneratedBoard,
	turn: number,
	maxTotal: number,
	tier: number,
): number {
	let spawned = 0;

	// Count existing cultists
	let cultistCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && isCultFaction(f.factionId)) cultistCount++;
	}

	for (const e of world.query(CultStructure)) {
		if (cultistCount + spawned >= maxTotal) break;

		const s = e.get(CultStructure);
		if (!s || !s.spawnsUnits || s.spawnInterval <= 0) continue;
		if (s.hp <= 0) continue; // Destroyed structure doesn't spawn

		// Check spawn interval
		if (turn % s.spawnInterval !== 0) continue;

		// Find adjacent passable tile for mech spawn
		const neighbors = tileNeighbors(s.tileX, s.tileZ, board);
		if (neighbors.length === 0) continue;

		const spawnTile = neighbors[turn % neighbors.length];
		const cultFaction = CULT_FACTIONS[turn % CULT_FACTIONS.length];
		const mechTypeId = pickTierMechType(tier, turn * 31 + spawned * 7);

		spawnCultMechByType(
			world,
			mechTypeId as import("../robots/CultMechs").CultMechType,
			spawnTile.x,
			spawnTile.z,
			cultFaction,
		);
		spawned++;
	}

	return spawned;
}

// ---------------------------------------------------------------------------
// Escalation stages — behavior changes with escalation tier
// ---------------------------------------------------------------------------

/**
 * Escalation stages determine cult unit behavior:
 *   - "wanderer"  (tier 0-1): random wander, flee from faction units
 *   - "war_party" (tier 2-3): coordinated groups, target faction territory edges
 *   - "assault"   (tier 4+):  direct attacks on faction buildings and units
 */
export type EscalationStage = "wanderer" | "war_party" | "assault";

export function getEscalationStage(tier: number): EscalationStage {
	if (tier <= 1) return "wanderer";
	if (tier <= 3) return "war_party";
	return "assault";
}

// ---------------------------------------------------------------------------
// Patrol behavior — cult units patrol near their home POI
// Stage-aware: wanderers flee, war parties target edges, assault charges
// ---------------------------------------------------------------------------

/**
 * Move cult units using stage-aware behavior.
 * Stage is derived from the current escalation tier.
 */
export function runCultPatrols(world: World, board: GeneratedBoard): void {
	// Determine escalation tier from total non-cult units
	let civilizedUnitCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && !isCultFaction(f.factionId)) civilizedUnitCount++;
	}
	const tier = getEscalationTier(civilizedUnitCount);
	const stage = getEscalationStage(tier);

	// Collect all altar positions as patrol centers
	const patrolCenters: Array<{ x: number; z: number }> = [];
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s) continue;
		if (
			s.structureType === "breach_altar" ||
			s.structureType === "cult_stronghold"
		) {
			patrolCenters.push({ x: s.tileX, z: s.tileZ });
		}
	}

	if (patrolCenters.length === 0) return;

	// Collect enemy positions for threat detection
	const enemyPositions: Array<{ x: number; z: number; entityId: number }> = [];
	for (const e of world.query(UnitPos, UnitFaction)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (!f || !p) continue;
		if (!isCultFaction(f.factionId)) {
			enemyPositions.push({ x: p.tileX, z: p.tileZ, entityId: e.id() });
		}
	}

	// Collect faction building positions (for assault stage targeting)
	const buildingPositions: Array<{ x: number; z: number; entityId: number }> =
		[];
	if (stage === "assault") {
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b) {
				buildingPositions.push({ x: b.tileX, z: b.tileZ, entityId: e.id() });
			}
		}
	}

	// Process each cult unit
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		const pos = e.get(UnitPos);
		const stats = e.get(UnitStats);
		if (!f || !pos || !stats) continue;
		if (!isCultFaction(f.factionId)) continue;
		if (stats.mp <= 0 && stats.ap <= 0) continue;

		// Find nearest patrol center
		let nearestCenter = patrolCenters[0];
		let nearestCenterDist = Number.POSITIVE_INFINITY;
		for (const center of patrolCenters) {
			const dist =
				Math.abs(pos.tileX - center.x) + Math.abs(pos.tileZ - center.z);
			if (dist < nearestCenterDist) {
				nearestCenterDist = dist;
				nearestCenter = center;
			}
		}

		// Check for nearby enemies within scan range
		let nearestEnemy: { x: number; z: number; entityId: number } | null = null;
		let nearestEnemyDist = Number.POSITIVE_INFINITY;
		for (const enemy of enemyPositions) {
			const dist =
				Math.abs(pos.tileX - enemy.x) + Math.abs(pos.tileZ - enemy.z);
			if (dist <= stats.scanRange && dist < nearestEnemyDist) {
				nearestEnemyDist = dist;
				nearestEnemy = enemy;
			}
		}

		const bias = getSectBias(f.factionId);
		const effectivePatrolRadius = Math.round(
			PATROL_RADIUS * bias.patrolRadiusMult,
		);

		// Null Monks: target isolated enemies (pick the one furthest from other enemies)
		let targetEnemy = nearestEnemy;
		let targetEnemyDist = nearestEnemyDist;
		if (bias.targetIsolated && enemyPositions.length > 1 && nearestEnemy) {
			let mostIsolated: { x: number; z: number; entityId: number } | null =
				null;
			let bestIsolation = -1;
			for (const enemy of enemyPositions) {
				const dist =
					Math.abs(pos.tileX - enemy.x) + Math.abs(pos.tileZ - enemy.z);
				if (dist > stats.scanRange) continue;
				// Isolation = min distance to any OTHER enemy
				let minPeerDist = Number.POSITIVE_INFINITY;
				for (const other of enemyPositions) {
					if (other.entityId === enemy.entityId) continue;
					const peerDist =
						Math.abs(enemy.x - other.x) + Math.abs(enemy.z - other.z);
					if (peerDist < minPeerDist) minPeerDist = peerDist;
				}
				if (minPeerDist > bestIsolation) {
					bestIsolation = minPeerDist;
					mostIsolated = enemy;
				}
			}
			if (mostIsolated) {
				targetEnemy = mostIsolated;
				targetEnemyDist =
					Math.abs(pos.tileX - mostIsolated.x) +
					Math.abs(pos.tileZ - mostIsolated.z);
			}
		}

		// Lost Signal: aggressive — skip wanderer stage, use war_party behavior instead
		const effectiveStage =
			stage === "wanderer" && bias.aggressive ? "war_party" : stage;

		if (effectiveStage === "wanderer") {
			runWandererBehavior(
				e,
				pos,
				stats,
				nearestCenter,
				nearestCenterDist,
				targetEnemy,
				targetEnemyDist,
				effectivePatrolRadius,
				board,
				world,
			);
		} else if (effectiveStage === "war_party") {
			runWarPartyBehavior(
				e,
				pos,
				stats,
				nearestCenter,
				nearestCenterDist,
				targetEnemy,
				targetEnemyDist,
				enemyPositions,
				effectivePatrolRadius,
				bias,
				board,
				world,
			);
		} else {
			runAssaultBehavior(
				e,
				pos,
				stats,
				targetEnemy,
				targetEnemyDist,
				buildingPositions,
				bias,
				board,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Stage: Wanderer (tier 0-1) — random movement, flee from enemies
// ---------------------------------------------------------------------------

function runWandererBehavior(
	e: ReturnType<World["query"]>[number],
	pos: { tileX: number; tileZ: number },
	stats: { scanRange: number; attackRange: number; mp: number; ap: number },
	nearestCenter: { x: number; z: number },
	nearestCenterDist: number,
	nearestEnemy: { x: number; z: number; entityId: number } | null,
	nearestEnemyDist: number,
	effectivePatrolRadius: number,
	board: GeneratedBoard,
	world: World,
): void {
	// Attack only if cornered (enemy in attack range AND no escape path)
	if (nearestEnemy && nearestEnemyDist <= stats.attackRange) {
		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		const escapeNeighbors = neighbors.filter((n) => {
			return (
				!nearestEnemy ||
				Math.abs(n.x - nearestEnemy.x) + Math.abs(n.z - nearestEnemy.z) >
					nearestEnemyDist
			);
		});
		if (escapeNeighbors.length === 0) {
			// Cornered — fight back
			if (!e.has(UnitAttack)) {
				e.add(UnitAttack({ targetEntityId: nearestEnemy.entityId, damage: 2 }));
			}
			return;
		}
	}

	// Flee from enemies within scan range
	if (nearestEnemy && nearestEnemyDist <= stats.scanRange) {
		if (!e.has(UnitMove)) {
			const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
			// Pick neighbor that maximizes distance from enemy
			let bestNeighbor = null;
			let bestDist = -1;
			for (const n of neighbors) {
				const dist =
					Math.abs(n.x - nearestEnemy.x) + Math.abs(n.z - nearestEnemy.z);
				if (dist > bestDist) {
					bestDist = dist;
					bestNeighbor = n;
				}
			}
			if (bestNeighbor) {
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: bestNeighbor.x,
						toZ: bestNeighbor.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
		return;
	}

	// Return to patrol radius if too far
	if (nearestCenterDist > effectivePatrolRadius) {
		if (!e.has(UnitMove)) {
			const path = shortestPath(
				pos.tileX,
				pos.tileZ,
				nearestCenter.x,
				nearestCenter.z,
				board,
			);
			if (path.length >= 2) {
				const next = path[1];
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: next.x,
						toZ: next.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
		return;
	}

	// Random wander within patrol radius
	if (!e.has(UnitMove)) {
		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		if (neighbors.length > 0) {
			const boardTurn = readTurn(world);
			const idx = (e.id() * 7 + boardTurn * 13) % neighbors.length;
			const candidate = neighbors[idx];
			const candidateDist =
				Math.abs(candidate.x - nearestCenter.x) +
				Math.abs(candidate.z - nearestCenter.z);
			if (candidateDist <= effectivePatrolRadius) {
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: candidate.x,
						toZ: candidate.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Stage: War Party (tier 2-3) — coordinated groups, target territory edges
// ---------------------------------------------------------------------------

function runWarPartyBehavior(
	e: ReturnType<World["query"]>[number],
	pos: { tileX: number; tileZ: number },
	stats: { scanRange: number; attackRange: number; mp: number; ap: number },
	nearestCenter: { x: number; z: number },
	nearestCenterDist: number,
	nearestEnemy: { x: number; z: number; entityId: number } | null,
	nearestEnemyDist: number,
	allEnemies: Array<{ x: number; z: number; entityId: number }>,
	effectivePatrolRadius: number,
	bias: SectBias,
	board: GeneratedBoard,
	world: World,
): void {
	// Priority 1: attack if enemy in attack range (with sect damage bonus)
	if (nearestEnemy && nearestEnemyDist <= stats.attackRange) {
		if (!e.has(UnitAttack)) {
			e.add(
				UnitAttack({
					targetEntityId: nearestEnemy.entityId,
					damage: 2 + bias.attackBonus,
				}),
			);
		}
		return;
	}

	// Priority 2: chase enemy if within scan range
	if (nearestEnemy) {
		if (!e.has(UnitMove)) {
			const path = shortestPath(
				pos.tileX,
				pos.tileZ,
				nearestEnemy.x,
				nearestEnemy.z,
				board,
			);
			if (path.length >= 2) {
				const next = path[1];
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: next.x,
						toZ: next.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
		return;
	}

	// Priority 3: move toward nearest enemy cluster (territory edge targeting)
	// Find the closest enemy overall and move toward them (even if outside scan range)
	if (allEnemies.length > 0 && !e.has(UnitMove)) {
		let closestEnemy = allEnemies[0];
		let closestDist = Number.POSITIVE_INFINITY;
		for (const enemy of allEnemies) {
			const dist =
				Math.abs(pos.tileX - enemy.x) + Math.abs(pos.tileZ - enemy.z);
			if (dist < closestDist) {
				closestDist = dist;
				closestEnemy = enemy;
			}
		}
		const path = shortestPath(
			pos.tileX,
			pos.tileZ,
			closestEnemy.x,
			closestEnemy.z,
			board,
		);
		if (path.length >= 2) {
			const next = path[1];
			e.add(
				UnitMove({
					fromX: pos.tileX,
					fromZ: pos.tileZ,
					toX: next.x,
					toZ: next.z,
					progress: 0,
					mpCost: 1,
				}),
			);
		}
		return;
	}

	// Fallback: patrol around center
	if (nearestCenterDist > effectivePatrolRadius) {
		if (!e.has(UnitMove)) {
			const path = shortestPath(
				pos.tileX,
				pos.tileZ,
				nearestCenter.x,
				nearestCenter.z,
				board,
			);
			if (path.length >= 2) {
				const next = path[1];
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: next.x,
						toZ: next.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
		return;
	}

	if (!e.has(UnitMove)) {
		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		if (neighbors.length > 0) {
			const boardTurn = readTurn(world);
			const idx = (e.id() * 7 + boardTurn * 13) % neighbors.length;
			const candidate = neighbors[idx];
			const candidateDist =
				Math.abs(candidate.x - nearestCenter.x) +
				Math.abs(candidate.z - nearestCenter.z);
			if (candidateDist <= effectivePatrolRadius) {
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: candidate.x,
						toZ: candidate.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Stage: Assault (tier 4+) — direct attacks on buildings and units
// ---------------------------------------------------------------------------

function runAssaultBehavior(
	e: ReturnType<World["query"]>[number],
	pos: { tileX: number; tileZ: number },
	stats: { scanRange: number; attackRange: number; mp: number; ap: number },
	nearestEnemy: { x: number; z: number; entityId: number } | null,
	nearestEnemyDist: number,
	buildings: Array<{ x: number; z: number; entityId: number }>,
	bias: SectBias,
	board: GeneratedBoard,
): void {
	// Priority 1: attack if enemy in attack range (with sect damage bonus)
	if (nearestEnemy && nearestEnemyDist <= stats.attackRange) {
		if (!e.has(UnitAttack)) {
			e.add(
				UnitAttack({
					targetEntityId: nearestEnemy.entityId,
					damage: 2 + bias.attackBonus,
				}),
			);
		}
		return;
	}

	// Priority 2: chase enemy unit if within scan range
	if (nearestEnemy && nearestEnemyDist <= stats.scanRange) {
		if (!e.has(UnitMove)) {
			const path = shortestPath(
				pos.tileX,
				pos.tileZ,
				nearestEnemy.x,
				nearestEnemy.z,
				board,
			);
			if (path.length >= 2) {
				const next = path[1];
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: next.x,
						toZ: next.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			}
		}
		return;
	}

	// Priority 3: charge toward nearest faction building
	if (buildings.length > 0 && !e.has(UnitMove)) {
		let closestBuilding = buildings[0];
		let closestDist = Number.POSITIVE_INFINITY;
		for (const bldg of buildings) {
			const dist = Math.abs(pos.tileX - bldg.x) + Math.abs(pos.tileZ - bldg.z);
			if (dist < closestDist) {
				closestDist = dist;
				closestBuilding = bldg;
			}
		}
		const path = shortestPath(
			pos.tileX,
			pos.tileZ,
			closestBuilding.x,
			closestBuilding.z,
			board,
		);
		if (path.length >= 2) {
			const next = path[1];
			e.add(
				UnitMove({
					fromX: pos.tileX,
					fromZ: pos.tileZ,
					toX: next.x,
					toZ: next.z,
					progress: 0,
					mpCost: 1,
				}),
			);
		}
		return;
	}

	// Priority 4: charge toward nearest enemy unit (even outside scan range)
	if (nearestEnemy && !e.has(UnitMove)) {
		const path = shortestPath(
			pos.tileX,
			pos.tileZ,
			nearestEnemy.x,
			nearestEnemy.z,
			board,
		);
		if (path.length >= 2) {
			const next = path[1];
			e.add(
				UnitMove({
					fromX: pos.tileX,
					fromZ: pos.tileZ,
					toX: next.x,
					toZ: next.z,
					progress: 0,
					mpCost: 1,
				}),
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Structure destruction — check for structures reduced to 0 HP
// ---------------------------------------------------------------------------

/**
 * Remove destroyed cult structures and log events.
 * Called each turn from the environment phase.
 */
export function cleanupDestroyedStructures(world: World): void {
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s) continue;
		if (s.hp <= 0) {
			pushTurnEvent(
				`${s.structureType.replace(/_/g, " ")} destroyed at (${s.tileX}, ${s.tileZ})`,
			);
			// Remove from altar tracking
			altarZones.delete(`${s.tileX},${s.tileZ}`);
			e.destroy();
		}
	}
}

// ---------------------------------------------------------------------------
// Main spawn + escalation loop
// ---------------------------------------------------------------------------

export function checkCultistSpawn(
	world: World,
	board: GeneratedBoard,
	turn: number,
): void {
	if (breachZones.length === 0) initBreachZones(board);

	const storm = readStormProfile(world);
	const params = STORM_CULTIST_PARAMS[storm];

	// Clean up destroyed structures first
	cleanupDestroyedStructures(world);

	// Count ALL non-cult units for escalation tier (player + AI factions).
	// Using total civilized strength ensures the cult scales with the game
	// state, not just one faction. In 4v4 games, 20+ units exist by turn 5.
	let civilizedUnitCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && !isCultFaction(f.factionId)) civilizedUnitCount++;
	}

	// Determine escalation tier based on total non-cult unit count
	const tier = getEscalationTier(civilizedUnitCount);
	const tierMaxEnemies =
		CULT_MAX_ENEMIES_PER_TIER[
			Math.min(tier, CULT_MAX_ENEMIES_PER_TIER.length - 1)
		];
	let effectiveMaxCultists = Math.min(params.maxTotalCultists, tierMaxEnemies);

	// Final assault mode after turn 300 — x5 spawn rate and cap
	const isFinalAssault = turn >= CULT_FINAL_ASSAULT_TURN;
	if (isFinalAssault) {
		effectiveMaxCultists *= CULT_FINAL_ASSAULT_MULTIPLIER;
		// One-time notification on the exact turn
		if (turn === CULT_FINAL_ASSAULT_TURN) {
			pushToast(
				"combat",
				"FINAL ASSAULT INITIATED",
				"EL CULT FORCES SURGE — ALL SECTORS COMPROMISED",
			);
			pushTurnEvent("EL CULT FINAL ASSAULT — spawn rate x5");
		}
	}

	// Spawn from existing structures (altar-based spawning)
	if (turn >= params.baseSpawnInterval) {
		const structureSpawned = spawnFromStructures(
			world,
			board,
			turn,
			effectiveMaxCultists,
			tier,
		);
		if (structureSpawned > 0) {
			playSfx("cultist_spawn");
			pushTurnEvent(
				`${structureSpawned} cult mech${structureSpawned > 1 ? "s" : ""} emerged from POI`,
			);
		}
	}

	// Recount existing cultists (includes any just spawned from structures)
	let cultistCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && isCultFaction(f.factionId)) cultistCount++;
	}
	if (cultistCount >= effectiveMaxCultists) return;

	// Escalation: spawn interval decreases, wave size increases with civilized strength
	const escalation = Math.min(1, civilizedUnitCount / MAX_ESCALATION_TERRITORY);
	const interval = Math.round(
		params.baseSpawnInterval -
			(params.baseSpawnInterval - MIN_SPAWN_INTERVAL) * escalation,
	);
	let waveSize = Math.round(
		BASE_WAVE_SIZE + (params.maxWaveSize - BASE_WAVE_SIZE) * escalation,
	);
	// Final assault: multiply wave size
	if (isFinalAssault) {
		waveSize *= CULT_FINAL_ASSAULT_MULTIPLIER;
	}

	if (turn < params.baseSpawnInterval) return;
	if (turn % interval !== 0) return;

	// Spawn wave at breach zones — use tier-based unit types
	const toSpawn = Math.min(waveSize, effectiveMaxCultists - cultistCount);
	if (toSpawn > 0) {
		playSfx("cultist_spawn");
		pushTurnEvent(
			`${toSpawn} cultist${toSpawn > 1 ? "s" : ""} spawned at breach zone`,
		);
	}
	for (let i = 0; i < toSpawn; i++) {
		const zoneIndex =
			(((turn * 31 + i * 17) % breachZones.length) + breachZones.length) %
			breachZones.length;
		const zone = breachZones[zoneIndex];
		if (!zone) continue;

		const cultFaction = CULT_FACTIONS[(turn + i) % CULT_FACTIONS.length];
		const mechTypeId = pickTierMechType(tier, turn * 13 + i * 29);

		spawnCultMechByType(
			world,
			mechTypeId as import("../robots/CultMechs").CultMechType,
			zone.x,
			zone.z,
			cultFaction,
		);

		// Spawn breach altar at this zone if one doesn't already exist (capped to prevent sprawl)
		const zoneKey = `${zone.x},${zone.z}`;
		if (!altarZones.has(zoneKey) && altarZones.size < MAX_BREACH_ALTARS) {
			altarZones.add(zoneKey);
			const altarDef = CULT_STRUCTURE_DEFS.breach_altar;
			world.spawn(
				CultStructure({
					tileX: zone.x,
					tileZ: zone.z,
					structureType: "breach_altar",
					modelId: altarDef.modelId,
					hp: altarDef.hp,
					maxHp: altarDef.hp,
					corruptionRadius: altarDef.corruptionRadius,
					spawnsUnits: altarDef.spawnsUnits,
					spawnInterval: altarDef.spawnInterval,
				}),
			);

			const neighbors = tileNeighbors(zone.x, zone.z, board);
			const shelterCount = Math.min(1 + (turn % 2), neighbors.length);
			const shelterDef = CULT_STRUCTURE_DEFS.human_shelter;
			for (let s = 0; s < shelterCount; s++) {
				const n = neighbors[s];
				world.spawn(
					CultStructure({
						tileX: n.x,
						tileZ: n.z,
						structureType: "human_shelter",
						modelId: shelterDef.modelId,
						hp: shelterDef.hp,
						maxHp: shelterDef.hp,
						corruptionRadius: shelterDef.corruptionRadius,
						spawnsUnits: shelterDef.spawnsUnits,
						spawnInterval: shelterDef.spawnInterval,
					}),
				);
			}
		}

		// 30% chance to spawn a corruption node near an existing altar
		const deterministicRoll = ((turn * 7 + i * 13) % 100) / 100;
		if (deterministicRoll < CORRUPTION_NODE_CHANCE && altarZones.size > 0) {
			const altarKeys = [...altarZones];
			const altarKey = altarKeys[(turn + i) % altarKeys.length];
			const [ax, az] = altarKey.split(",").map(Number);
			const altarNeighbors = tileNeighbors(ax, az, board);
			if (altarNeighbors.length > 0) {
				const target = altarNeighbors[(turn + i) % altarNeighbors.length];
				const nodeDef = CULT_STRUCTURE_DEFS.corruption_node;
				world.spawn(
					CultStructure({
						tileX: target.x,
						tileZ: target.z,
						structureType: "corruption_node",
						modelId: nodeDef.modelId,
						hp: nodeDef.hp,
						maxHp: nodeDef.hp,
						corruptionRadius: nodeDef.corruptionRadius,
						spawnsUnits: nodeDef.spawnsUnits,
						spawnInterval: nodeDef.spawnInterval,
					}),
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Corruption spreading
// ---------------------------------------------------------------------------

export function spreadCorruption(world: World): void {
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s || s.structureType !== "corruption_node") continue;
		const r = s.corruptionRadius;
		for (let dx = -r; dx <= r; dx++) {
			for (let dz = -r; dz <= r; dz++) {
				if (Math.abs(dx) + Math.abs(dz) <= r) {
					corruptedTiles.add(`${s.tileX + dx},${s.tileZ + dz}`);
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCultFaction(factionId: string): boolean {
	return (CULT_FACTIONS as readonly string[]).includes(factionId);
}

function readTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getCorruptedTiles(): ReadonlySet<string> {
	return corruptedTiles;
}

export function getBreachZones(): ReadonlyArray<{ x: number; z: number }> {
	return breachZones;
}

export function getAltarZones(): ReadonlySet<string> {
	return altarZones;
}

export function _reset(): void {
	breachZones = [];
	altarZones.clear();
	corruptedTiles.clear();
	poiPositions = [];
	poisInitialized = false;
}
