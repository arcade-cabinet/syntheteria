export type AgentRole =
	| "player_unit"
	| "hauler"
	| "hostile_machine"
	| "cultist";

export type AgentStatus =
	| "idle"
	| "navigating"
	| "executing_task"
	| "blocked"
	| "suspended";

export interface AgentTaskState {
	id: string;
	kind: string;
	phase: string;
	payload: Record<string, unknown>;
}

export interface AgentSteeringState {
	behavior: string | null;
	targetPosition: { x: number; y: number; z: number } | null;
	arrivalTolerance: number;
	maxSpeed: number;
}

export interface AgentMemoryState {
	visibleEntities: string[];
	knownFacts: string[];
	lastUpdatedTick: number;
}

export interface AgentPersistenceState {
	entityId: string;
	role: AgentRole;
	status: AgentStatus;
	task: AgentTaskState | null;
	steering: AgentSteeringState;
	memory: AgentMemoryState;
}

export interface AgentRuntimeContract {
	entityId: string;
	role: AgentRole;
	status: AgentStatus;
}
