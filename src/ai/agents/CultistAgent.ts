import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class CultistAgent extends SyntheteriaAgent {
	constructor(entityId: string, maxSpeed = 1) {
		super({ entityId, role: "cultist", maxSpeed });
	}
}
