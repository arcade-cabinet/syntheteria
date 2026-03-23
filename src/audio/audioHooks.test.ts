import { audioSystemTick, resetAudioHooks } from "./audioHooks";

// ─── Mock Game Systems ───────────────────────────────────────────────────────

const mockCombatEvents: any[] = [];
const mockHarvestYieldEvents: any[] = [];
const mockActiveHarvests: any[] = [];
const mockConstructionStates: any[] = [];
const mockCultistSpawnEvents: any[] = [];
const mockCultistAttackEvents: any[] = [];
let mockTurnState: {
	turnNumber: number;
	phase: string;
	activeFaction: string;
	unitStates: Map<string, unknown>;
	playerHasActions: boolean;
} = {
	turnNumber: 1,
	phase: "player",
	activeFaction: "player",
	unitStates: new Map(),
	playerHasActions: true,
};
const mockWeatherSnapshot = {
	visibilityMultiplier: 0.7,
	timeOfDay: 0.5,
	phase: "day" as const,
	dayNumber: 1,
	gameMinutesElapsed: 0,
	wormholeGlow: 0.5,
	ambientIntensity: 0.5,
	ambientColor: [0.5, 0.5, 0.5] as [number, number, number],
	directionalIntensity: 0.5,
	directionalColor: [1, 1, 1] as [number, number, number],
	powerMultiplier: 1,
	cultistActivityMultiplier: 1,
	repairSpeedMultiplier: 1,
	stormVisuals: {
		rainParticleCount: 0,
		rainAlphaBase: 0,
		rainAlphaStorm: 0,
		windSpeedBase: 0,
		windSpeedStorm: 0,
		cloudSpeed: 0,
		cloudDetailScale: 0,
		lightningIntervalMin: 0,
		lightningIntervalMax: 0,
		rodCaptureChance: 0,
		debrisThreshold: 0,
		fogDensity: 0,
		skyTintShift: 0,
		colorGrade: {
			darkCloud: [0, 0, 0] as [number, number, number],
			lightCloud: [1, 1, 1] as [number, number, number],
		},
	},
};

jest.mock("../systems/combat", () => ({
	getLastCombatEvents: jest.fn(() => mockCombatEvents),
}));

jest.mock("../systems/harvestSystem", () => ({
	getActiveHarvests: jest.fn(() => mockActiveHarvests),
}));

jest.mock("../systems/harvestEvents", () => ({
	getHarvestYieldEvents: jest.fn(() => mockHarvestYieldEvents),
}));

jest.mock("../systems/constructionVisualization", () => ({
	getAllConstructionStates: jest.fn(() => mockConstructionStates),
}));

jest.mock("../systems/cultistIncursion", () => ({
	getLastSpawnEvents: jest.fn(() => mockCultistSpawnEvents),
	getLastAttackEvents: jest.fn(() => mockCultistAttackEvents),
}));

jest.mock("../systems/turnSystem", () => ({
	getTurnState: jest.fn(() => mockTurnState),
}));

jest.mock("../systems/weather", () => ({
	getWeatherSnapshot: jest.fn(() => mockWeatherSnapshot),
}));

// ─── Mock Audio Modules ──────────────────────────────────────────────────────

jest.mock("./audioEngine", () => ({
	isAudioInitialized: jest.fn(() => true),
}));

jest.mock("./adaptiveMusic", () => ({
	setMusicState: jest.fn(),
}));

jest.mock("./ambientSoundscape", () => ({
	updateStormIntensity: jest.fn(),
}));

jest.mock("./sfxLibrary", () => ({
	playAttackClang: jest.fn(),
	playHitImpact: jest.fn(),
	playComponentBreak: jest.fn(),
	playUnitDestroyed: jest.fn(),
	playHarvestGrind: jest.fn(),
	playMaterialCollected: jest.fn(),
	playConstructionHammer: jest.fn(),
	playStageComplete: jest.fn(),
	playBuildingComplete: jest.fn(),
	playTurnStartChime: jest.fn(),
	playAIPhaseDrone: jest.fn(),
	playNewTurnFanfare: jest.fn(),
	playCultistSpawn: jest.fn(),
	playCultistAttack: jest.fn(),
	playLightningCall: jest.fn(),
}));

// Import mocked modules to access jest.fn() instances
import { setMusicState as mockSetMusicState } from "./adaptiveMusic";
import { updateStormIntensity as mockUpdateStormIntensity } from "./ambientSoundscape";
import {
	playAIPhaseDrone as mockPlayAIPhaseDrone,
	playAttackClang as mockPlayAttackClang,
	playBuildingComplete as mockPlayBuildingComplete,
	playComponentBreak as mockPlayComponentBreak,
	playConstructionHammer as mockPlayConstructionHammer,
	playCultistAttack as mockPlayCultistAttack,
	playCultistSpawn as mockPlayCultistSpawn,
	playHarvestGrind as mockPlayHarvestGrind,
	playHitImpact as mockPlayHitImpact,
	playMaterialCollected as mockPlayMaterialCollected,
	playNewTurnFanfare as mockPlayNewTurnFanfare,
	playStageComplete as mockPlayStageComplete,
	playTurnStartChime as mockPlayTurnStartChime,
	playUnitDestroyed as mockPlayUnitDestroyed,
} from "./sfxLibrary";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("audioHooks", () => {
	beforeEach(() => {
		resetAudioHooks();
		mockCombatEvents.length = 0;
		mockHarvestYieldEvents.length = 0;
		mockActiveHarvests.length = 0;
		mockConstructionStates.length = 0;
		mockCultistSpawnEvents.length = 0;
		mockCultistAttackEvents.length = 0;
		mockTurnState = {
			turnNumber: 1,
			phase: "player",
			activeFaction: "player",
			unitStates: new Map(),
			playerHasActions: true,
		};
		jest.clearAllMocks();
	});

	describe("combat audio", () => {
		it("should play attack clang on combat events", () => {
			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "legs",
				targetDestroyed: false,
			});
			audioSystemTick();
			expect(mockPlayAttackClang).toHaveBeenCalled();
		});

		it("should play hit impact when component damaged", () => {
			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "arms",
				targetDestroyed: false,
			});
			audioSystemTick();
			expect(mockPlayHitImpact).toHaveBeenCalled();
		});

		it("should play unit destroyed when target dies", () => {
			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "power_cell",
				targetDestroyed: true,
			});
			audioSystemTick();
			expect(mockPlayUnitDestroyed).toHaveBeenCalled();
		});

		it("should not replay same combat events", () => {
			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "legs",
				targetDestroyed: false,
			});
			audioSystemTick();
			audioSystemTick();
			expect(mockPlayAttackClang).toHaveBeenCalledTimes(1);
		});
	});

	describe("harvest audio", () => {
		it("should play grind sound when harvests are active", () => {
			mockActiveHarvests.push({
				harvesterId: "bot-1",
				structureId: 1,
			});
			audioSystemTick();
			expect(mockPlayHarvestGrind).toHaveBeenCalled();
		});

		it("should respect grind cooldown", () => {
			mockActiveHarvests.push({
				harvesterId: "bot-1",
				structureId: 1,
			});
			audioSystemTick();
			audioSystemTick();
			// Only called once due to cooldown
			expect(mockPlayHarvestGrind).toHaveBeenCalledTimes(1);
		});

		it("should play material collected on yield event", () => {
			mockHarvestYieldEvents.push({
				id: 1,
				x: 0,
				z: 0,
				yields: [{ resource: "heavy_metals", amount: 3 }],
				createdAtTick: 0,
			});
			audioSystemTick();
			expect(mockPlayMaterialCollected).toHaveBeenCalled();
		});
	});

	describe("construction audio", () => {
		it("should play hammer when buildings under construction", () => {
			mockConstructionStates.push({
				entityId: "bld-1",
				buildingType: "relay_tower",
				currentStage: "foundation",
				turnsRemaining: 1,
				totalTurns: 2,
			});
			audioSystemTick();
			expect(mockPlayConstructionHammer).toHaveBeenCalled();
		});

		it("should play stage complete on stage change", () => {
			// Register with foundation stage
			mockConstructionStates.push({
				entityId: "bld-1",
				buildingType: "relay_tower",
				currentStage: "foundation",
				turnsRemaining: 1,
				totalTurns: 2,
			});
			audioSystemTick();

			// Advance to shell stage — same entity, stage changed
			mockConstructionStates[0].currentStage = "shell";
			audioSystemTick();
			expect(mockPlayStageComplete).toHaveBeenCalled();
		});

		it("should play building complete on operational stage", () => {
			// First register a building with shell stage
			mockConstructionStates.push({
				entityId: "bld-2",
				buildingType: "relay_tower",
				currentStage: "shell",
				turnsRemaining: 0,
				totalTurns: 2,
			});
			audioSystemTick();

			// Then change to operational
			mockConstructionStates[0].currentStage = "operational";
			audioSystemTick();
			expect(mockPlayBuildingComplete).toHaveBeenCalled();
		});
	});

	describe("turn audio", () => {
		it("should play turn start chime on first tick", () => {
			audioSystemTick();
			// Turn number changes from 0 (initial) to 1
			// Since lastTurnNumber starts at 0, it sees a new turn
			expect(mockPlayTurnStartChime).toHaveBeenCalled();
		});

		it("should play new turn fanfare when turn number changes", () => {
			audioSystemTick(); // process initial turn 1
			mockTurnState = { ...mockTurnState, turnNumber: 2 };
			audioSystemTick();
			expect(mockPlayNewTurnFanfare).toHaveBeenCalled();
		});

		it("should play AI phase drone when phase changes to ai_faction", () => {
			audioSystemTick(); // process initial
			mockTurnState = { ...mockTurnState, phase: "ai_faction" };
			audioSystemTick();
			expect(mockPlayAIPhaseDrone).toHaveBeenCalled();
		});
	});

	describe("cultist audio", () => {
		it("should play spawn screech on cultist spawn", () => {
			mockCultistSpawnEvents.push({
				breachZoneId: "z1",
				entityId: "cult-1",
				q: 0,
				r: 0,
				turnNumber: 1,
			});
			audioSystemTick();
			expect(mockPlayCultistSpawn).toHaveBeenCalled();
		});

		it("should play cultist attack on attack event", () => {
			mockCultistAttackEvents.push({
				attackerId: "cult-1",
				targetId: "bld-1",
				targetType: "building",
				damage: 1,
				turnNumber: 1,
			});
			audioSystemTick();
			expect(mockPlayCultistAttack).toHaveBeenCalled();
		});

		it("should limit spawn screeches to 2 per tick", () => {
			for (let i = 0; i < 5; i++) {
				mockCultistSpawnEvents.push({
					breachZoneId: "z1",
					entityId: `cult-${i}`,
					q: 0,
					r: 0,
					turnNumber: 1,
				});
			}
			audioSystemTick();
			expect(mockPlayCultistSpawn).toHaveBeenCalledTimes(2);
		});
	});

	describe("adaptive music state", () => {
		it("should set combat music on combat events", () => {
			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "legs",
				targetDestroyed: false,
			});
			audioSystemTick();
			expect(mockSetMusicState).toHaveBeenCalledWith("combat");
		});

		it("should set combat music on cultist attacks", () => {
			mockCultistAttackEvents.push({
				attackerId: "cult-1",
				targetId: "bld-1",
				targetType: "building",
				damage: 1,
				turnNumber: 1,
			});
			audioSystemTick();
			expect(mockSetMusicState).toHaveBeenCalledWith("combat");
		});

		it("should set cultist music on cultist spawns (no combat)", () => {
			mockCultistSpawnEvents.push({
				breachZoneId: "z1",
				entityId: "cult-1",
				q: 0,
				r: 0,
				turnNumber: 1,
			});
			audioSystemTick();
			expect(mockSetMusicState).toHaveBeenCalledWith("cultist");
		});

		it("should set expansion music during active play", () => {
			mockTurnState = {
				...mockTurnState,
				turnNumber: 2,
				phase: "player",
				playerHasActions: true,
			};
			audioSystemTick();
			expect(mockSetMusicState).toHaveBeenCalledWith("expansion");
		});

		it("should set exploration music by default on turn 1", () => {
			audioSystemTick();
			expect(mockSetMusicState).toHaveBeenCalledWith("exploration");
		});
	});

	describe("ambient updates", () => {
		it("should update storm intensity from weather", () => {
			audioSystemTick();
			expect(mockUpdateStormIntensity).toHaveBeenCalled();
		});
	});

	describe("audio not initialized", () => {
		it("should skip all processing when not initialized", () => {
			const { isAudioInitialized } = require("./audioEngine");
			(isAudioInitialized as jest.Mock).mockReturnValueOnce(false);

			mockCombatEvents.push({
				attackerId: "a",
				targetId: "b",
				componentDamaged: "legs",
				targetDestroyed: false,
			});
			audioSystemTick();
			expect(mockPlayAttackClang).not.toHaveBeenCalled();
		});
	});
});
