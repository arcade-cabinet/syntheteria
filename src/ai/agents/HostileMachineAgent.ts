import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class HostileMachineAgent extends SyntheteriaAgent {
	constructor(
		entityId: string,
		maxSpeed = 1,
		steeringProfile: BotSteeringProfile = "feral_quadruped",
		navigationProfile: BotNavigationProfile = "sector_surface_standard",
	) {
		super({
			entityId,
			role: "hostile_machine",
			maxSpeed,
			steeringProfile,
			navigationProfile,
		});
	}
}
