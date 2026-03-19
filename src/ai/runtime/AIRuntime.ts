/**
 * AIRuntime — Yuka EntityManager wrapper + agent registry.
 *
 * Owns all SyntheteriaAgent instances keyed by ECS entity ID.
 * Agents are created lazily when a new AI unit appears, and removed
 * when its entity is destroyed. The registry persists across turns
 * so each agent keeps its Think brain (and characterBias weights)
 * stable over the entire game.
 */

import { EntityManager } from "yuka";
import {
	type AgentSnapshot,
	SyntheteriaAgent,
} from "../agents/SyntheteriaAgent";
import {
	AttackEvaluator,
	BuildEvaluator,
	ChaseEnemyEvaluator,
	ExpandEvaluator,
	FloorMineEvaluator,
	HarvestEvaluator,
	IdleEvaluator,
	ScoutEvaluator,
} from "../goals/evaluators";

// ---------------------------------------------------------------------------
// Faction personality → GoalEvaluator characterBias mapping
// ---------------------------------------------------------------------------

interface PersonalityBias {
	attack: number;
	chase: number;
	harvest: number;
	expand: number;
	build: number;
	scout: number;
	idle: number;
	reactiveOnly: boolean;
}

/**
 * Map from FACTION_PERSONALITY values (1-3 scale) to Yuka characterBias
 * values (0-1 scale, multiplied against desirability in Think.arbitrate).
 *
 * Higher characterBias = stronger preference for that evaluator winning.
 */
function personalityToBias(personality: {
	aggression: number;
	harvestPriority: number;
	expansionPriority: number;
	defensePriority: number;
	reactiveOnly: boolean;
}): PersonalityBias {
	// Normalize 1-3 scale to 0.3-1.0 characterBias range
	const norm = (v: number) => 0.2 + (v / 3) * 0.8;

	return {
		attack: norm(personality.aggression),
		chase: norm(personality.aggression) * 0.8, // Chase slightly less than attack
		harvest: norm(personality.harvestPriority),
		expand: norm(personality.expansionPriority),
		build: Math.max(norm(personality.harvestPriority), 0.6), // All factions build — floor at 0.6
		scout: norm(personality.expansionPriority) * 0.85, // Scout correlates with expansion
		idle: norm(personality.defensePriority) * 0.5, // Defensive factions idle more
		reactiveOnly: personality.reactiveOnly,
	};
}

// Faction personality table — mirrors FACTION_PERSONALITY from aiTurnSystem
// but used for Yuka characterBias mapping.
const FACTION_PERSONALITY: Record<
	string,
	{
		aggression: number;
		harvestPriority: number;
		expansionPriority: number;
		defensePriority: number;
		reactiveOnly: boolean;
	}
> = {
	reclaimers: {
		aggression: 2,
		harvestPriority: 3,
		expansionPriority: 2,
		defensePriority: 1,
		reactiveOnly: false,
	},
	volt_collective: {
		aggression: 1,
		harvestPriority: 2,
		expansionPriority: 1,
		defensePriority: 3,
		reactiveOnly: true,
	},
	signal_choir: {
		aggression: 3,
		harvestPriority: 1,
		expansionPriority: 3,
		defensePriority: 1,
		reactiveOnly: false,
	},
	iron_creed: {
		aggression: 3,
		harvestPriority: 1,
		expansionPriority: 2,
		defensePriority: 2,
		reactiveOnly: false,
	},
};

const DEFAULT_PERSONALITY = {
	aggression: 2,
	harvestPriority: 1,
	expansionPriority: 1,
	defensePriority: 1,
	reactiveOnly: false,
};

// ---------------------------------------------------------------------------
// AIRuntime
// ---------------------------------------------------------------------------

export class AIRuntime {
	private entityManager = new EntityManager();
	private agents = new Map<number, SyntheteriaAgent>();

	/** Get or create an agent for the given entity. */
	getOrCreateAgent(snapshot: AgentSnapshot): SyntheteriaAgent {
		let agent = this.agents.get(snapshot.entityId);
		if (!agent) {
			agent = this.createAgent(snapshot);
			this.agents.set(snapshot.entityId, agent);
			this.entityManager.add(agent);
		}
		agent.syncFromSnapshot(snapshot);
		return agent;
	}

	/** Remove agents for entities that no longer exist. */
	pruneStaleAgents(liveEntityIds: Set<number>): void {
		for (const [id, agent] of this.agents) {
			if (!liveEntityIds.has(id)) {
				this.entityManager.remove(agent);
				this.agents.delete(id);
			}
		}
	}

	/** Get all registered agents. */
	allAgents(): SyntheteriaAgent[] {
		return [...this.agents.values()];
	}

	/** Number of registered agents. */
	get size(): number {
		return this.agents.size;
	}

	/** Clear all agents (e.g. on new game). */
	clear(): void {
		for (const agent of this.agents.values()) {
			this.entityManager.remove(agent);
		}
		this.agents.clear();
	}

	// -----------------------------------------------------------------------
	// Agent factory
	// -----------------------------------------------------------------------

	private createAgent(snapshot: AgentSnapshot): SyntheteriaAgent {
		const agent = new SyntheteriaAgent(snapshot.entityId, snapshot.factionId);

		const personality =
			FACTION_PERSONALITY[snapshot.factionId] ?? DEFAULT_PERSONALITY;
		const bias = personalityToBias(personality);

		// Add evaluators with characterBias from faction personality
		const attackEval = new AttackEvaluator(bias.attack);
		agent.addEvaluator(attackEval);

		const chaseEval = new ChaseEnemyEvaluator(bias.chase);
		chaseEval.reactiveOnly = bias.reactiveOnly;
		agent.addEvaluator(chaseEval);

		const harvestEval = new HarvestEvaluator(bias.harvest);
		agent.addEvaluator(harvestEval);

		const expandEval = new ExpandEvaluator(bias.expand);
		agent.addEvaluator(expandEval);

		const buildEval = new BuildEvaluator(bias.build);
		agent.addEvaluator(buildEval);

		const scoutEval = new ScoutEvaluator(bias.scout);
		agent.addEvaluator(scoutEval);

		// Floor mining bias correlates with harvest priority (backstop economy)
		const floorMineEval = new FloorMineEvaluator(bias.harvest * 0.7);
		agent.addEvaluator(floorMineEval);

		const idleEval = new IdleEvaluator(bias.idle);
		agent.addEvaluator(idleEval);

		agent.syncFromSnapshot(snapshot);
		return agent;
	}
}

// Exported for testing
export {
	FACTION_PERSONALITY,
	DEFAULT_PERSONALITY,
	personalityToBias,
	type PersonalityBias,
};
