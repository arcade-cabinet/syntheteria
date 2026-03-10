/**
 * Procedural quest system — generates contextual quests based on game state.
 *
 * Quest templates produce varied quests with scaling difficulty. Quests are
 * generated periodically, have objectives, rewards, and expiry timers. Otter
 * holograms serve as quest givers.
 *
 * This is separate from the static quest sequence in questSystem.ts — it
 * generates repeatable, randomized side-quests to keep gameplay fresh.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestObjective {
	id: string;
	description: string;
	type: "gather" | "build" | "explore" | "defend" | "trade" | "discover";
	target: number;
	current: number;
	resourceType?: string;
	buildingType?: string;
	regionId?: string;
}

export interface QuestReward {
	resources: Record<string, number>;
	experience?: number;
}

export interface ProceduralQuest {
	id: string;
	title: string;
	type: string;
	objectives: QuestObjective[];
	reward: QuestReward;
	createdTick: number;
	expiryTick: number;
	status: "active" | "completed" | "expired";
	questGiver: string; // otter hologram ID
}

export interface QuestTemplate {
	type: string;
	titleTemplate: string;
	objectiveType: "gather" | "build" | "explore" | "defend" | "trade" | "discover";
	targetGenerator: (difficulty: number) => QuestObjective;
	rewardGenerator: (difficulty: number) => QuestReward;
	expiryTicks: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const _questsCfg = config.quests;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often new quests are generated (ticks). */
const GENERATION_INTERVAL = 600;

/** Maximum active quests at any time. */
const MAX_ACTIVE_QUESTS = 3;

/** Resources available for gather quests. */
const GATHER_RESOURCES = ["scrapMetal", "eWaste", "intactComponents"];

/** Building types for build quests. */
const BUILD_TYPES = ["lightning_rod", "fabrication_unit", "turret", "wall"];

/** Region names for explore quests. */
const EXPLORE_REGIONS = ["rust_wastes", "chrome_valley", "signal_flats", "iron_ridge"];

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const activeQuests: ProceduralQuest[] = [];
const completedQuests: ProceduralQuest[] = [];
let nextQuestId = 0;
let playerProgress = 0; // increases as quests complete, scales difficulty
let rngSeed = 42;

// ---------------------------------------------------------------------------
// Deterministic RNG (for testability)
// ---------------------------------------------------------------------------

function nextRng(): number {
	// Simple linear congruential generator
	rngSeed = (rngSeed * 1664525 + 1013904223) & 0x7fffffff;
	return rngSeed / 0x7fffffff;
}

function pickRandom<T>(arr: readonly T[]): T {
	const idx = Math.floor(nextRng() * arr.length);
	return arr[idx];
}

// ---------------------------------------------------------------------------
// Quest templates
// ---------------------------------------------------------------------------

function makeGatherObjective(difficulty: number): QuestObjective {
	const resource = pickRandom(GATHER_RESOURCES);
	const target = 5 + Math.floor(difficulty * 3);
	return {
		id: `obj_gather_${nextQuestId}`,
		description: `Gather ${target} ${resource}`,
		type: "gather",
		target,
		current: 0,
		resourceType: resource,
	};
}

function makeGatherReward(difficulty: number): QuestReward {
	const amount = 3 + Math.floor(difficulty * 2);
	return {
		resources: { scrapMetal: amount, eWaste: Math.floor(amount / 2) },
		experience: 10 + difficulty * 5,
	};
}

function makeBuildObjective(difficulty: number): QuestObjective {
	const building = pickRandom(BUILD_TYPES);
	const target = 1 + Math.floor(difficulty / 3);
	return {
		id: `obj_build_${nextQuestId}`,
		description: `Build ${target} ${building}`,
		type: "build",
		target,
		current: 0,
		buildingType: building,
	};
}

function makeBuildReward(difficulty: number): QuestReward {
	const amount = 5 + Math.floor(difficulty * 3);
	return {
		resources: { intactComponents: Math.ceil(amount / 2) },
		experience: 15 + difficulty * 5,
	};
}

function makeExploreObjective(_difficulty: number): QuestObjective {
	const region = pickRandom(EXPLORE_REGIONS);
	return {
		id: `obj_explore_${nextQuestId}`,
		description: `Explore the ${region} region`,
		type: "explore",
		target: 1,
		current: 0,
		regionId: region,
	};
}

function makeExploreReward(difficulty: number): QuestReward {
	return {
		resources: { scrapMetal: 8 + difficulty * 2 },
		experience: 20 + difficulty * 5,
	};
}

function makeDefendObjective(difficulty: number): QuestObjective {
	const target = 3 + Math.floor(difficulty * 2);
	return {
		id: `obj_defend_${nextQuestId}`,
		description: `Defeat ${target} hostile units`,
		type: "defend",
		target,
		current: 0,
	};
}

function makeDefendReward(difficulty: number): QuestReward {
	const amount = 4 + Math.floor(difficulty * 2);
	return {
		resources: { scrapMetal: amount, intactComponents: Math.ceil(amount / 3) },
		experience: 15 + difficulty * 8,
	};
}

function makeTradeObjective(_difficulty: number): QuestObjective {
	return {
		id: `obj_trade_${nextQuestId}`,
		description: "Complete a trade with another faction",
		type: "trade",
		target: 1,
		current: 0,
	};
}

function makeTradeReward(difficulty: number): QuestReward {
	return {
		resources: { eWaste: 5 + difficulty * 2 },
		experience: 12 + difficulty * 4,
	};
}

function makeDiscoverObjective(_difficulty: number): QuestObjective {
	return {
		id: `obj_discover_${nextQuestId}`,
		description: "Discover a new deposit or ruin",
		type: "discover",
		target: 1,
		current: 0,
	};
}

function makeDiscoverReward(difficulty: number): QuestReward {
	return {
		resources: { intactComponents: 2 + difficulty },
		experience: 25 + difficulty * 5,
	};
}

/**
 * All template expiry times must be greater than MAX_ACTIVE_QUESTS * GENERATION_INTERVAL
 * to ensure quests don't expire before the pool can fill up.
 */
const TEMPLATES: QuestTemplate[] = [
	{
		type: "gather",
		titleTemplate: "Resource Scavenge",
		objectiveType: "gather",
		targetGenerator: makeGatherObjective,
		rewardGenerator: makeGatherReward,
		expiryTicks: 3600,
	},
	{
		type: "build",
		titleTemplate: "Construction Order",
		objectiveType: "build",
		targetGenerator: makeBuildObjective,
		rewardGenerator: makeBuildReward,
		expiryTicks: 4800,
	},
	{
		type: "explore",
		titleTemplate: "Recon Mission",
		objectiveType: "explore",
		targetGenerator: makeExploreObjective,
		rewardGenerator: makeExploreReward,
		expiryTicks: 3600,
	},
	{
		type: "defend",
		titleTemplate: "Perimeter Defense",
		objectiveType: "defend",
		targetGenerator: makeDefendObjective,
		rewardGenerator: makeDefendReward,
		expiryTicks: 2400,
	},
	{
		type: "trade",
		titleTemplate: "Diplomatic Exchange",
		objectiveType: "trade",
		targetGenerator: makeTradeObjective,
		rewardGenerator: makeTradeReward,
		expiryTicks: 4800,
	},
	{
		type: "discover",
		titleTemplate: "Survey the Unknown",
		objectiveType: "discover",
		targetGenerator: makeDiscoverObjective,
		rewardGenerator: makeDiscoverReward,
		expiryTicks: 3600,
	},
];

// ---------------------------------------------------------------------------
// Otter hologram quest givers
// ---------------------------------------------------------------------------

const OTTER_HOLOGRAMS = [
	"otter_alpha",
	"otter_beta",
	"otter_gamma",
];

// ---------------------------------------------------------------------------
// Quest generation
// ---------------------------------------------------------------------------

function generateQuest(currentTick: number): ProceduralQuest {
	const template = pickRandom(TEMPLATES);
	const difficulty = Math.min(10, playerProgress);
	const id = `pquest_${nextQuestId++}`;

	const objective = template.targetGenerator(difficulty);
	const reward = template.rewardGenerator(difficulty);
	const questGiver = pickRandom(OTTER_HOLOGRAMS);

	return {
		id,
		title: template.titleTemplate,
		type: template.type,
		objectives: [objective],
		reward,
		createdTick: currentTick,
		expiryTick: currentTick + template.expiryTicks,
		status: "active",
		questGiver,
	};
}

// ---------------------------------------------------------------------------
// Expiry check
// ---------------------------------------------------------------------------

function expireQuests(currentTick: number): void {
	for (let i = activeQuests.length - 1; i >= 0; i--) {
		if (currentTick > activeQuests[i].expiryTick) {
			activeQuests[i].status = "expired";
			activeQuests.splice(i, 1);
		}
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main procedural quest system tick. Generates quests at interval,
 * checks expiry, and manages active quest pool.
 */
export function proceduralQuestSystem(currentTick: number): void {
	// Expire old quests
	expireQuests(currentTick);

	// Generate new quests at interval if below max
	if (
		currentTick > 0 &&
		currentTick % GENERATION_INTERVAL === 0 &&
		activeQuests.length < MAX_ACTIVE_QUESTS
	) {
		const quest = generateQuest(currentTick);
		activeQuests.push(quest);
	}
}

/**
 * Get all currently active quests.
 */
export function getActiveQuests(): ProceduralQuest[] {
	return [...activeQuests];
}

/**
 * Get all completed quests.
 */
export function getCompletedQuests(): ProceduralQuest[] {
	return [...completedQuests];
}

/**
 * Complete an objective within a quest. Returns true if the objective
 * was found and advanced. Automatically completes the quest when all
 * objectives are met.
 */
export function completeObjective(
	questId: string,
	objectiveId: string,
	amount = 1,
): boolean {
	const quest = activeQuests.find((q) => q.id === questId);
	if (!quest) return false;

	const objective = quest.objectives.find((o) => o.id === objectiveId);
	if (!objective) return false;

	objective.current = Math.min(objective.target, objective.current + amount);

	// Check if all objectives met
	const allComplete = quest.objectives.every(
		(o) => o.current >= o.target,
	);
	if (allComplete) {
		quest.status = "completed";
		playerProgress++;
		const idx = activeQuests.indexOf(quest);
		if (idx !== -1) activeQuests.splice(idx, 1);
		completedQuests.push(quest);
	}

	return true;
}

/**
 * Set the RNG seed for deterministic quest generation (testing).
 */
export function setRngSeed(seed: number): void {
	rngSeed = seed;
}

/**
 * Reset all procedural quest state. Primarily for testing.
 */
export function resetProceduralQuests(): void {
	activeQuests.length = 0;
	completedQuests.length = 0;
	nextQuestId = 0;
	playerProgress = 0;
	rngSeed = 42;
}
