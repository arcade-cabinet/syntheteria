/**
 * Animation state tracker for bot visual feedback.
 *
 * Maps AI agent status + task kind to a visual animation state
 * that UnitRenderer uses to determine per-frame visual behavior.
 */

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

// ─── Per-entity animation state store ────────────────────────────────────────

const entityAnimationStates = new Map<string, BotAnimationState>();

export function setEntityAnimationState(
	entityId: string,
	state: BotAnimationState,
): void {
	entityAnimationStates.set(entityId, state);
}

export function getEntityAnimationState(
	entityId: string,
): BotAnimationState {
	return entityAnimationStates.get(entityId) ?? "idle";
}

export function clearEntityAnimationStates(): void {
	entityAnimationStates.clear();
}
