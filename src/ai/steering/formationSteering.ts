/**
 * Formation steering for faction units.
 *
 * Adapts Yuka's OffsetPursuitBehavior to discrete tile-grid movement.
 * When 3+ units of the same faction are within 5 tiles of each other,
 * they move as a formation group. The strongest unit (highest attack)
 * becomes the leader, and followers maintain offsets around it.
 *
 * Formation offsets are arranged in a V-shape behind the leader,
 * adapting to the leader's movement direction.
 */

import type { TilePos } from "./flockingSteering";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum manhattan distance between units to form a group. */
export const FORMATION_RADIUS = 5;

/** Minimum units required to trigger formation movement. */
export const FORMATION_MIN_UNITS = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormationUnit {
	entityId: number;
	x: number;
	z: number;
	attack: number;
	factionId: string;
}

export interface FormationGroup {
	leader: FormationUnit;
	followers: FormationUnit[];
}

// ---------------------------------------------------------------------------
// Formation detection
// ---------------------------------------------------------------------------

/**
 * Find formation groups among faction units.
 *
 * Groups units that are within FORMATION_RADIUS of each other.
 * The unit with the highest attack stat becomes leader.
 * Only creates groups of FORMATION_MIN_UNITS or more.
 *
 * @param units - All units of a single faction.
 * @returns Array of formation groups.
 */
export function detectFormations(units: FormationUnit[]): FormationGroup[] {
	if (units.length < FORMATION_MIN_UNITS) return [];

	// Simple clustering: find connected components within FORMATION_RADIUS
	const visited = new Set<number>();
	const groups: FormationGroup[] = [];

	for (const unit of units) {
		if (visited.has(unit.entityId)) continue;

		// BFS to find cluster
		const cluster: FormationUnit[] = [];
		const queue = [unit];
		visited.add(unit.entityId);

		while (queue.length > 0) {
			const current = queue.shift()!;
			cluster.push(current);

			for (const other of units) {
				if (visited.has(other.entityId)) continue;
				const dist =
					Math.abs(current.x - other.x) + Math.abs(current.z - other.z);
				if (dist <= FORMATION_RADIUS) {
					visited.add(other.entityId);
					queue.push(other);
				}
			}
		}

		if (cluster.length >= FORMATION_MIN_UNITS) {
			// Leader = highest attack (ties broken by lowest entityId for determinism)
			cluster.sort((a, b) => b.attack - a.attack || a.entityId - b.entityId);
			const leader = cluster[0];
			const followers = cluster.slice(1);
			groups.push({ leader, followers });
		}
	}

	return groups;
}

// ---------------------------------------------------------------------------
// V-formation offsets
// ---------------------------------------------------------------------------

/**
 * Compute V-formation offset positions around the leader.
 *
 * Followers are arranged in a V-shape trailing behind the leader.
 * The V opens in the direction opposite to the leader's movement.
 *
 * @param leaderX - Leader's tile X.
 * @param leaderZ - Leader's tile Z.
 * @param goalX - Leader's movement goal X.
 * @param goalZ - Leader's movement goal Z.
 * @param followerCount - Number of followers to position.
 * @returns Array of target positions for each follower (in order).
 */
export function computeFormationOffsets(
	leaderX: number,
	leaderZ: number,
	goalX: number,
	goalZ: number,
	followerCount: number,
): TilePos[] {
	// Direction from leader to goal
	const dx = goalX - leaderX;
	const dz = goalZ - leaderZ;
	const len = Math.sqrt(dx * dx + dz * dz);

	// Default direction: south if no goal direction
	const dirX = len > 0 ? dx / len : 0;
	const dirZ = len > 0 ? dz / len : 1;

	// Perpendicular direction for V-spread
	const perpX = -dirZ;
	const perpZ = dirX;

	const offsets: TilePos[] = [];

	for (let i = 0; i < followerCount; i++) {
		// Alternate left/right in V-shape
		const side = i % 2 === 0 ? 1 : -1;
		const rank = Math.floor(i / 2) + 1;

		// Offset: behind leader (opposite to movement) + spread perpendicular
		const offsetX = leaderX - dirX * rank + perpX * side * rank;
		const offsetZ = leaderZ - dirZ * rank + perpZ * side * rank;

		offsets.push({
			x: Math.round(offsetX),
			z: Math.round(offsetZ),
		});
	}

	return offsets;
}

/**
 * Get the formation target position for a specific follower unit.
 *
 * If the unit is part of a formation, returns the offset position
 * it should move toward. Returns null if not in a formation.
 *
 * @param unitId - The follower unit's entity ID.
 * @param formations - Detected formation groups.
 * @param goalX - The leader's goal X (where the formation is heading).
 * @param goalZ - The leader's goal Z.
 * @returns Target tile position, or null if not in a formation.
 */
export function getFormationTarget(
	unitId: number,
	formations: FormationGroup[],
	goalX: number,
	goalZ: number,
): TilePos | null {
	for (const group of formations) {
		const followerIdx = group.followers.findIndex(
			(f) => f.entityId === unitId,
		);
		if (followerIdx === -1) continue;

		const offsets = computeFormationOffsets(
			group.leader.x,
			group.leader.z,
			goalX,
			goalZ,
			group.followers.length,
		);

		return offsets[followerIdx] ?? null;
	}

	return null;
}

/**
 * Check if a unit is the leader of any formation group.
 */
export function isFormationLeader(
	unitId: number,
	formations: FormationGroup[],
): boolean {
	return formations.some((g) => g.leader.entityId === unitId);
}
