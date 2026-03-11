/**
 * System registration — imports all game systems and registers them
 * with the orchestrator in the correct phase order.
 *
 * Call registerAllSystems() once at startup, before the first orchestratorTick().
 */

import { updateDisplayOffsets } from "../ecs/terrain";
import { aiCivilizationSystem } from "./aiCivilization";
// --- combat phase ---
import { combatSystem } from "./combat";
import { cubeEconomySystem } from "./cubeEconomy";
import { diplomacySystem } from "./diplomacySystem";
import { economySimulation } from "./economySimulation";
import { enemySystem } from "./enemies";
import { environmentHazardSystem } from "./environmentHazards";
import { explorationSystem } from "./exploration";
import { fabricationSystem } from "./fabrication";
import { fragmentMergeSystem } from "./fragmentMerge";
// --- cleanup phase ---
import { gameLoopBridge } from "./gameLoopBridge";
import { registerSystem } from "./gameLoopOrchestrator";
import { checkGameOver } from "./gameOverDetection";
// --- inputAi phase ---
import { tickGovernors } from "./governorSystem";
import { hackingSystem } from "./hacking";
// --- economy phase ---
import { miningSystem } from "./mining";
import { otterSystem } from "./otters";
import { powerSystem } from "./power";
// --- infrastructure phase ---
import { updatePowerGrid } from "./powerRouting";
import { processingSystem } from "./processing";
import { updateQuests } from "./questSystem";
import { executeRaid, getActiveRaidIds } from "./raidSystem";
import { repairSystem } from "./repair";
import { resourceSystem } from "./resources";
import { signalNetworkSystem } from "./signalNetwork";
import { stormEscalationSystem } from "./stormEscalation";
// --- progression phase ---
import { techResearchSystem } from "./techResearch";
import { getAllTerritories } from "./territory";
// --- territory phase ---
import { territoryControlSystem } from "./territoryControl";
import { applyContestationDecay } from "./territoryEffects";
import { turretSystem } from "./turret";
import { victoryTrackingSystem } from "./victoryTracking";
import { detectWallSegments } from "./wallBuilding";
// --- environment phase ---
import { weatherSystem } from "./weatherSystem";
import { wireNetworkSystem } from "./wireNetwork";

let registered = false;

export function registerAllSystems(): void {
	if (registered) return;
	registered = true;

	// ── environment ─────────────────────────────────────────────────
	registerSystem("environment", "weather", (tick) => weatherSystem(tick));
	registerSystem("environment", "stormEscalation", (tick) =>
		stormEscalationSystem(tick),
	);
	registerSystem("environment", "environmentHazards", (tick) =>
		environmentHazardSystem(tick),
	);
	registerSystem("environment", "exploration", () => explorationSystem());
	registerSystem("environment", "fragmentMerge", () => fragmentMergeSystem());
	registerSystem("environment", "otterWandering", () => otterSystem());

	// ── inputAi ─────────────────────────────────────────────────────
	registerSystem("inputAi", "governors", (tick) => tickGovernors(tick));
	registerSystem("inputAi", "aiCivilization", () => aiCivilizationSystem());

	// ── economy ─────────────────────────────────────────────────────
	registerSystem("economy", "mining", () => miningSystem());
	registerSystem("economy", "processing", () => processingSystem());
	registerSystem("economy", "resources", () => resourceSystem());
	registerSystem("economy", "cubeEconomy", () => cubeEconomySystem());
	registerSystem("economy", "fabrication", () => fabricationSystem());
	registerSystem("economy", "repair", () => repairSystem());
	registerSystem("economy", "economySimulation", (tick) =>
		economySimulation(tick),
	);

	// ── infrastructure ──────────────────────────────────────────────
	registerSystem("infrastructure", "power", (tick) => powerSystem(tick));
	registerSystem("infrastructure", "powerRouting", () => updatePowerGrid());
	registerSystem("infrastructure", "signalNetwork", () =>
		signalNetworkSystem(),
	);
	registerSystem("infrastructure", "wireNetwork", () => wireNetworkSystem());

	// ── combat ──────────────────────────────────────────────────────
	registerSystem("combat", "combat", () => combatSystem());
	registerSystem("combat", "hacking", () => hackingSystem());
	registerSystem("combat", "turrets", () => turretSystem());
	registerSystem("combat", "wallDetection", () => detectWallSegments());
	registerSystem("combat", "enemies", () => enemySystem());
	registerSystem("combat", "raids", () => {
		for (const raidId of getActiveRaidIds()) {
			executeRaid(raidId, 1);
		}
	});

	// ── territory ───────────────────────────────────────────────────
	registerSystem("territory", "territoryControl", () =>
		territoryControlSystem(),
	);
	registerSystem("territory", "contestationDecay", () =>
		applyContestationDecay([...getAllTerritories()]),
	);
	registerSystem("territory", "diplomacy", (tick) => diplomacySystem(tick));
	// TODO: updateFogOfWar requires per-faction unit positions — needs adapter

	// ── progression ─────────────────────────────────────────────────
	// techResearchSystem receives compute per faction. The orchestrator runs at 1Hz
	// so delta=1 second per tick. Each faction gets 1 compute point per second;
	// actual values should be driven by signal relay output in a future iteration.
	registerSystem("progression", "techResearch", () =>
		techResearchSystem({
			player: 1,
			reclaimers: 1,
			volt_collective: 1,
			signal_choir: 1,
			iron_creed: 1,
		}),
	);
	// updateQuests takes a delta in seconds; orchestrator fires at 1Hz so delta=1.
	registerSystem("progression", "quests", () => updateQuests(1));
	registerSystem("progression", "victoryTracking", (tick) =>
		victoryTrackingSystem(tick),
	);

	// ── cleanup ─────────────────────────────────────────────────────
	registerSystem("cleanup", "displayOffsets", () => updateDisplayOffsets());
	// gameLoopBridge takes a delta; orchestrator fires at 1Hz so delta=1 second.
	registerSystem("cleanup", "gameLoopBridge", () => gameLoopBridge(1));
	registerSystem("cleanup", "gameOverDetection", () => checkGameOver());
}

export function resetRegistration(): void {
	registered = false;
}
