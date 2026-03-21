/**
 * @module cultPatrols
 *
 * Stage-aware cult patrol behavior. Cult units patrol near their home POI
 * with behavior varying by escalation stage:
 *   - Wanderer (tier 0-1): random wander, flee from enemies
 *   - War Party (tier 2-3): coordinated flocking, chase enemies
 *   - Assault (tier 4+): direct attacks on buildings and units
 */

import type { World } from "koota";
import type { TilePos } from "../ai/steering/flockingSteering";
import { pickWanderTile } from "../ai/steering/wanderSteering";
import { shortestPath, tileNeighbors } from "../board/adjacency";
import type { GeneratedBoard } from "../board/types";
import { getEscalationTier } from "../robots/CultMechs";
import {
	Building,
	CultStructure,
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits";
import { runAssaultBehavior, runWarPartyBehavior } from "./cultAssaultBehavior";
import { isCultFaction, PATROL_RADIUS, readTurn } from "./cultConstants";
import { fireCultEncounter } from "./cultEncounterTracker";
import { getEscalationStage, getSectBias } from "./cultEscalation";

// ---------------------------------------------------------------------------
// Main patrol dispatcher
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

	if (stage === "war_party") {
		fireCultEncounter(world, "cult_war_party");
	}

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

	// Collect all cult unit positions for flocking neighbor lookup
	const cultPositions: TilePos[] = [];
	for (const e of world.query(UnitPos, UnitFaction)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (f && p && isCultFaction(f.factionId)) {
			cultPositions.push({ x: p.tileX, z: p.tileZ });
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

		// Build flocking neighbors: other cult units within 6 tiles
		const flockNeighbors = cultPositions.filter(
			(p) =>
				(p.x !== pos.tileX || p.z !== pos.tileZ) &&
				Math.abs(p.x - pos.tileX) + Math.abs(p.z - pos.tileZ) <= 6,
		);

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
				flockNeighbors,
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
				flockNeighbors,
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
				flockNeighbors,
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
	flockNeighbors: TilePos[] = [],
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

	// Wander within patrol radius — organic meandering via WanderBehavior
	if (!e.has(UnitMove)) {
		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		if (neighbors.length > 0) {
			// Filter candidates to those within patrol radius
			const validNeighbors = neighbors.filter((n) => {
				const dist =
					Math.abs(n.x - nearestCenter.x) + Math.abs(n.z - nearestCenter.z);
				return dist <= effectivePatrolRadius;
			});

			if (validNeighbors.length > 0) {
				// Use WanderBehavior for organic meandering instead of basic flocking
				const wanderTile = pickWanderTile(
					e.id(),
					{ x: pos.tileX, z: pos.tileZ },
					0, // heading X — wanderers have no persistent heading
					0, // heading Z
					validNeighbors,
					nearestCenter,
					effectivePatrolRadius,
					readTurn(world) * 31 + e.id() * 7,
				);

				const candidate = wanderTile ?? validNeighbors[0];
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
