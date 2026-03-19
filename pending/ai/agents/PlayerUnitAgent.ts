import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class PlayerUnitAgent extends SyntheteriaAgent {
	constructor(
		entityId: string,
		maxSpeed = 1,
		steeringProfile: BotSteeringProfile = "biped_scout",
		navigationProfile: BotNavigationProfile = "sector_surface_standard",
	) {
		super({
			entityId,
			role: "player_unit",
			maxSpeed,
			steeringProfile,
			navigationProfile,
		});
	}
}
