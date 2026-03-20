import { GameEntity, Vehicle } from "yuka";
import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { STEERING_TUNING } from "../config/behaviorProfiles";
import type {
	AgentMemoryState,
	AgentPersistenceState,
	AgentRole,
	AgentStatus,
	AgentTaskState,
} from "./types";

export interface AgentConstructionOptions {
	entityId: string;
	role: AgentRole;
	maxSpeed?: number;
	steeringProfile: BotSteeringProfile;
	navigationProfile: BotNavigationProfile;
}

export class SyntheteriaAgent extends Vehicle {
	override name: string;
	readonly entityId: string;
	readonly role: AgentRole;
	steeringProfile: BotSteeringProfile;
	navigationProfile: BotNavigationProfile;
	status: AgentStatus;
	task: AgentTaskState | null;
	memory: AgentMemoryState;

	constructor({
		entityId,
		role,
		maxSpeed = 1,
		steeringProfile,
		navigationProfile,
	}: AgentConstructionOptions) {
		super();
		this.name = entityId;
		this.entityId = entityId;
		this.role = role;
		this.steeringProfile = steeringProfile;
		this.navigationProfile = navigationProfile;
		this.maxSpeed = maxSpeed;
		this.status = "idle";
		this.task = null;
		this.memory = {
			visibleEntities: [],
			knownFacts: [],
			lastUpdatedTick: 0,
		};
		this.applyBehaviorProfile();
	}

	applyBehaviorProfile() {
		const tuning = STEERING_TUNING[this.steeringProfile];
		this.maxForce = tuning.maxForce;
		return tuning;
	}

	setTask(task: AgentTaskState | null) {
		this.task = task;
		this.status = task ? "executing_task" : "idle";
	}

	applyPersistenceState(state: AgentPersistenceState) {
		this.status = state.status;
		this.steeringProfile = state.profile.steeringProfile;
		this.navigationProfile = state.profile.navigationProfile;
		this.task = state.task
			? { ...state.task, payload: { ...state.task.payload } }
			: null;
		this.maxSpeed = state.steering.maxSpeed;
		this.memory = {
			visibleEntities: [...state.memory.visibleEntities],
			knownFacts: [...state.memory.knownFacts],
			lastUpdatedTick: state.memory.lastUpdatedTick,
		};
		this.applyBehaviorProfile();
		return this;
	}

	toPersistenceState(): AgentPersistenceState {
		const payload =
			this.task && typeof this.task.payload === "object"
				? (this.task.payload as Record<string, unknown>)
				: null;
		const targetPosition =
			payload?.destination && typeof payload.destination === "object"
				? (payload.destination as { x: number; y: number; z: number })
				: payload?.targetPosition && typeof payload.targetPosition === "object"
					? (payload.targetPosition as { x: number; y: number; z: number })
					: null;
		return {
			entityId: this.entityId,
			role: this.role,
			status: this.status,
			profile: {
				steeringProfile: this.steeringProfile,
				navigationProfile: this.navigationProfile,
			},
			task: this.task
				? { ...this.task, payload: { ...this.task.payload } }
				: null,
			steering: {
				behavior: this.steering.behaviors[0]?.constructor?.name ?? null,
				targetPosition,
				arrivalTolerance: 0.25,
				maxSpeed: this.maxSpeed,
			},
			memory: {
				visibleEntities: [...this.memory.visibleEntities],
				knownFacts: [...this.memory.knownFacts],
				lastUpdatedTick: this.memory.lastUpdatedTick,
			},
		};
	}

	static fromPersistenceState(state: AgentPersistenceState): SyntheteriaAgent {
		const agent = new SyntheteriaAgent({
			entityId: state.entityId,
			role: state.role,
			maxSpeed: state.steering.maxSpeed,
			steeringProfile: state.profile.steeringProfile,
			navigationProfile: state.profile.navigationProfile,
		});
		return agent.applyPersistenceState(state);
	}
}

export function isSyntheteriaAgent(
	value: GameEntity | SyntheteriaAgent,
): value is SyntheteriaAgent {
	return value instanceof SyntheteriaAgent;
}
