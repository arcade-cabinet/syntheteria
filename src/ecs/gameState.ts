/**
 * Global game state and simulation tick manager.
 * Bridges ECS mutable state to React via useSyncExternalStore.
 */

import { aiCivilizationSystem } from "../systems/aiCivilization";
import {
	type CombatEvent,
	combatSystem,
	getLastCombatEvents,
} from "../systems/combat";
import { enemySystem } from "../systems/enemies";
import { explorationSystem } from "../systems/exploration";
import {
	type FabricationJob,
	fabricationSystem,
	getActiveJobs,
} from "../systems/fabrication";
import { fragmentMergeSystem, type MergeEvent } from "../systems/fragmentMerge";
import {
	checkGameOver,
	type GameOverState,
	getGameOverState,
} from "../systems/gameOverDetection";
import { hackingSystem } from "../systems/hacking";
import { miningSystem } from "../systems/mining";
import { otterSystem } from "../systems/otters";
import {
	getPowerSnapshot,
	type PowerSnapshot,
	powerSystem,
} from "../systems/power";
import { updatePowerGrid } from "../systems/powerRouting";
import { processingSystem } from "../systems/processing";
import { updateQuests } from "../systems/questSystem";
import { executeRaid, getActiveRaidIds } from "../systems/raidSystem";
import { repairSystem } from "../systems/repair";
import {
	getResources,
	type ResourcePool,
	resourceSystem,
} from "../systems/resources";
import { signalNetworkSystem } from "../systems/signalNetwork";
import { applyTechEffects } from "../systems/techEffects";
import { updateResearch } from "../systems/techTree";
import { getAllTerritories } from "../systems/territory";
import { applyContestationDecay } from "../systems/territoryEffects";
import { turretSystem } from "../systems/turret";
import { wireNetworkSystem } from "../systems/wireNetwork";
import {
	getAllFragments,
	type MapFragment,
	updateDisplayOffsets,
} from "./terrain";
import { units } from "./world";

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
	gameOver: GameOverState | null;
}

let tick = 0;
let gameSpeed = 1.0;
let paused = false;
let lastMergeEvents: MergeEvent[] = [];
const listeners = new Set<() => void>();
let snapshot: GameSnapshot | null = null;

function buildSnapshot(): GameSnapshot {
	let playerCount = 0;
	let enemyCount = 0;
	for (const u of units) {
		if (u.faction === "player") playerCount++;
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
		gameOver: getGameOverState(),
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

/** Restore tick count from a save file. */
export function setTickCount(count: number) {
	tick = count;
	snapshot = null;
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

	explorationSystem();
	lastMergeEvents = fragmentMergeSystem();
	powerSystem(tick);
	wireNetworkSystem();
	updatePowerGrid();
	signalNetworkSystem();
	resourceSystem();
	miningSystem();
	processingSystem();
	repairSystem();
	fabricationSystem();
	hackingSystem();
	enemySystem();
	combatSystem();
	turretSystem();
	otterSystem();
	updateQuests(1);

	// Territory contestation decay (overlapping faction territories weaken)
	applyContestationDecay([...getAllTerritories()]);

	// Tech research progression for all factions
	for (const factionId of [
		"player",
		"reclaimers",
		"volt_collective",
		"signal_choir",
		"iron_creed",
	]) {
		const completedTech = updateResearch(factionId, 1);
		if (completedTech) {
			applyTechEffects(factionId);
		}
	}

	// Execute active raids (state machine advance)
	for (const raidId of getActiveRaidIds()) {
		executeRaid(raidId, 1);
	}

	// AI civilization economics (independent faction resource loops)
	aiCivilizationSystem();

	updateDisplayOffsets();

	// Check victory/loss conditions
	checkGameOver();

	snapshot = null;
	notify();
}

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

/**
 * Invalidate the snapshot and notify React subscribers.
 * Called after orchestratorTick() to trigger useSyncExternalStore re-renders.
 */
export function invalidateSnapshot() {
	snapshot = null;
	notify();
}

/**
 * Force a state change notification without running a simulation tick.
 * Used when game-relevant state changes outside the tick loop
 * (e.g., switching the active player bot).
 */
export function notifyStateChange() {
	snapshot = null;
	notify();
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
