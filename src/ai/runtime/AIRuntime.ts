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
	EvadeEvaluator,
	ExpandEvaluator,
	FloorMineEvaluator,
	HarvestEvaluator,
	IdleEvaluator,
	InterposeEvaluator,
	ResearchEvaluator,
	ScoutEvaluator,
	WormholeEvaluator,
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
	evade: number;
	idle: number;
	reactiveOnly: boolean;
}

/**
 * Map from FACTION_PERSONALITY values (1-5 scale) to Yuka characterBias
 * values (0-1 scale, multiplied against desirability in Think.arbitrate).
 *
 * The wider 1-5 scale creates DRAMATICALLY different faction behaviors:
 * - 1 = 0.2 bias (nearly ignores this evaluator)
 * - 3 = 0.52 (moderate, baseline)
 * - 5 = 1.0 (maximum weight, always wins ties)
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
	// Normalize 1-5 scale to 0.2-1.0 characterBias range
	const norm = (v: number) => 0.2 + ((v - 1) / 4) * 0.8;

	return {
		attack: norm(personality.aggression),
		chase: norm(personality.aggression) * 0.8, // Chase slightly less than attack
		harvest: norm(personality.harvestPriority),
		expand: norm(personality.expansionPriority),
		build: Math.max(norm(personality.harvestPriority), 0.6), // All factions build — floor at 0.6
		scout: norm(personality.expansionPriority) * 0.85, // Scout correlates with expansion
		evade: norm(personality.defensePriority) * 0.9, // Defensive factions evade more readily
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
		harvestPriority: 5,
		expansionPriority: 3,
		defensePriority: 1,
		reactiveOnly: false,
	},
	volt_collective: {
		aggression: 1,
		harvestPriority: 3,
		expansionPriority: 1,
		defensePriority: 5,
		reactiveOnly: true,
	},
	signal_choir: {
		aggression: 4,
		harvestPriority: 1,
		expansionPriority: 5,
		defensePriority: 1,
		reactiveOnly: false,
	},
	iron_creed: {
		aggression: 5,
		harvestPriority: 1,
		expansionPriority: 3,
		defensePriority: 2,
		reactiveOnly: false,
	},
};

const DEFAULT_PERSONALITY = {
	aggression: 3,
	harvestPriority: 3,
	expansionPriority: 3,
	defensePriority: 3,
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

		// Research — all factions should research, bias from build priority
		const researchEval = new ResearchEvaluator(bias.build);
		agent.addEvaluator(researchEval);

		const scoutEval = new ScoutEvaluator(bias.scout);
		agent.addEvaluator(scoutEval);

		// Floor mining bias correlates with harvest priority (backstop economy)
		const floorMineEval = new FloorMineEvaluator(bias.harvest * 0.7);
		agent.addEvaluator(floorMineEval);

		// Evasion — flee when outnumbered by cult units
		const evadeEval = new EvadeEvaluator(bias.evade);
		agent.addEvaluator(evadeEval);

		// Interpose — support units shield threatened allies
		const interposeEval = new InterposeEvaluator(bias.evade * 0.8);
		agent.addEvaluator(interposeEval);

		// Wormhole — endgame victory pursuit (strongest faction after turn 100)
		const wormholeEval = new WormholeEvaluator(bias.expand * 0.5);
		agent.addEvaluator(wormholeEval);

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
