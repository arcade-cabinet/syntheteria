import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { CultistAgent } from "./CultistAgent";
import { HaulerAgent } from "./HaulerAgent";
import { HostileMachineAgent } from "./HostileMachineAgent";
import { PlayerUnitAgent } from "./PlayerUnitAgent";
import { SyntheteriaAgent } from "./SyntheteriaAgent";
import type { AgentPersistenceState, AgentRole } from "./types";

export function createAgentForRole(
	role: AgentRole,
	entityId: string,
	maxSpeed = 1,
	options?: {
		steeringProfile?: BotSteeringProfile;
		navigationProfile?: BotNavigationProfile;
	},
): SyntheteriaAgent {
	switch (role) {
		case "player_unit":
			return new PlayerUnitAgent(
				entityId,
				maxSpeed,
				options?.steeringProfile,
				options?.navigationProfile,
			);
		case "hauler":
			return new HaulerAgent(
				entityId,
				maxSpeed,
				options?.steeringProfile,
				options?.navigationProfile,
			);
		case "hostile_machine":
			return new HostileMachineAgent(
				entityId,
				maxSpeed,
				options?.steeringProfile,
				options?.navigationProfile,
			);
		case "cultist":
			return new CultistAgent(
				entityId,
				maxSpeed,
				options?.steeringProfile,
				options?.navigationProfile,
			);
		default: {
			const exhaustive: never = role;
			throw new Error(`Unsupported agent role: ${exhaustive}`);
		}
	}
}

export function rehydrateAgentFromState(
	state: AgentPersistenceState,
): SyntheteriaAgent {
	return createAgentForRole(
		state.role,
		state.entityId,
		state.steering.maxSpeed,
		state.profile,
	).applyPersistenceState(state);
}
