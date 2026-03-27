/**
 * Global game state and simulation tick manager.
 * Bridges ECS mutable state to React via useSyncExternalStore.
 */

import { cultAISystem } from "../ai/cultBehavior";
import {
	governorTick,
	isAutoPlayEnabled,
} from "../ai/governor/PlaytestGovernor";
import { logError } from "../errors";
import { basePowerTick, baseProductionTick } from "../systems/baseManagement";
import {
	type CombatEvent,
	combatSystem,
	getLastCombatEvents,
} from "../systems/combat";
import {
	type ComputeSnapshot,
	computeSystem,
	getComputeSnapshot,
} from "../systems/compute";
import { cultEscalationSystem } from "../systems/cultEscalation";
import { enemySystem } from "../systems/enemies";
import { explorationSystem } from "../systems/exploration";
import {
	type FabricationJob,
	fabricationSystem,
	getActiveJobs,
} from "../systems/fabrication";
import { fragmentMergeSystem, type MergeEvent } from "../systems/fragmentMerge";
import {
	type GamePhaseId,
	gamePhaseSystem,
	getCurrentGamePhase,
	getCurrentPhaseDisplayName,
	getPhaseElapsedSec,
	popPhaseTransitionId,
} from "../systems/gamePhases";
import {
	getLastHackEvents,
	type HackEvent,
	hackingSystem,
} from "../systems/hacking";
import {
	getHumanTemperature,
	getHumanTemperatureTier,
	humanTemperatureSystem,
} from "../systems/humanTemperature";
import {
	getPowerSnapshot,
	type PowerSnapshot,
	powerSystem,
} from "../systems/power";
import { repairSystem } from "../systems/repair";
import {
	getResources,
	type ResourcePool,
	resourceSystem,
} from "../systems/resources";
import {
	hasPendingStoryTrigger,
	storyTriggerSystem,
} from "../systems/storyTriggers";
import {
	getAllFragments,
	type MapFragment,
	updateDisplayOffsets,
} from "./terrain";
import { Faction, Unit } from "./traits";
import { world } from "./world";

/**
 * Run a system, catching and logging any errors.
 * Systems should throw on bugs (via gameAssert / GameError).
 * The tick continues so one broken system doesn't freeze the game.
 */
function runSystem(name: string, fn: () => void): void {
	try {
		fn();
	} catch (error) {
		logError(
			error instanceof Error
				? error
				: new Error(`System '${name}' failed: ${String(error)}`),
		);
	}
}

export interface GameSnapshot {
	tick: number;
	gameSpeed: number;
	paused: boolean;
	fragments: MapFragment[];
	unitCount: number;
	enemyCount: number;
	mergeEvents: MergeEvent[];
	combatEvents: CombatEvent[];
	power: PowerSnapshot;
	resources: ResourcePool;
	fabricationJobs: FabricationJob[];
	/** Current game phase (Awakening/Expansion/War) */
	gamePhase: GamePhaseId;
	gamePhaseDisplayName: string;
	gamePhaseElapsedSec: number;
	/** Phase ID of a just-occurred transition (null if no transition this tick) */
	phaseTransitionId: GamePhaseId | null;
	/** Human temperature value (0-100) */
	humanTemperature: number;
	/** Human temperature tier name */
	humanTemperatureTier: string;
	/** Compute resource snapshot */
	compute: ComputeSnapshot;
	/** Hacking events from this tick */
	hackEvents: HackEvent[];
	/** Whether a story trigger is pending display (US-5.1) */
	hasStoryTrigger: boolean;
}

let tick = 0;
let gameSpeed = 1.0;
let paused = false;
let lastMergeEvents: MergeEvent[] = [];
const listeners = new Set<() => void>();
let snapshot: GameSnapshot | null = null;

// Game config — set once at world init, read by save system
let gameSeed = "default";
let gameDifficulty: "easy" | "normal" | "hard" = "normal";

export function setGameConfig(
	seed: string,
	difficulty: "easy" | "normal" | "hard",
) {
	gameSeed = seed;
	gameDifficulty = difficulty;
}

export function getGameConfig() {
	return { seed: gameSeed, difficulty: gameDifficulty };
}

export function getElapsedTicks(): number {
	return tick;
}

export function getRawGameSpeed(): number {
	return gameSpeed;
}

function buildSnapshot(): GameSnapshot {
	let playerCount = 0;
	let enemyCount = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "player") playerCount++;
		else enemyCount++;
	}
	return {
		tick,
		gameSpeed,
		paused,
		fragments: getAllFragments(),
		unitCount: playerCount,
		enemyCount,
		mergeEvents: lastMergeEvents,
		combatEvents: getLastCombatEvents(),
		power: getPowerSnapshot(),
		resources: getResources(),
		fabricationJobs: getActiveJobs(),
		gamePhase: getCurrentGamePhase(),
		gamePhaseDisplayName: getCurrentPhaseDisplayName(),
		gamePhaseElapsedSec: getPhaseElapsedSec(),
		phaseTransitionId: popPhaseTransitionId(),
		humanTemperature: getHumanTemperature(),
		humanTemperatureTier: getHumanTemperatureTier(),
		compute: getComputeSnapshot(),
		hackEvents: getLastHackEvents(),
		hasStoryTrigger: hasPendingStoryTrigger(),
	};
}

export function getGameSpeed(): number {
	return paused ? 0 : gameSpeed;
}

export function setGameSpeed(speed: number) {
	gameSpeed = Math.max(0.5, Math.min(4, speed));
	snapshot = null;
	notify();
}

export function togglePause() {
	paused = !paused;
	snapshot = null;
	notify();
}

export function isPaused(): boolean {
	return paused;
}

/**
 * Run one simulation tick. Called at fixed intervals adjusted by game speed.
 */
export function simulationTick() {
	if (paused) return;

	tick++;

	// Phase progression (1 tick = 1 sim second)
	runSystem("gamePhase", () => gamePhaseSystem(1.0));

	runSystem("exploration", explorationSystem);
	runSystem("fragmentMerge", () => {
		lastMergeEvents = fragmentMergeSystem();
	});
	runSystem("power", () => powerSystem(tick));
	runSystem("resources", resourceSystem);
	runSystem("repair", repairSystem);
	runSystem("fabrication", fabricationSystem);
	runSystem("compute", computeSystem);
	runSystem("enemy", enemySystem);
	runSystem("cultEscalation", () => cultEscalationSystem(1.0));
	runSystem("cultAI", cultAISystem);
	runSystem("hacking", hackingSystem);
	runSystem("combat", combatSystem);
	runSystem("basePower", () => basePowerTick(world));
	runSystem("baseProduction", () => baseProductionTick(world, 1.0));
	runSystem("humanTemperature", humanTemperatureSystem);
	runSystem("displayOffsets", updateDisplayOffsets);

	// Story triggers (US-5.1) — checks if units entered trigger rooms
	runSystem("storyTriggers", storyTriggerSystem);

	// Automated player AI (playtest governor)
	if (isAutoPlayEnabled()) {
		runSystem("governor", () => governorTick(world, tick));
	}

	snapshot = null;
	notify();
}

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getSnapshot(): GameSnapshot {
	if (!snapshot) {
		snapshot = buildSnapshot();
	}
	return snapshot;
}
