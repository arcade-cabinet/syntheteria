import { type BotUnitType, getBotDefinition } from "../../bots";
import type { AgentPersistenceState } from "../agents/types";

export interface KootaEntitySnapshot {
	entityId: string;
	faction: string;
	unitType: string | null;
	buildingType: string | null;
	position: { x: number; y: number; z: number };
	speed: number | null;
	scene: "world" | "interior";
}

export interface YukaWriteback {
	entityId: string;
	position: { x: number; y: number; z: number };
	status: string;
	taskKind: string | null;
}

export interface BridgeOwnershipMatrix {
	kootaOwns: string[];
	yukaOwns: string[];
	persistenceOwns: string[];
}

export const DEFAULT_OWNERSHIP_MATRIX: BridgeOwnershipMatrix = {
	kootaOwns: [
		"identity",
		"faction",
		"world_position",
		"scene",
		"unit_type",
		"building_type",
	],
	yukaOwns: ["steering_runtime", "task_runtime", "decision_runtime"],
	persistenceOwns: ["serialized_ai_state", "route_state", "agent_memory"],
};

export class KootaYukaBridge {
	projectToAgentState(
		entity: KootaEntitySnapshot,
		persistedState?: AgentPersistenceState | null,
	): AgentPersistenceState {
		const botDefinition = entity.unitType
			? getBotDefinition(entity.unitType as BotUnitType)
			: null;
		return {
			entityId: entity.entityId,
			role: persistedState?.role ?? "player_unit",
			status: persistedState?.status ?? "idle",
			profile: persistedState?.profile ?? {
				steeringProfile: botDefinition?.steeringProfile ?? "biped_scout",
				navigationProfile:
					botDefinition?.navigationProfile ?? "sector_surface_standard",
			},
			task: persistedState?.task ?? null,
			steering: persistedState?.steering ?? {
				behavior: null,
				targetPosition: null,
				arrivalTolerance: 0.25,
				maxSpeed: entity.speed ?? 0,
			},
			memory: persistedState?.memory ?? {
				visibleEntities: [],
				knownFacts: [],
				lastUpdatedTick: 0,
			},
		};
	}

	projectToWriteback(state: AgentPersistenceState): YukaWriteback {
		return {
			entityId: state.entityId,
			position: state.steering.targetPosition ?? { x: 0, y: 0, z: 0 },
			status: state.status,
			taskKind: state.task?.kind ?? null,
		};
	}
}
