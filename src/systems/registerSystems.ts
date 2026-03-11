/**
 * System registration — imports all game systems and registers them
 * with the orchestrator in the correct phase order.
 *
 * Call registerAllSystems() once at startup, before the first orchestratorTick().
 */

import { aiCivilizationSystem } from "./aiCivilization";
// --- combat phase ---
import { combatSystem } from "./combat";
import { cubeEconomySystem } from "./cubeEconomy";
import { diplomacySystem } from "./diplomacySystem";
import { economySimulation } from "./economySimulation";
import { environmentHazardSystem } from "./environmentHazards";
import { fabricationSystem } from "./fabrication";
// --- cleanup phase ---
import { gameLoopBridge } from "./gameLoopBridge";
import { registerSystem } from "./gameLoopOrchestrator";
import { checkGameOver } from "./gameOverDetection";
// --- inputAi phase ---
import { tickGovernors } from "./governorSystem";
import { hackingSystem } from "./hacking";
// --- economy phase ---
import { miningSystem } from "./mining";
import { powerSystem } from "./power";
// --- infrastructure phase ---
import { updatePowerGrid } from "./powerRouting";
import { processingSystem } from "./processing";
import { updateQuests } from "./questSystem";
import { resourceSystem } from "./resources";
import { signalNetworkSystem } from "./signalNetwork";
import { stormEscalationSystem } from "./stormEscalation";
// --- progression phase ---
import { techResearchSystem } from "./techResearch";
// --- territory phase ---
import { territoryControlSystem } from "./territoryControl";
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

	// ── inputAi ─────────────────────────────────────────────────────
	registerSystem("inputAi", "governors", (tick) => tickGovernors(tick));
	registerSystem("inputAi", "aiCivilization", () => aiCivilizationSystem());

	// ── economy ─────────────────────────────────────────────────────
	registerSystem("economy", "mining", () => miningSystem());
	registerSystem("economy", "processing", () => processingSystem());
	registerSystem("economy", "resources", () => resourceSystem());
	registerSystem("economy", "cubeEconomy", () => cubeEconomySystem());
	registerSystem("economy", "fabrication", () => fabricationSystem());
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

	// ── territory ───────────────────────────────────────────────────
	registerSystem("territory", "territoryControl", () =>
		territoryControlSystem(),
	);
	registerSystem("territory", "diplomacy", (tick) => diplomacySystem(tick));
	// TODO: updateFogOfWar requires per-faction unit positions — needs adapter

	// ── progression ─────────────────────────────────────────────────
	registerSystem("progression", "techResearch", () => techResearchSystem({}));
	registerSystem("progression", "quests", () => updateQuests(1.0));
	registerSystem("progression", "victoryTracking", (tick) =>
		victoryTrackingSystem(tick),
	);

	// ── cleanup ─────────────────────────────────────────────────────
	registerSystem("cleanup", "gameLoopBridge", () => gameLoopBridge(1.0));
	registerSystem("cleanup", "gameOverDetection", () => checkGameOver());
}

export function resetRegistration(): void {
	registered = false;
}
