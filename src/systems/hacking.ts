import { cancelAgentTask, readAIState } from "../ai";
import gameplayConfig from "../config/gameplay.json";
import type { Entity } from "../ecs/traits";
import { Hacking, Identity, Signal, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";

// Mock global compute capacity for now
export const globalCompute = {
	capacity: 0,
	demand: 0,
	available: 0,
};

export function getHackDifficulty(_target: Entity): number {
	// TODO: Calculate based on target traits, using base as fallback
	return gameplayConfig.hacking.baseDifficulty;
}

export function hackingSystem() {
	const hackers = world.query(Hacking, Signal);

	for (const entity of hackers) {
		const hack = entity.get(Hacking)!;
		const identity = entity.get(Identity);
		if (!hack.targetId) continue;

		const target = world
			.query(Identity)
			.find((e) => e.get(Identity)?.id === hack.targetId);
		if (
			!target ||
			target.get(Identity)?.faction === "player" ||
			target.get(Identity)?.faction === "cultist"
		) {
			// Invalid or unhackable target — cancel
			hack.targetId = null;
			if (identity?.id) {
				cancelAgentTask(identity.id);
			}
			hack.progress = 0;
			continue;
		}

		if (!entity.get(Signal)?.connected) {
			// Lost signal — hack paused
			continue;
		}

		const aiState = readAIState(entity);
		const targetPosition = target.get(WorldPosition);
		const sourcePosition = entity.get(WorldPosition);
		if (
			!aiState ||
			aiState.task?.kind !== "hack_target" ||
			aiState.task.phase !== "execute" ||
			!targetPosition ||
			!sourcePosition
		) {
			continue;
		}

		const dx = targetPosition.x - sourcePosition.x;
		const dz = targetPosition.z - sourcePosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > 3) {
			continue;
		}

		if (globalCompute.available < hack.computeCostPerTick) {
			// Not enough compute — hack stalls
			continue;
		}

		// Progress hack
		globalCompute.available -= hack.computeCostPerTick;
		hack.progress += hack.computeCostPerTick / getHackDifficulty(target);

		if (hack.progress >= 1.0) {
			// Success — convert target
			target.get(Identity)!.faction = "player";
			hack.targetId = null;
			hack.progress = 0;
			if (identity?.id) {
				cancelAgentTask(identity.id);
			}
		}
	}
}
