import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class HaulerAgent extends SyntheteriaAgent {
	constructor(entityId: string, maxSpeed = 1) {
		super({ entityId, role: "hauler", maxSpeed });
	}
}
