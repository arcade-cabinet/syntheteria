import type { Entity } from "../ecs/traits";
import { AIController } from "../ecs/traits";
import { deserializeSingleAgentState } from "./serialization/AISerialization";

export function readAIState(entity: Entity) {
	const ai = entity.get(AIController);
	if (!ai?.stateJson) {
		return null;
	}
	return deserializeSingleAgentState(ai.stateJson);
}

export function isEntityExecutingAITask(entity: Entity) {
	const state = readAIState(entity);
	if (!state) {
		return false;
	}
	return state.status === "navigating" || state.status === "executing_task";
}
