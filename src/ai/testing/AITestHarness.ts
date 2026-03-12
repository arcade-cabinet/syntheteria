import { PlayerUnitAgent } from "../agents/PlayerUnitAgent";
import {
	type KootaEntitySnapshot,
	KootaYukaBridge,
} from "../bridge/KootaYukaBridge";
import { AIRuntime } from "../core/AIRuntime";

export class AITestHarness {
	readonly runtime = new AIRuntime();
	readonly bridge = new KootaYukaBridge();

	spawnPlayerAgent(entity: KootaEntitySnapshot) {
		const projected = this.bridge.projectToAgentState(entity);
		const agent = new PlayerUnitAgent(
			projected.entityId,
			projected.steering.maxSpeed,
		);
		this.runtime.registerAgent(agent);
		return agent;
	}

	step(seconds: number) {
		return this.runtime.update(seconds);
	}

	reset() {
		this.runtime.reset();
	}
}
