import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class RivalScoutAgent extends SyntheteriaAgent {
	constructor(
		entityId: string,
		maxSpeed = 1.8,
		steeringProfile: BotSteeringProfile = "biped_scout",
		navigationProfile: BotNavigationProfile = "sector_surface_standard",
	) {
		super({
			entityId,
			role: "rival_scout",
			maxSpeed,
			steeringProfile,
			navigationProfile,
		});
	}
}
