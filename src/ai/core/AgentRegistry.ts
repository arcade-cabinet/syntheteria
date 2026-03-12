import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";

export class AgentRegistry {
	private readonly agents = new Map<string, SyntheteriaAgent>();

	register(agent: SyntheteriaAgent) {
		if (this.agents.has(agent.entityId)) {
			throw new Error(`Agent ${agent.entityId} is already registered.`);
		}

		this.agents.set(agent.entityId, agent);
		return agent;
	}

	upsert(agent: SyntheteriaAgent) {
		this.agents.set(agent.entityId, agent);
		return agent;
	}

	get(entityId: string) {
		return this.agents.get(entityId) ?? null;
	}

	remove(entityId: string) {
		return this.agents.delete(entityId);
	}

	clear() {
		this.agents.clear();
	}

	values() {
		return [...this.agents.values()];
	}

	get size() {
		return this.agents.size;
	}
}
