/**
 * @module cultAssaultBehavior
 *
 * War Party (tier 2-3) and Assault (tier 4+) stage behavior for cult units.
 * War parties coordinate with flocking to chase enemies.
 * Assault stage charges directly at buildings and units.
 */

import type { World } from "koota";
import { pickFlockingTile } from "../ai/steering/flockingSteering";
import type { TilePos } from "../ai/steering/flockingSteering";
import { shortestPath, tileNeighbors } from "../board/adjacency";
import type { GeneratedBoard } from "../board/types";
import { UnitAttack, UnitMove } from "../traits";
import type { SectBias } from "./cultEscalation";

// ---------------------------------------------------------------------------
// Stage: War Party (tier 2-3) — coordinated groups, target territory edges
// ---------------------------------------------------------------------------

export function runWarPartyBehavior(
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
	flockNeighbors: TilePos[] = [],
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

	// Priority 2: chase enemy if within scan range (with flocking)
	if (nearestEnemy) {
		if (!e.has(UnitMove)) {
			const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
			const goalDx = nearestEnemy.x - pos.tileX;
			const goalDz = nearestEnemy.z - pos.tileZ;
			const goalLen = Math.sqrt(goalDx * goalDx + goalDz * goalDz);
			const goalDir =
				goalLen > 0
					? { dx: goalDx / goalLen, dz: goalDz / goalLen }
					: undefined;

			const flockTile = pickFlockingTile(
				{ x: pos.tileX, z: pos.tileZ },
				{ x: 0, z: 0 },
				flockNeighbors,
				neighbors,
				goalDir,
				2.0, // Strong goal weight — war parties prioritize pursuit
			);

			if (flockTile) {
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: flockTile.x,
						toZ: flockTile.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			} else {
				// Fallback to pathfinding
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
		return;
	}

	// Priority 3: move toward nearest enemy cluster with flocking
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

		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		const goalDx = closestEnemy.x - pos.tileX;
		const goalDz = closestEnemy.z - pos.tileZ;
		const goalLen = Math.sqrt(goalDx * goalDx + goalDz * goalDz);
		const goalDir =
			goalLen > 0
				? { dx: goalDx / goalLen, dz: goalDz / goalLen }
				: undefined;

		const flockTile = pickFlockingTile(
			{ x: pos.tileX, z: pos.tileZ },
			{ x: 0, z: 0 },
			flockNeighbors,
			neighbors,
			goalDir,
			2.0,
		);

		if (flockTile) {
			e.add(
				UnitMove({
					fromX: pos.tileX,
					fromZ: pos.tileZ,
					toX: flockTile.x,
					toZ: flockTile.z,
					progress: 0,
					mpCost: 1,
				}),
			);
		} else {
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
			const validNeighbors = neighbors.filter((n) => {
				const dist =
					Math.abs(n.x - nearestCenter.x) +
					Math.abs(n.z - nearestCenter.z);
				return dist <= effectivePatrolRadius;
			});

			if (validNeighbors.length > 0) {
				const flockTile = pickFlockingTile(
					{ x: pos.tileX, z: pos.tileZ },
					{ x: 0, z: 0 },
					flockNeighbors,
					validNeighbors,
				);
				const candidate = flockTile ?? validNeighbors[0];
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

export function runAssaultBehavior(
	e: ReturnType<World["query"]>[number],
	pos: { tileX: number; tileZ: number },
	stats: { scanRange: number; attackRange: number; mp: number; ap: number },
	nearestEnemy: { x: number; z: number; entityId: number } | null,
	nearestEnemyDist: number,
	buildings: Array<{ x: number; z: number; entityId: number }>,
	bias: SectBias,
	board: GeneratedBoard,
	flockNeighbors: TilePos[] = [],
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

	// Priority 2: chase enemy unit if within scan range (with flocking)
	if (nearestEnemy && nearestEnemyDist <= stats.scanRange) {
		if (!e.has(UnitMove)) {
			const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
			const goalDx = nearestEnemy.x - pos.tileX;
			const goalDz = nearestEnemy.z - pos.tileZ;
			const goalLen = Math.sqrt(goalDx * goalDx + goalDz * goalDz);
			const goalDir =
				goalLen > 0
					? { dx: goalDx / goalLen, dz: goalDz / goalLen }
					: undefined;

			const flockTile = pickFlockingTile(
				{ x: pos.tileX, z: pos.tileZ },
				{ x: 0, z: 0 },
				flockNeighbors,
				neighbors,
				goalDir,
				3.0, // Very strong goal weight in assault — converge on target
			);

			if (flockTile) {
				e.add(
					UnitMove({
						fromX: pos.tileX,
						fromZ: pos.tileZ,
						toX: flockTile.x,
						toZ: flockTile.z,
						progress: 0,
						mpCost: 1,
					}),
				);
			} else {
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
		return;
	}

	// Priority 3: charge toward nearest faction building (with flocking)
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

		const neighbors = tileNeighbors(pos.tileX, pos.tileZ, board);
		const goalDx = closestBuilding.x - pos.tileX;
		const goalDz = closestBuilding.z - pos.tileZ;
		const goalLen = Math.sqrt(goalDx * goalDx + goalDz * goalDz);
		const goalDir =
			goalLen > 0
				? { dx: goalDx / goalLen, dz: goalDz / goalLen }
				: undefined;

		const flockTile = pickFlockingTile(
			{ x: pos.tileX, z: pos.tileZ },
			{ x: 0, z: 0 },
			flockNeighbors,
			neighbors,
			goalDir,
			3.0,
		);

		if (flockTile) {
			e.add(
				UnitMove({
					fromX: pos.tileX,
					fromZ: pos.tileZ,
					toX: flockTile.x,
					toZ: flockTile.z,
					progress: 0,
					mpCost: 1,
				}),
			);
		} else {
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
