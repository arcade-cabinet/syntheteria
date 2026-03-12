import type { AgentPersistenceState } from "../agents/types";

export interface AISerializedBundle {
	version: 1;
	agents: AgentPersistenceState[];
}

export function serializeAIState(agents: AgentPersistenceState[]): string {
	const bundle: AISerializedBundle = {
		version: 1,
		agents: agents.map((agent) => ({
			...agent,
			task: agent.task
				? { ...agent.task, payload: { ...agent.task.payload } }
				: null,
			steering: {
				...agent.steering,
				targetPosition: agent.steering.targetPosition
					? { ...agent.steering.targetPosition }
					: null,
			},
			memory: {
				...agent.memory,
				visibleEntities: [...agent.memory.visibleEntities],
				knownFacts: [...agent.memory.knownFacts],
			},
		})),
	};
	return JSON.stringify(bundle);
}

export function deserializeAIState(serialized: string): AISerializedBundle {
	const parsed = JSON.parse(serialized) as AISerializedBundle;
	if (parsed.version !== 1) {
		throw new Error(`Unsupported AI serialization version: ${parsed.version}`);
	}
	return parsed;
}

export function serializeSingleAgentState(
	agent: AgentPersistenceState,
): string {
	return JSON.stringify(agent);
}

export function deserializeSingleAgentState(
	serialized: string,
): AgentPersistenceState {
	return JSON.parse(serialized) as AgentPersistenceState;
}
