import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class CultistAgent extends SyntheteriaAgent {
	constructor(
		entityId: string,
		maxSpeed = 1,
		steeringProfile: BotSteeringProfile = "cult_channeler",
		navigationProfile: BotNavigationProfile = "sector_surface_standard",
	) {
		super({
			entityId,
			role: "cultist",
			maxSpeed,
			steeringProfile,
			navigationProfile,
		});
	}
}
