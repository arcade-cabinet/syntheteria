/**
 * Central system registration — wires every per-tick system into the orchestrator.
 *
 * Call registerAllSystems() once at game startup, before the first orchestratorTick().
 * Each system is wrapped to adapt its specific signature (delta, tick, complex params)
 * to the uniform SystemFn(tick: number) => void interface.
 *
 * Phase order:
 *   1. environment    — weather, storms, hazards
 *   2. inputAi        — bot commands, AI decisions, movement
 *   3. economy        — mining, harvesting, processing, crafting, trade
 *   4. infrastructure — power, wires, belts, signal, repair
 *   5. combat         — FPS combat, turrets, hacking, enemies, projectiles
 *   6. territory      — fog of war, discovery, territory control, diplomacy
 *   7. progression    — tech research, quests, victory tracking, XP
 *   8. cleanup        — notifications, particles, audio, autosave, HUD, bridge
 */

import { aiCivilizationSystem } from "./aiCivilization";
import { updatePacing } from "./aiPeacePeriod";
import { audioEventSystem } from "./audioEventSystem";
import { autosaveSystem } from "./autosaveSystem";
import { updateBeltTransport } from "./beltTransport";
import { botAutomationSystem } from "./botAutomation";
// --- Input/AI ---
import { botCommandSystem } from "./botCommand";
// --- Combat ---
import { combatSystem } from "./combat";
import { processCommands } from "./commandQueue";
import { craftingSystem } from "./craftingSystem";
import { updateProjectiles } from "./cubeAmmo";
import { cubeEconomySystem } from "./cubeEconomy";
import { cultistAISystem } from "./cultistAI";
import { diplomacySystem } from "./diplomacySystem";
import { discoverySystem } from "./discoverySystem";
import { economySimulation } from "./economySimulation";
import { enemySystem } from "./enemies";
import { environmentHazardSystem } from "./environmentHazards";
import { explorationSystem } from "./exploration";
import { fabricationSystem } from "./fabrication";
// --- Territory ---
import { fogOfWarManagerSystem } from "./fogOfWarManager";
import { fpsCombatSystem } from "./fpsCombat";
import { fragmentMergeSystem } from "./fragmentMerge";
import { bridgeTick } from "./gameLoopBridge";
import { registerSystem } from "./gameLoopOrchestrator";
import { tickGovernors } from "./governorSystem";
import { hackingSystem } from "./hacking";
import { harvestCompressSystem } from "./harvestCompress";
import { hudTick } from "./hudState";
// --- Economy ---
import { miningSystem } from "./mining";
import { movementSystem } from "./movement";
import { updateNoiseEvents } from "./noiseAttraction";
// --- Cleanup ---
import { notificationSystem } from "./notificationSystem";
import { otterSystem } from "./otters";
import { particleEmitterSystem } from "./particleEmitterSystem";
// --- Infrastructure ---
import { powerSystem } from "./power";
import { proceduralQuestSystem } from "./proceduralQuests";
import { processingSystem } from "./processing";
// --- Progression ---
import { progressionSystem } from "./progressionSystem";
import { updateDialogue } from "./questDialogue";
import { updateQuests } from "./questSystem";
import { repairSystem } from "./repair";
import { resourceFlowSystem } from "./resourceFlowTracker";
import { resourceSystem } from "./resources";
import { signalNetworkSystem } from "./signalNetwork";
import { stormEscalationSystem } from "./stormEscalation";
import { updateForecast } from "./stormForecast";
import { techResearchSystem } from "./techResearch";
import { territoryControlSystem } from "./territoryControl";
import { tradeRouteSystem } from "./tradeRouteSystem";
import { turretSystem } from "./turret";
import { syncTutorialToOtter } from "./tutorialOtterBridge";
import { victoryTrackingSystem } from "./victoryTracking";
// --- Environment ---
import { weatherSystem } from "./weatherSystem";
import { wireNetworkSystem } from "./wireNetwork";

/** Fixed timestep for delta-based systems (assumes 60 FPS). */
const FIXED_DELTA = 1 / 60;

/**
 * Register all game systems into the orchestrator's phase-based tick loop.
 *
 * Systems that take `delta` receive FIXED_DELTA (1/60s).
 * Systems that take complex params (e.g. fogOfWarManagerSystem) receive
 * safe defaults — real data feeding comes from higher-level integration.
 * Systems that return values have their returns silently discarded.
 */
export function registerAllSystems(): void {
	// -------------------------------------------------------------------
	// Phase 1: Environment
	// -------------------------------------------------------------------
	registerSystem("environment", "weatherSystem", (tick) => weatherSystem(tick));
	registerSystem("environment", "environmentHazardSystem", (tick) =>
		environmentHazardSystem(tick),
	);
	registerSystem("environment", "stormEscalationSystem", (tick) =>
		stormEscalationSystem(tick),
	);
	registerSystem("environment", "stormForecast", (tick) =>
		updateForecast(tick),
	);

	// -------------------------------------------------------------------
	// Phase 2: Input/AI
	// -------------------------------------------------------------------
	registerSystem("inputAi", "botCommandSystem", (tick) =>
		botCommandSystem(tick),
	);
	registerSystem("inputAi", "botAutomationSystem", () =>
		botAutomationSystem(FIXED_DELTA),
	);
	registerSystem("inputAi", "movementSystem", () =>
		movementSystem(FIXED_DELTA, 1),
	);
	registerSystem("inputAi", "aiCivilizationSystem", () =>
		aiCivilizationSystem(),
	);
	registerSystem("inputAi", "tickGovernors", (tick) => {
		tickGovernors(tick);
	});
	registerSystem("inputAi", "aiPeacePeriod", (tick) => updatePacing(tick));

	// -------------------------------------------------------------------
	// Phase 3: Economy
	// -------------------------------------------------------------------
	registerSystem("economy", "miningSystem", () => miningSystem());
	registerSystem("economy", "harvestCompressSystem", () => {
		harvestCompressSystem();
	});
	registerSystem("economy", "processingSystem", () => processingSystem());
	registerSystem("economy", "fabricationSystem", () => fabricationSystem());
	registerSystem("economy", "craftingSystem", (tick) => {
		craftingSystem(tick);
	});
	registerSystem("economy", "cubeEconomySystem", () => {
		cubeEconomySystem();
	});
	registerSystem("economy", "tradeRouteSystem", (tick) =>
		tradeRouteSystem(tick),
	);
	registerSystem("economy", "resourceSystem", () => resourceSystem());
	registerSystem("economy", "resourceFlowSystem", (tick) =>
		resourceFlowSystem(tick),
	);
	registerSystem("economy", "fragmentMergeSystem", () => {
		fragmentMergeSystem();
	});
	registerSystem("economy", "economySimulation", (tick) =>
		economySimulation(tick),
	);

	// -------------------------------------------------------------------
	// Phase 4: Infrastructure
	// -------------------------------------------------------------------
	registerSystem("infrastructure", "powerSystem", (tick) => powerSystem(tick));
	registerSystem("infrastructure", "wireNetworkSystem", () =>
		wireNetworkSystem(),
	);
	registerSystem("infrastructure", "signalNetworkSystem", () =>
		signalNetworkSystem(),
	);
	registerSystem("infrastructure", "beltTransport", () =>
		updateBeltTransport(FIXED_DELTA),
	);
	registerSystem("infrastructure", "repairSystem", () => repairSystem());

	// -------------------------------------------------------------------
	// Phase 5: Combat
	// -------------------------------------------------------------------
	registerSystem("combat", "combatSystem", () => combatSystem());
	registerSystem("combat", "fpsCombatSystem", () =>
		fpsCombatSystem(FIXED_DELTA),
	);
	registerSystem("combat", "turretSystem", () => turretSystem());
	registerSystem("combat", "hackingSystem", () => hackingSystem());
	registerSystem("combat", "enemySystem", () => enemySystem());
	registerSystem("combat", "cultistAISystem", () =>
		cultistAISystem(FIXED_DELTA),
	);
	registerSystem("combat", "cubeAmmo", () => {
		updateProjectiles(FIXED_DELTA);
	});

	// -------------------------------------------------------------------
	// Phase 6: Territory
	// -------------------------------------------------------------------
	registerSystem("territory", "fogOfWarManager", () =>
		fogOfWarManagerSystem(new Map()),
	);
	registerSystem("territory", "discoverySystem", () => discoverySystem());
	registerSystem("territory", "territoryControlSystem", () =>
		territoryControlSystem(),
	);
	registerSystem("territory", "diplomacySystem", (tick) =>
		diplomacySystem(tick),
	);
	registerSystem("territory", "explorationSystem", () => explorationSystem());

	// -------------------------------------------------------------------
	// Phase 7: Progression
	// -------------------------------------------------------------------
	registerSystem("progression", "progressionSystem", (tick) =>
		progressionSystem(tick),
	);
	registerSystem("progression", "techResearchSystem", () => {
		techResearchSystem({});
	});
	registerSystem("progression", "victoryTrackingSystem", (tick) =>
		victoryTrackingSystem(tick),
	);
	registerSystem("progression", "proceduralQuestSystem", (tick) =>
		proceduralQuestSystem(tick),
	);
	registerSystem("progression", "questSystem", () => updateQuests(FIXED_DELTA));
	registerSystem("progression", "questDialogue", () =>
		updateDialogue(FIXED_DELTA),
	);
	registerSystem("progression", "otterSystem", () => otterSystem());
	registerSystem("progression", "tutorialOtterBridge", () =>
		syncTutorialToOtter(),
	);

	// -------------------------------------------------------------------
	// Phase 8: Cleanup
	// -------------------------------------------------------------------
	registerSystem("cleanup", "notificationSystem", (tick) =>
		notificationSystem(tick),
	);
	registerSystem("cleanup", "particleEmitterSystem", (tick) =>
		particleEmitterSystem(tick),
	);
	registerSystem("cleanup", "audioEventSystem", (tick) =>
		audioEventSystem(tick),
	);
	registerSystem("cleanup", "autosaveSystem", (tick) => {
		autosaveSystem(tick);
	});
	registerSystem("cleanup", "commandQueue", (tick) => {
		processCommands(tick);
	});
	registerSystem("cleanup", "hudTick", () => hudTick(FIXED_DELTA));
	registerSystem("cleanup", "gameLoopBridge", () => bridgeTick(FIXED_DELTA));
	registerSystem("cleanup", "noiseAttraction", (tick) => {
		updateNoiseEvents(tick);
	});
}
