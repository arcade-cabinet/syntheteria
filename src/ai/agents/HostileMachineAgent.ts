import { SyntheteriaAgent } from "./SyntheteriaAgent";

export class HostileMachineAgent extends SyntheteriaAgent {
	constructor(entityId: string, maxSpeed = 1) {
		super({ entityId, role: "hostile_machine", maxSpeed });
	}
}
