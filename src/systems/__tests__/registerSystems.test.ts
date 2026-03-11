/**
 * Integration tests for registerSystems — verifies that registerAllSystems()
 * wires every phase with at least one system and uses correct phase names.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

// Mock all system modules to prevent side effects during registration.
// Each mock returns a no-op function for the imported tick/update function.
const mockNoOp = jest.fn();

jest.mock("../weatherSystem", () => ({ weatherSystem: mockNoOp }));
jest.mock("../environmentHazards", () => ({
	environmentHazardSystem: mockNoOp,
}));
jest.mock("../stormEscalation", () => ({ stormEscalationSystem: mockNoOp }));
jest.mock("../stormForecast", () => ({ updateForecast: mockNoOp }));

jest.mock("../botCommand", () => ({ botCommandSystem: mockNoOp }));
jest.mock("../botAutomation", () => ({ botAutomationSystem: mockNoOp }));
jest.mock("../movement", () => ({ movementSystem: mockNoOp }));
jest.mock("../aiCivilization", () => ({ aiCivilizationSystem: mockNoOp }));
jest.mock("../governorSystem", () => ({ tickGovernors: mockNoOp }));
jest.mock("../aiPeacePeriod", () => ({ updatePacing: mockNoOp }));

jest.mock("../mining", () => ({ miningSystem: mockNoOp }));
jest.mock("../harvestCompress", () => ({ harvestCompressSystem: mockNoOp }));
jest.mock("../processing", () => ({ processingSystem: mockNoOp }));
jest.mock("../fabrication", () => ({ fabricationSystem: mockNoOp }));
jest.mock("../craftingSystem", () => ({ craftingSystem: mockNoOp }));
jest.mock("../cubeEconomy", () => ({ cubeEconomySystem: mockNoOp }));
jest.mock("../tradeRouteSystem", () => ({ tradeRouteSystem: mockNoOp }));
jest.mock("../resources", () => ({ resourceSystem: mockNoOp }));
jest.mock("../resourceFlowTracker", () => ({ resourceFlowSystem: mockNoOp }));
jest.mock("../fragmentMerge", () => ({ fragmentMergeSystem: mockNoOp }));
jest.mock("../economySimulation", () => ({ economySimulation: mockNoOp }));

jest.mock("../power", () => ({ powerSystem: mockNoOp }));
jest.mock("../wireNetwork", () => ({ wireNetworkSystem: mockNoOp }));
jest.mock("../signalNetwork", () => ({ signalNetworkSystem: mockNoOp }));
jest.mock("../beltTransport", () => ({ updateBeltTransport: mockNoOp }));
jest.mock("../repair", () => ({ repairSystem: mockNoOp }));

jest.mock("../combat", () => ({ combatSystem: mockNoOp }));
jest.mock("../fpsCombat", () => ({ fpsCombatSystem: mockNoOp }));
jest.mock("../turret", () => ({ turretSystem: mockNoOp }));
jest.mock("../hacking", () => ({ hackingSystem: mockNoOp }));
jest.mock("../enemies", () => ({ enemySystem: mockNoOp }));
// cultistAI removed — cultists no longer in game lore
jest.mock("../cubeAmmo", () => ({ updateProjectiles: mockNoOp }));

jest.mock("../fogOfWarManager", () => ({ fogOfWarManagerSystem: mockNoOp }));
jest.mock("../discoverySystem", () => ({ discoverySystem: mockNoOp }));
jest.mock("../territoryControl", () => ({ territoryControlSystem: mockNoOp }));
jest.mock("../diplomacySystem", () => ({ diplomacySystem: mockNoOp }));
jest.mock("../exploration", () => ({ explorationSystem: mockNoOp }));

jest.mock("../progressionSystem", () => ({ progressionSystem: mockNoOp }));
jest.mock("../techResearch", () => ({ techResearchSystem: mockNoOp }));
jest.mock("../victoryTracking", () => ({ victoryTrackingSystem: mockNoOp }));
jest.mock("../victoryConditionEvaluator", () => ({ wireTick: mockNoOp }));
jest.mock("../proceduralQuests", () => ({ proceduralQuestSystem: mockNoOp }));
jest.mock("../questSystem", () => ({ updateQuests: mockNoOp }));
jest.mock("../questDialogue", () => ({ updateDialogue: mockNoOp }));
jest.mock("../otters", () => ({ otterSystem: mockNoOp }));

jest.mock("../notificationSystem", () => ({ notificationSystem: mockNoOp }));
jest.mock("../particleEmitterSystem", () => ({
	particleEmitterSystem: mockNoOp,
}));
jest.mock("../audioEventSystem", () => ({ audioEventSystem: mockNoOp }));
jest.mock("../autosaveSystem", () => ({ autosaveSystem: mockNoOp }));
jest.mock("../commandQueue", () => ({ processCommands: mockNoOp }));
jest.mock("../hudState", () => ({ hudTick: mockNoOp }));
jest.mock("../gameLoopBridge", () => ({ bridgeTick: mockNoOp }));
jest.mock("../noiseAttraction", () => ({ updateNoiseEvents: mockNoOp }));

import {
	getRegisteredSystems,
	resetOrchestrator,
} from "../gameLoopOrchestrator";
import { registerAllSystems } from "../registerSystems";

const ALL_PHASES = [
	"environment",
	"inputAi",
	"economy",
	"infrastructure",
	"combat",
	"territory",
	"progression",
	"cleanup",
] as const;

beforeEach(() => {
	resetOrchestrator();
});

// ---------------------------------------------------------------------------
// Phase coverage
// ---------------------------------------------------------------------------

describe("registerAllSystems", () => {
	it("registers at least one system in every phase", () => {
		registerAllSystems();
		const systems = getRegisteredSystems();

		for (const phase of ALL_PHASES) {
			expect(systems[phase].length).toBeGreaterThanOrEqual(1);
		}
	});

	it("registers systems in all 8 phases", () => {
		registerAllSystems();
		const systems = getRegisteredSystems();
		const populatedPhases = Object.entries(systems)
			.filter(([, names]) => names.length > 0)
			.map(([phase]) => phase);

		expect(populatedPhases).toEqual(expect.arrayContaining([...ALL_PHASES]));
	});

	it("does not register duplicate system names", () => {
		registerAllSystems();
		const systems = getRegisteredSystems();
		const allNames = Object.values(systems).flat();
		const uniqueNames = new Set(allNames);
		expect(allNames.length).toBe(uniqueNames.size);
	});

	it("is idempotent — calling twice does not double-register", () => {
		registerAllSystems();
		const first = getRegisteredSystems();
		registerAllSystems();
		const second = getRegisteredSystems();

		for (const phase of ALL_PHASES) {
			expect(second[phase].length).toBe(first[phase].length);
		}
	});
});

// ---------------------------------------------------------------------------
// Per-phase system counts
// ---------------------------------------------------------------------------

describe("phase population", () => {
	beforeEach(() => {
		registerAllSystems();
	});

	it("environment has weather, hazards, storm systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.environment).toContain("weatherSystem");
		expect(systems.environment).toContain("environmentHazardSystem");
		expect(systems.environment).toContain("stormEscalationSystem");
		expect(systems.environment).toContain("stormForecast");
	});

	it("inputAi has bot, AI, and movement systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.inputAi).toContain("botCommandSystem");
		expect(systems.inputAi).toContain("botAutomationSystem");
		expect(systems.inputAi).toContain("movementSystem");
		expect(systems.inputAi).toContain("aiCivilizationSystem");
		expect(systems.inputAi).toContain("tickGovernors");
		expect(systems.inputAi).toContain("aiPeacePeriod");
	});

	it("economy has mining, harvesting, processing, trade systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.economy).toContain("miningSystem");
		expect(systems.economy).toContain("harvestCompressSystem");
		expect(systems.economy).toContain("processingSystem");
		expect(systems.economy).toContain("fabricationSystem");
		expect(systems.economy).toContain("craftingSystem");
		expect(systems.economy).toContain("tradeRouteSystem");
		expect(systems.economy).toContain("resourceSystem");
		expect(systems.economy).toContain("economySimulation");
	});

	it("infrastructure has power, wire, belt, signal systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.infrastructure).toContain("powerSystem");
		expect(systems.infrastructure).toContain("wireNetworkSystem");
		expect(systems.infrastructure).toContain("signalNetworkSystem");
		expect(systems.infrastructure).toContain("beltTransport");
		expect(systems.infrastructure).toContain("repairSystem");
	});

	it("combat has combat, FPS, turret, hacking, enemy systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.combat).toContain("combatSystem");
		expect(systems.combat).toContain("fpsCombatSystem");
		expect(systems.combat).toContain("turretSystem");
		expect(systems.combat).toContain("hackingSystem");
		expect(systems.combat).toContain("enemySystem");
		// cultistAISystem removed — no cultists in game lore
		expect(systems.combat).toContain("cubeAmmo");
	});

	it("territory has fog, discovery, territory, diplomacy systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.territory).toContain("fogOfWarManager");
		expect(systems.territory).toContain("discoverySystem");
		expect(systems.territory).toContain("territoryControlSystem");
		expect(systems.territory).toContain("diplomacySystem");
		expect(systems.territory).toContain("explorationSystem");
	});

	it("progression has tech, quest, victory, XP systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.progression).toContain("progressionSystem");
		expect(systems.progression).toContain("techResearchSystem");
		expect(systems.progression).toContain("victoryTrackingSystem");
		expect(systems.progression).toContain("victoryConditionEvaluator");
		expect(systems.progression).toContain("proceduralQuestSystem");
		expect(systems.progression).toContain("questSystem");
		expect(systems.progression).toContain("otterSystem");
	});

	it("cleanup has notification, particle, audio, autosave, HUD systems", () => {
		const systems = getRegisteredSystems();
		expect(systems.cleanup).toContain("notificationSystem");
		expect(systems.cleanup).toContain("particleEmitterSystem");
		expect(systems.cleanup).toContain("audioEventSystem");
		expect(systems.cleanup).toContain("autosaveSystem");
		expect(systems.cleanup).toContain("commandQueue");
		expect(systems.cleanup).toContain("hudTick");
		expect(systems.cleanup).toContain("gameLoopBridge");
		expect(systems.cleanup).toContain("noiseAttraction");
	});
});
