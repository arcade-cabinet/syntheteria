import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class PlayerUnitAgent extends SyntheteriaAgent {
	constructor(entityId: string, maxSpeed = 1) {
		super({ entityId, role: "player_unit", maxSpeed });
	}
}
