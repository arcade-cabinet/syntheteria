import type { UnitEntity, Vec3 } from "../../ecs/traits";
import {
	Hacking,
	Identity,
	type UnitEntity as RuntimeUnitEntity,
	Signal,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import type { AgentTaskState } from "../agents/types";
import {
	createWorldFactSnapshot,
	type WorldFact,
} from "../perception/WorldFacts";

export interface PlannerContext {
	tick: number;
	entity: RuntimeUnitEntity;
	agent: SyntheteriaAgent;
	nearestPlayerTarget?: RuntimeUnitEntity | null;
	nearestHostileTarget?: RuntimeUnitEntity | null;
	/** Nearby scout strength for rival_scout retreat/engage decisions */
	scoutStrength?: number;
	/** Nearby player strength for rival_scout retreat/engage decisions */
	playerStrength?: number;
}

export interface PlannerDecision {
	task: AgentTaskState | null;
	targetPosition?: Vec3 | null;
}

function createBaseFacts(context: PlannerContext) {
	const identity = context.entity.get(Identity);
	const signal = context.entity.get(Signal);
	const hack = context.entity.get(Hacking);
	const facts: WorldFact[] = [
		{ key: "role", value: context.agent.role },
		{ key: "faction", value: identity?.faction ?? "unknown" },
		{ key: "signal.connected", value: signal?.connected ?? false },
		{ key: "hack.targetId", value: hack?.targetId ?? null },
		{ key: "task.active", value: context.agent.task?.kind ?? null },
	];
	return createWorldFactSnapshot(context.agent.entityId, facts);
}

function createMoveTask(
	id: string,
	kind: AgentTaskState["kind"],
	tick: number,
	payload: Record<string, unknown>,
): AgentTaskState {
	return {
		id,
		kind,
		phase: "moving",
		payload: {
			...payload,
			issuedAtTick: tick,
		},
	};
}

export function planAgentTask(context: PlannerContext): PlannerDecision | null {
	const facts = createBaseFacts(context);
	context.agent.memory.knownFacts = facts.facts.map(
		(fact) => `${fact.key}:${String(fact.value)}`,
	);

	if (context.agent.role === "hostile_machine") {
		const target = context.nearestPlayerTarget;
		if (!target) {
			return null;
		}
		const targetPosition = target.get(WorldPosition)!;
		return {
			task: createMoveTask(
				`pursue:${context.agent.entityId}`,
				"move_to_entity",
				context.tick,
				{
					targetEntityId: target.get(Identity)?.id ?? null,
					targetPosition: { ...targetPosition },
				},
			),
			targetPosition,
		};
	}

	if (context.agent.role === "cultist") {
		const target = context.nearestPlayerTarget;
		if (!target) {
			return null;
		}
		const targetPosition = target.get(WorldPosition)!;
		const selfPosition = context.entity.get(WorldPosition)!;
		const dx = targetPosition.x - selfPosition.x;
		const dz = targetPosition.z - selfPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist <= 7) {
			return {
				task: {
					id: `lightning:${context.agent.entityId}`,
					kind: "call_lightning",
					phase: "channeling",
					payload: {
						targetEntityId: target.get(Identity)?.id ?? null,
						targetPosition: { ...targetPosition },
						issuedAtTick: context.tick,
					},
				},
				targetPosition,
			};
		}
		return {
			task: createMoveTask(
				`cultist-pursue:${context.agent.entityId}`,
				"move_to_entity",
				context.tick,
				{
					targetEntityId: target.get(Identity)?.id ?? null,
					targetPosition: { ...targetPosition },
				},
			),
			targetPosition,
		};
	}

	if (context.agent.role === "rival_scout") {
		// Rival scouts patrol toward player territory. If a player is nearby,
		// they assess force balance and either retreat or engage.
		const target = context.nearestPlayerTarget;
		if (!target) {
			return null;
		}
		const targetPosition = target.get(WorldPosition)!;
		const selfPosition = context.entity.get(WorldPosition)!;
		const dx = targetPosition.x - selfPosition.x;
		const dz = targetPosition.z - selfPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		// If player is within detection range, evaluate strength
		if (dist <= 12) {
			const scoutStrength = context.scoutStrength ?? 1;
			const playerStrength = context.playerStrength ?? 1;
			const ratio = scoutStrength / Math.max(playerStrength, 1);

			// Outmatched: retreat away from player
			if (ratio < 0.6) {
				const retreatDist = 15;
				const norm = Math.max(dist, 0.01);
				const retreatX = selfPosition.x - (dx / norm) * retreatDist;
				const retreatZ = selfPosition.z - (dz / norm) * retreatDist;
				const retreatPosition = {
					x: retreatX,
					y: selfPosition.y,
					z: retreatZ,
				};
				return {
					task: createMoveTask(
						`scout-retreat:${context.agent.entityId}`,
						"move_to_point",
						context.tick,
						{
							targetPosition: { ...retreatPosition },
							retreating: true,
						},
					),
					targetPosition: retreatPosition,
				};
			}

			// Numerical advantage: engage
			if (ratio >= 1.5) {
				return {
					task: createMoveTask(
						`scout-engage:${context.agent.entityId}`,
						"move_to_entity",
						context.tick,
						{
							targetEntityId: target.get(Identity)?.id ?? null,
							targetPosition: { ...targetPosition },
						},
					),
					targetPosition,
				};
			}
		}

		// Default: patrol toward player territory border
		return {
			task: createMoveTask(
				`scout-patrol:${context.agent.entityId}`,
				"move_to_point",
				context.tick,
				{
					targetPosition: { ...targetPosition },
					scouting: true,
				},
			),
			targetPosition,
		};
	}

	if (context.agent.role === "player_unit") {
		const hack = context.entity.get(Hacking);
		if (hack?.targetId) {
			const target =
				world
					.query(Identity, WorldPosition)
					.find((candidate) => candidate.get(Identity)?.id === hack.targetId) ??
				context.nearestHostileTarget;
			if (!target) {
				return null;
			}
			const targetPosition = target.get(WorldPosition)!;
			return {
				task: {
					id: `hack:${context.agent.entityId}:${hack.targetId}`,
					kind: "hack_target",
					phase: "approach",
					payload: {
						targetEntityId: hack.targetId,
						targetPosition: { ...targetPosition },
						issuedAtTick: context.tick,
					},
				},
				targetPosition,
			};
		}
	}

	return null;
}
