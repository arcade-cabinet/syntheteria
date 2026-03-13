import { FollowPathBehavior, Path, SeparationBehavior, Vector3 } from "yuka";
import { getBotDefinition } from "../../bots";
import { gameplayRandom } from "../../ecs/seed";
import {
	AIController,
	Hacking,
	Identity,
	Navigation,
	Rotation,
	Signal,
	Unit,
	type UnitEntity,
	type Vec3,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	getStrengthContext,
	isRivalFaction,
	type RivalFaction,
} from "../../systems/rivalEncounters";
import { gridToWorld, worldToGrid } from "../../world/sectorCoordinates";
import {
	getSurfaceHeightAtWorldPosition,
	isPassableAtWorldPosition,
} from "../../world/structuralSpace";
import {
	createAgentForRole,
	rehydrateAgentFromState,
} from "../agents/createAgentForRole";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import type { AgentPersistenceState, AgentTaskState } from "../agents/types";
import { NAVIGATION_TUNING, STEERING_TUNING } from "../config/behaviorProfiles";
import { planAgentTask } from "../goals/WorldPlanner";
import { SectorNavigationAdapter } from "../navigation/SectorNavigationAdapter";
import { deserializeSingleAgentState } from "../serialization/AISerialization";
import {
	deriveAnimationState,
	setEntityAnimationState,
} from "../steering/AnimationState";
import { AIRuntime } from "./AIRuntime";

const AGGRO_RANGE = 6;
const PATROL_RANGE = 15;
const PATROL_CHANCE = 0.12;
const TARGET_REPATH_DISTANCE = 1.5;
const SEPARATION_RADIUS = 1.5;
const SEPARATION_WEIGHT = 0.8;
type PathNode = { q: number; r: number };

function distanceBetween(a: Vec3, b: Vec3) {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function clonePayloadRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? { ...(value as Record<string, unknown>) }
		: {};
}

function getPathPayload(payload: Record<string, unknown>): PathNode[] {
	return Array.isArray(payload.path)
		? (payload.path as PathNode[]).map((node) => ({ q: node.q, r: node.r }))
		: [];
}

function getDestinationFromPayload(payload: Record<string, unknown>) {
	const value = payload.destination ?? payload.targetPosition;
	if (!value || typeof value !== "object") {
		return null;
	}
	return value as Vec3;
}

function getPatrolTarget(from: Vec3): Vec3 | null {
	for (let attempt = 0; attempt < 5; attempt++) {
		const x = from.x + (gameplayRandom() - 0.5) * PATROL_RANGE * 2;
		const z = from.z + (gameplayRandom() - 0.5) * PATROL_RANGE * 2;
		if (isPassableAtWorldPosition(x, z)) {
			return { x, y: getSurfaceHeightAtWorldPosition(x, z), z };
		}
	}
	return null;
}

function findNearestUnitByFaction(
	origin: UnitEntity,
	faction: string,
	range: number,
) {
	let closest: UnitEntity | null = null;
	let closestDist = range;

	for (const unit of world.query(Unit, WorldPosition, Identity)) {
		if (unit === origin || unit.get(Identity)?.faction !== faction) {
			continue;
		}

		const dist = distanceBetween(
			unit.get(WorldPosition)!,
			origin.get(WorldPosition)!,
		);
		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}

	return closest;
}

export class WorldAIService {
	readonly runtime = new AIRuntime();
	private readonly navigation = new SectorNavigationAdapter();

	reset() {
		this.runtime.reset();
	}

	update(deltaSeconds: number, tick: number) {
		const aiEntities = Array.from(
			world.query(Unit, WorldPosition, Identity, Navigation, AIController),
		);
		const liveIds = new Set<string>();

		for (const entity of aiEntities) {
			const identity = entity.get(Identity)!;
			liveIds.add(identity.id);
			this.ensureAgent(entity);
		}

		for (const agent of this.runtime.registry.values()) {
			if (!liveIds.has(agent.entityId)) {
				this.runtime.removeAgent(agent.entityId);
			}
		}

		for (const entity of aiEntities) {
			this.updateAgentIntent(entity, tick);
		}

		this.runtime.update(deltaSeconds);

		for (const entity of aiEntities) {
			this.writeBack(entity, tick);
		}
	}

	issueMoveCommand(entityId: string, target: Vec3) {
		const entity = this.findControlledUnit(entityId);
		if (!entity) {
			return false;
		}
		const agent = this.ensureAgent(entity);
		this.assignPathTask(agent, entity.get(WorldPosition)!, target, {
			id: `move:${entityId}`,
			kind: "move_to_point",
			phase: "moving",
			payload: {
				commanded: true,
				targetPosition: { ...target },
			},
		});
		return true;
	}

	cancelTask(entityId: string) {
		const agent = this.runtime.registry.get(entityId);
		if (!agent) {
			return false;
		}
		agent.steering.clear();
		agent.setTask(null);
		agent.status = "idle";
		return true;
	}

	getAgentState(entityId: string): AgentPersistenceState | null {
		const agent = this.runtime.registry.get(entityId);
		return agent ? agent.toPersistenceState() : null;
	}

	private findControlledUnit(entityId: string) {
		return (
			Array.from(
				world.query(Unit, WorldPosition, Identity, Navigation, AIController),
			).find((entity) => entity.get(Identity)?.id === entityId) ?? null
		);
	}

	private ensureAgent(entity: UnitEntity) {
		const identity = entity.get(Identity)!;
		const ai = entity.get(AIController)!;
		const unit = entity.get(Unit)!;
		const position = entity.get(WorldPosition)!;
		const existing = this.runtime.registry.get(identity.id);
		const botDefinition = getBotDefinition(unit.type);
		if (existing) {
			existing.position.set(position.x, position.y, position.z);
			existing.maxSpeed = unit.speed;
			existing.steeringProfile = botDefinition.steeringProfile;
			existing.navigationProfile = botDefinition.navigationProfile;
			existing.applyBehaviorProfile();
			return existing;
		}

		const agent = ai.stateJson
			? rehydrateAgentFromState(deserializeSingleAgentState(ai.stateJson))
			: createAgentForRole(ai.role, identity.id, unit.speed, {
					steeringProfile: botDefinition.steeringProfile,
					navigationProfile: botDefinition.navigationProfile,
				});
		agent.position.set(position.x, position.y, position.z);
		agent.maxSpeed = unit.speed;
		agent.steeringProfile = botDefinition.steeringProfile;
		agent.navigationProfile = botDefinition.navigationProfile;
		agent.applyBehaviorProfile();

		if (agent.task) {
			this.applyTaskSteering(agent);
		}

		this.runtime.registerAgent(agent);
		return agent;
	}

	private updateAgentIntent(entity: UnitEntity, tick: number) {
		const ai = entity.get(AIController)!;
		const agent = this.runtime.registry.get(entity.get(Identity)!.id);
		if (!agent || !ai.enabled) {
			return;
		}

		// Preserve commanded movement unless a hack task is active.
		if (
			agent.task?.payload &&
			clonePayloadRecord(agent.task.payload).commanded &&
			agent.task.kind !== "hack_target"
		) {
			return;
		}

		// For rival scouts, widen detection range and pass strength context
		const isScout = ai.role === "rival_scout";
		const playerDetectRange = isScout ? AGGRO_RANGE * 3 : AGGRO_RANGE;

		const strengthCtx =
			isScout && isRivalFaction(entity.get(Identity)!.faction)
				? getStrengthContext(
						entity.get(Identity)!.faction as RivalFaction,
						entity.get(WorldPosition)!.x,
						entity.get(WorldPosition)!.z,
					)
				: undefined;

		const plannerDecision = planAgentTask({
			tick,
			entity,
			agent,
			nearestPlayerTarget: findNearestUnitByFaction(
				entity,
				"player",
				playerDetectRange,
			),
			nearestHostileTarget:
				findNearestUnitByFaction(entity, "feral", AGGRO_RANGE * 2) ??
				findNearestUnitByFaction(entity, "cultist", AGGRO_RANGE * 2),
			scoutStrength: strengthCtx?.scoutStrength,
			playerStrength: strengthCtx?.playerStrength,
		});

		if (plannerDecision?.task && plannerDecision.targetPosition) {
			const payload = clonePayloadRecord(agent.task?.payload);
			const lastTarget = payload.targetPosition as Vec3 | undefined;
			const nextTarget = plannerDecision.targetPosition;
			const needsRepath =
				agent.task?.kind !== plannerDecision.task.kind ||
				!lastTarget ||
				distanceBetween(lastTarget, nextTarget) > TARGET_REPATH_DISTANCE;

			if (needsRepath) {
				if (plannerDecision.task.kind === "call_lightning") {
					agent.setTask(plannerDecision.task);
					agent.status = "executing_task";
					agent.steering.clear();
				} else {
					this.assignPathTask(
						agent,
						entity.get(WorldPosition)!,
						nextTarget,
						plannerDecision.task,
					);
				}
			}
			return;
		}

		if (
			(ai.role === "hostile_machine" || ai.role === "rival_scout") &&
			!agent.task &&
			gameplayRandom() < PATROL_CHANCE
		) {
			const patrolTarget = getPatrolTarget(entity.get(WorldPosition)!);
			if (!patrolTarget) {
				return;
			}
			this.assignPathTask(agent, entity.get(WorldPosition)!, patrolTarget, {
				id: `patrol:${agent.entityId}:${tick}`,
				kind: "move_to_point",
				phase: "moving",
				payload: {
					targetPosition: { ...patrolTarget },
					issuedAtTick: tick,
				},
			});
		}
	}

	private assignPathTask(
		agent: SyntheteriaAgent,
		from: Vec3,
		to: Vec3,
		task: AgentTaskState,
	) {
		const navigationTuning = NAVIGATION_TUNING[agent.navigationProfile];
		const pathNodes =
			navigationTuning.mode === "direct_line"
				? [worldToGrid(to.x, to.z)]
				: this.navigation.findPath(from, to);
		const payloadPath = pathNodes.map((node) => ({ q: node.q, r: node.r }));
		agent.setTask({
			...task,
			payload: {
				...task.payload,
				path: payloadPath,
				destination: { ...to },
			},
		});
		agent.status = payloadPath.length === 0 ? "blocked" : "navigating";
		agent.steering.clear();
		if (payloadPath.length > 0) {
			this.applyTaskSteering(agent);
		}
	}

	private applyTaskSteering(agent: SyntheteriaAgent) {
		const payload = clonePayloadRecord(agent.task?.payload);
		const pathNodes = getPathPayload(payload);
		const steeringTuning = STEERING_TUNING[agent.steeringProfile];
		agent.steering.clear();

		const yukaPath = new Path();
		yukaPath.loop = false;
		yukaPath.add(agent.position.clone());
		for (const node of pathNodes) {
			const worldPoint = gridToWorld(node.q, node.r);
			yukaPath.add(new Vector3(worldPoint.x, worldPoint.y, worldPoint.z));
		}

		if (pathNodes.length > 0) {
			agent.steering.add(
				new FollowPathBehavior(yukaPath, steeringTuning.arrivalTolerance),
			);

			// Collision avoidance — bots repel each other while moving
			const separation = new SeparationBehavior();
			separation.weight = SEPARATION_WEIGHT;
			agent.neighborhoodRadius = SEPARATION_RADIUS;
			agent.updateNeighborhood = true;
			agent.steering.add(separation);
		}
	}

	private writeBack(entity: UnitEntity, tick: number) {
		const identity = entity.get(Identity)!;
		const ai = entity.get(AIController)!;
		const agent = this.runtime.registry.get(identity.id);
		if (!agent) {
			return;
		}

		const worldPosition = entity.get(WorldPosition)!;
		worldPosition.x = agent.position.x;
		worldPosition.y = agent.position.y;
		worldPosition.z = agent.position.z;

		const rotation = entity.get(Rotation);
		if (rotation && agent.velocity.squaredLength() > 0.0001) {
			rotation.y = Math.atan2(agent.velocity.x, agent.velocity.z);
		}

		const payload = clonePayloadRecord(agent.task?.payload);
		const destination = getDestinationFromPayload(payload);
		if (
			agent.task &&
			destination &&
			distanceBetween(worldPosition, destination) <=
				STEERING_TUNING[agent.steeringProfile].arrivalTolerance
		) {
			agent.steering.clear();
			if (agent.task.kind === "hack_target") {
				agent.task = {
					...agent.task,
					phase: "execute",
					payload: {
						...agent.task.payload,
						commanded: false,
					},
				};
				agent.status = "executing_task";
			} else {
				agent.setTask(null);
				agent.status = "idle";
			}
		}

		const navigation = entity.get(Navigation)!;
		navigation.path = getPathPayload(payload);
		navigation.pathIndex = 0;
		navigation.moving = agent.status === "navigating";

		// Derive and store animation state for the renderer
		const animState = deriveAnimationState(
			agent.status,
			agent.task?.kind ?? null,
			agent.velocity.length(),
		);
		setEntityAnimationState(identity.id, animState);

		agent.memory.lastUpdatedTick = tick;
		ai.stateJson = JSON.stringify(agent.toPersistenceState());
	}
}

export const worldAIService = new WorldAIService();

export function aiSystem(deltaSeconds: number, tick: number) {
	worldAIService.update(deltaSeconds, tick);
}

export function issueMoveCommand(entityId: string, target: Vec3) {
	return worldAIService.issueMoveCommand(entityId, target);
}

export function cancelAgentTask(entityId: string) {
	return worldAIService.cancelTask(entityId);
}

export function getAgentState(entityId: string) {
	return worldAIService.getAgentState(entityId);
}

export function resetWorldAIService() {
	worldAIService.reset();
}
