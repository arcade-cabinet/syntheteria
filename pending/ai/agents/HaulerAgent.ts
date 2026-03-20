import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";
import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class HaulerAgent extends SyntheteriaAgent {
	constructor(
		entityId: string,
		maxSpeed = 1,
		steeringProfile: BotSteeringProfile = "aerial_support",
		navigationProfile: BotNavigationProfile = "sector_aerial",
	) {
		super({
			entityId,
			role: "hauler",
			maxSpeed,
			steeringProfile,
			navigationProfile,
		});
	}
}
