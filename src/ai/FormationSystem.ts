/**
 * FormationSystem -- manages squad formations using Yuka OffsetPursuitBehavior.
 *
 * The leader vehicle moves normally (via its own steering behaviors: seek,
 * arrive, wander, etc.). Follower vehicles use OffsetPursuitBehavior to
 * maintain their assigned position relative to the leader's local frame.
 *
 * Formation lifecycle:
 *   1. createFormation()   -- assigns leader + members, computes offsets,
 *                             attaches OffsetPursuit behaviors to followers.
 *   2. updateFormation()   -- called each frame to handle destroyed members,
 *                             re-computes offsets when the roster changes.
 *   3. dissolveFormation() -- removes OffsetPursuit behaviors and frees
 *                             followers to steer independently.
 *
 * Formations are stored by ID in a registry so the governor can look them up.
 */

import type { Vehicle } from "yuka";
import { OffsetPursuitBehavior, Vector3 as YukaVector3 } from "yuka";
import {
	type FormationSpacing,
	FormationType,
	getOffsets,
	type Vec3Offset,
} from "./FormationPatterns.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A member of a formation. */
export interface FormationMember {
	/** Entity ID. */
	entityId: string;
	/** The Yuka Vehicle for this entity. */
	vehicle: Vehicle;
	/** The OffsetPursuit behavior attached to this vehicle (null for the leader). */
	offsetPursuit: OffsetPursuitBehavior | null;
	/** This member's current offset from the leader. */
	offset: Vec3Offset;
}

/** A complete formation. */
export interface Formation {
	/** Unique formation ID. */
	id: string;
	/** Formation shape type. */
	type: FormationType;
	/** The leader entity ID. */
	leaderId: string;
	/** All members (leader at index 0, followers at 1+). */
	members: FormationMember[];
	/** Spacing config used for offset computation. */
	spacing: Partial<FormationSpacing>;
}

/** Options for creating a formation. */
export interface CreateFormationOptions {
	/** The leader's entity ID. */
	leaderId: string;
	/** The leader's Yuka Vehicle. */
	leaderVehicle: Vehicle;
	/** Follower entity IDs. */
	memberIds: string[];
	/** Follower Yuka Vehicles (parallel array with memberIds). */
	memberVehicles: Vehicle[];
	/** Formation shape. */
	type: FormationType;
	/** Optional spacing overrides. */
	spacing?: Partial<FormationSpacing>;
	/** Weight for the OffsetPursuit behavior. Default: 1. */
	pursuitWeight?: number;
}

// ---------------------------------------------------------------------------
// Weight for the OffsetPursuit behavior
// ---------------------------------------------------------------------------

const DEFAULT_PURSUIT_WEIGHT = 1;

// ---------------------------------------------------------------------------
// Formation registry
// ---------------------------------------------------------------------------

let nextFormationId = 1;

const formations = new Map<string, Formation>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new formation. The leader moves independently; followers get
 * OffsetPursuitBehavior attached to their Yuka Vehicles.
 *
 * @returns The created Formation.
 */
export function createFormation(options: CreateFormationOptions): Formation {
	const {
		leaderId,
		leaderVehicle,
		memberIds,
		memberVehicles,
		type,
		spacing = {},
		pursuitWeight = DEFAULT_PURSUIT_WEIGHT,
	} = options;

	if (memberIds.length !== memberVehicles.length) {
		throw new Error(
			"FormationSystem.createFormation: memberIds and memberVehicles must have the same length.",
		);
	}

	const totalCount = 1 + memberIds.length;
	const offsets = getOffsets(type, totalCount, spacing);

	const id = `formation-${nextFormationId++}`;

	// Leader member (no pursuit behavior).
	const leaderMember: FormationMember = {
		entityId: leaderId,
		vehicle: leaderVehicle,
		offsetPursuit: null,
		offset: offsets[0],
	};

	// Follower members.
	const followerMembers: FormationMember[] = memberIds.map((entityId, i) => {
		const vehicle = memberVehicles[i];
		const offset = offsets[i + 1];

		const behavior = new OffsetPursuitBehavior(
			leaderVehicle,
			new YukaVector3(offset.x, offset.y, offset.z),
		);
		behavior.active = true;
		behavior.weight = pursuitWeight;

		vehicle.steering.add(behavior);

		return {
			entityId,
			vehicle,
			offsetPursuit: behavior,
			offset,
		};
	});

	const formation: Formation = {
		id,
		type,
		leaderId,
		members: [leaderMember, ...followerMembers],
		spacing,
	};

	formations.set(id, formation);
	return formation;
}

/**
 * Update a formation each frame. Handles destroyed members by removing them
 * and re-computing offsets so the remaining members close gaps.
 *
 * @param formationId - The formation to update.
 * @param activeEntityIds - Set of entity IDs still alive in the world.
 *                          Members not in this set are removed.
 * @returns true if the formation is still valid, false if it has been
 *          dissolved (leader destroyed or no followers remain).
 */
export function updateFormation(
	formationId: string,
	activeEntityIds: ReadonlySet<string>,
): boolean {
	const formation = formations.get(formationId);
	if (!formation) return false;

	// Check if the leader is still alive.
	if (!activeEntityIds.has(formation.leaderId)) {
		dissolveFormation(formationId);
		return false;
	}

	// Find destroyed followers and remove their pursuit behaviors.
	const destroyedIndices: number[] = [];
	for (let i = 1; i < formation.members.length; i++) {
		const member = formation.members[i];
		if (!activeEntityIds.has(member.entityId)) {
			removePursuitBehavior(member);
			destroyedIndices.push(i);
		}
	}

	if (destroyedIndices.length === 0) return true;

	// Remove destroyed members (iterate in reverse to preserve indices).
	for (let i = destroyedIndices.length - 1; i >= 0; i--) {
		formation.members.splice(destroyedIndices[i], 1);
	}

	// If no followers remain, dissolve.
	if (formation.members.length <= 1) {
		formations.delete(formationId);
		return false;
	}

	// Re-compute offsets for remaining members.
	reassignOffsets(formation);

	return true;
}

/**
 * Dissolve a formation. Removes all OffsetPursuit behaviors from followers
 * so they return to independent steering.
 */
export function dissolveFormation(formationId: string): void {
	const formation = formations.get(formationId);
	if (!formation) return;

	for (let i = 1; i < formation.members.length; i++) {
		removePursuitBehavior(formation.members[i]);
	}

	formations.delete(formationId);
}

/**
 * Get a formation by ID.
 */
export function getFormation(formationId: string): Formation | undefined {
	return formations.get(formationId);
}

/**
 * Get all active formations.
 */
export function getAllFormations(): ReadonlyMap<string, Formation> {
	return formations;
}

/**
 * Remove a specific member from a formation (e.g., when re-assigned).
 * If the member is the leader, the formation is dissolved.
 * Otherwise, offsets are re-computed for the remaining members.
 *
 * @returns true if the formation still exists after removal.
 */
export function removeMember(formationId: string, entityId: string): boolean {
	const formation = formations.get(formationId);
	if (!formation) return false;

	// Removing the leader dissolves the entire formation.
	if (entityId === formation.leaderId) {
		dissolveFormation(formationId);
		return false;
	}

	const idx = formation.members.findIndex((m) => m.entityId === entityId);
	if (idx < 0) return formation.members.length > 1;

	removePursuitBehavior(formation.members[idx]);
	formation.members.splice(idx, 1);

	if (formation.members.length <= 1) {
		formations.delete(formationId);
		return false;
	}

	reassignOffsets(formation);
	return true;
}

/**
 * Change the formation type and re-compute all offsets.
 */
export function changeFormationType(
	formationId: string,
	newType: FormationType,
	newSpacing?: Partial<FormationSpacing>,
): void {
	const formation = formations.get(formationId);
	if (!formation) return;

	formation.type = newType;
	if (newSpacing !== undefined) {
		formation.spacing = newSpacing;
	}

	reassignOffsets(formation);
}

/**
 * Clear all formations. Call on game restart / scene teardown.
 */
export function clearAllFormations(): void {
	for (const formation of formations.values()) {
		for (let i = 1; i < formation.members.length; i++) {
			removePursuitBehavior(formation.members[i]);
		}
	}
	formations.clear();
	nextFormationId = 1;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Re-compute offsets for all members and update their OffsetPursuit targets. */
function reassignOffsets(formation: Formation): void {
	const offsets = getOffsets(
		formation.type,
		formation.members.length,
		formation.spacing,
	);

	for (let i = 0; i < formation.members.length; i++) {
		const member = formation.members[i];
		member.offset = offsets[i];

		if (member.offsetPursuit) {
			member.offsetPursuit.offset.set(offsets[i].x, offsets[i].y, offsets[i].z);
		}
	}
}

/** Remove the OffsetPursuit behavior from a member's vehicle. */
function removePursuitBehavior(member: FormationMember): void {
	if (member.offsetPursuit) {
		member.vehicle.steering.remove(member.offsetPursuit);
		member.offsetPursuit = null;
	}
}
