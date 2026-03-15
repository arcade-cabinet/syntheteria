/**
 * Animation state tracker for bot visual feedback.
 *
 * Maps AI agent status + task kind to a visual animation state
 * that UnitRenderer uses to determine per-frame visual behavior.
 *
 * Backed by the Koota AnimationState trait on unit entities (clipName stores
 * the BotAnimationState string). The module-level Map has been removed.
 */

import type { Entity } from "../../ecs/traits";
import {
	AnimationState as AnimationStateTrait,
	Identity,
} from "../../ecs/traits";
import { units } from "../../ecs/world";

export type BotAnimationState =
	| "idle"
	| "walking"
	| "harvesting"
	| "attacking"
	| "building";

export interface AnimationStateSnapshot {
	state: BotAnimationState;
	/** Normalized progress 0..1 for states like harvesting/building */
	progress: number;
	/** Direction the bot is facing (radians), null if unchanged */
	facingDirection: number | null;
}

/**
 * Derive the visual animation state from an agent's runtime status and task.
 */
export function deriveAnimationState(
	agentStatus: string,
	taskKind: string | null,
	velocity: number,
): BotAnimationState {
	if (agentStatus === "navigating" || velocity > 0.1) {
		return "walking";
	}

	if (agentStatus === "executing_task" && taskKind) {
		switch (taskKind) {
			case "harvest":
			case "harvest_structure":
				return "harvesting";
			case "attack_target":
			case "hack_target":
				return "attacking";
			case "build_structure":
			case "repair_structure":
				return "building";
			default:
				return "idle";
		}
	}

	return "idle";
}

// ─── Per-entity animation state — backed by Koota AnimationState trait ───────

function findUnitById(id: string): Entity | null {
	for (const e of units) {
		if (e.get(Identity)?.id === id) return e;
	}
	return null;
}

export function setEntityAnimationState(
	entityId: string,
	state: BotAnimationState,
): void {
	const entity = findUnitById(entityId);
	if (!entity) return;
	const cur = entity.get(AnimationStateTrait);
	if (!cur) return;
	entity.set(AnimationStateTrait, { ...cur, clipName: state });
}

export function getEntityAnimationState(entityId: string): BotAnimationState {
	const entity = findUnitById(entityId);
	if (!entity) return "idle";
	const clipName = entity.get(AnimationStateTrait)?.clipName;
	if (!clipName) return "idle";
	return (clipName as BotAnimationState) ?? "idle";
}

export function clearEntityAnimationStates(): void {
	for (const entity of units) {
		const cur = entity.get(AnimationStateTrait);
		if (!cur) continue;
		entity.set(AnimationStateTrait, { ...cur, clipName: "" });
	}
}
