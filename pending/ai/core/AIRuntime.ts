import { EntityManager } from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import { AgentRegistry } from "./AgentRegistry";
import { AIClock } from "./AIClock";

export class AIRuntime {
	readonly clock: AIClock;
	readonly entityManager: EntityManager;
	readonly registry: AgentRegistry;

	constructor(fixedStepSeconds = 1 / 60) {
		this.clock = new AIClock(fixedStepSeconds);
		this.entityManager = new EntityManager();
		this.registry = new AgentRegistry();
	}

	registerAgent(agent: SyntheteriaAgent) {
		this.registry.register(agent);
		this.entityManager.add(agent);
		return agent;
	}

	upsertAgent(agent: SyntheteriaAgent) {
		const existing = this.registry.get(agent.entityId);
		if (!existing) {
			this.entityManager.add(agent);
		}
		this.registry.upsert(agent);
		return agent;
	}

	removeAgent(entityId: string) {
		const agent = this.registry.get(entityId);
		if (!agent) {
			return false;
		}

		this.entityManager.remove(agent);
		return this.registry.remove(entityId);
	}

	update(deltaSeconds: number) {
		const steps = this.clock.step(deltaSeconds);
		for (let index = 0; index < steps; index++) {
			this.entityManager.update(this.clock.fixedStepSeconds);
		}
		return steps;
	}

	reset() {
		for (const agent of this.registry.values()) {
			this.entityManager.remove(agent);
		}
		this.registry.clear();
		this.clock.reset();
	}
}
