/**
 * Integration tests: weather system wired to gameplay mechanics.
 *
 * Verifies that live weather state is consulted at the point of effect
 * calculation in three systems:
 *
 *   power.ts       — storm weather boosts lightning rod output (lightningChanceMult)
 *   movement.ts    — rain/storm/acid_rain reduce unit movement speed
 *   PerceptionSystem.ts — fog/storm reduce AI vision range
 *
 * Each test group:
 *  1. Forces a specific weather via the mock.
 *  2. Calls the system under test.
 *  3. Asserts the gameplay value changed relative to neutral (clear) weather.
 *
 * Modifier functions in weatherEffects.ts are already tested independently
 * in weatherEffects.test.ts.  These tests verify the wiring only.
 */

// ---------------------------------------------------------------------------
// =====================  POWER SYSTEM WIRING  ================================
// ---------------------------------------------------------------------------

// We need two separate jest module contexts for the two mocked systems.
// Each describe block registers its own jest.mock calls.

// --- Mock declarations for power system -----------------------------------------

const mockLightningRods_power: {
	id: string;
	lightningRod: { rodCapacity: number; currentOutput: number; protectionRadius: number };
	building: { type: string; powered: boolean; operational: boolean; selected: boolean; components: unknown[] };
	worldPosition: { x: number; y: number; z: number };
	faction: string;
}[] = [];

const mockBuildings_power: unknown[] = [];
const mockUnits_power: unknown[] = [];

// --- Mock declarations for movement system --------------------------------------

const mockMovingUnits_movement: {
	worldPosition: { x: number; y: number; z: number };
	unit: { speed: number };
	navigation: {
		path: { x: number; y: number; z: number }[];
		pathIndex: number;
		moving: boolean;
	};
}[] = [];

// ---------------------------------------------------------------------------
// Mocks (hoisted before any import)
// ---------------------------------------------------------------------------

// weather state — shared mutable ref
let _currentWeather = "clear";

jest.mock("../weatherSystem", () => ({
	getCurrentWeather: jest.fn(() => _currentWeather),
	resetWeather: jest.fn(),
}));

jest.mock("../weatherEffects", () => {
	const SPEED: Record<string, number> = {
		clear: 1.0,
		cloudy: 1.0,
		rain: 0.8,
		storm: 0.6,
		fog: 1.0,
		acid_rain: 0.7,
	};
	const LIGHTNING: Record<string, number> = {
		clear: 1.0,
		cloudy: 1.0,
		rain: 1.5,
		storm: 3.0,
		fog: 1.0,
		acid_rain: 1.5,
	};
	const PERCEPTION: Record<string, number> = {
		clear: 1.0,
		cloudy: 0.9,
		rain: 0.8,
		storm: 0.6,
		fog: 0.5,
		acid_rain: 0.7,
	};
	return {
		getWeatherModifiers: jest.fn((w: string) => ({
			movementSpeedMult: SPEED[w] ?? 1.0,
			lightningChanceMult: LIGHTNING[w] ?? 1.0,
			perceptionRangeMult: PERCEPTION[w] ?? 1.0,
			visibilityRange: 500,
			combatAccuracyMult: 1.0,
			harvestSpeedMult: 1.0,
			cubeExposureDamagePerSec: 0,
			ambientSoundPreset: "clear",
			skyboxTint: "#ffffff",
			particleDensity: 0,
		})),
		applyMovementModifier: jest.fn((base: number, w: string) => base * (SPEED[w] ?? 1.0)),
		getEffectivePerceptionRange: jest.fn(
			(base: number, w: string) => base * (PERCEPTION[w] ?? 1.0),
		),
	};
});

// Power system deps
jest.mock("../../ecs/koota/compat", () => ({
	lightningRods: mockLightningRods_power,
	buildings: mockBuildings_power,
	units: mockUnits_power,
	movingUnits: mockMovingUnits_movement,
	miners: [],
	processors: [],
	wires: [],
}));

jest.mock("../../ecs/world", () => ({
	lightningRods: mockLightningRods_power,
	buildings: mockBuildings_power,
	units: mockUnits_power,
	movingUnits: mockMovingUnits_movement,
	world: [],
}));

// Movement dep
jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: jest.fn(() => 0),
}));

// PerceptionSystem deps
jest.mock("../../ecs/cityLayout.ts", () => ({
	getCityBuildings: jest.fn(() => []),
}));

jest.mock("yuka", () => {
	class MockVector3 {
		x = 0; y = 0; z = 0;
		constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
		set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
	}
	class MockQuaternion {
		x = 0; y = 0; z = 0; w = 1;
		lookAt(eye: MockVector3, target: MockVector3) {
			const dx = target.x - eye.x;
			const dz = target.z - eye.z;
			const len = Math.sqrt(dx * dx + dz * dz);
			if (len > 0) { this.x = dx / len; this.z = dz / len; }
			return this;
		}
	}
	class MockGameEntity {
		position = new MockVector3();
		rotation = new MockQuaternion();
		boundingRadius = 0;
	}
	class MockVision {
		owner: MockGameEntity | null;
		fieldOfView = Math.PI * 2;
		range = 15;
		obstacles: MockGameEntity[] = [];
		constructor(owner: MockGameEntity) { this.owner = owner; }
		visible(point: MockVector3): boolean {
			if (!this.owner) return false;
			const dx = point.x - this.owner.position.x;
			const dy = point.y - this.owner.position.y;
			const dz = point.z - this.owner.position.z;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			return dist <= this.range;
		}
	}
	return { GameEntity: MockGameEntity, Vision: MockVision, Vector3: MockVector3 };
});

jest.mock("../../../config", () => ({
	config: {
		enemies: {
			perception: {
				defaultFOV: 120,
				scoutFOV: 180,
				heavyFOV: 90,
				defaultRange: 20,
				cameraRangeBonus: 10,
			},
		},
		power: {
			defaultPowerRadius: 12,
			stormPhaseRate: 0.01,
			stormBaseOscillationMin: 0.7,
			stormBaseOscillationAmplitude: 0.2,
			stormBaseFrequency: 0.3,
			stormSurgeFrequency: 1.7,
			stormSurgePhaseOffset: 2.3,
			stormSurgeAmplitude: 0.3,
			stormMaxIntensity: 1.5,
			fabricationUnitDemand: 3,
			minerDemand: 2,
			defaultBuildingDemand: 1,
			unitBaseDemand: 0.5,
			unitMovingBonus: 0.3,
			wireLossPerUnit: 0.05,
			wireMaxCapacity: 10,
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after all mocks)
// ---------------------------------------------------------------------------

import { powerSystem, getPowerSnapshot } from "../power";
import { movementSystem } from "../movement";
import {
	initPerceptionObstacles,
	clearAllVisionCaches,
	getVisibleEntities,
} from "../../ai/PerceptionSystem";
import { applyMovementModifier, getEffectivePerceptionRange, getWeatherModifiers } from "../weatherEffects";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRod(id: string, rodCapacity = 10) {
	return {
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity,
			currentOutput: 0,
			protectionRadius: 10,
		},
	};
}

function makeMovingUnit(speed = 10) {
	return {
		worldPosition: { x: 0, y: 0, z: 0 },
		unit: { speed },
		navigation: {
			path: [{ x: 100, y: 0, z: 0 }],
			pathIndex: 0,
			moving: true,
		},
	};
}

function makePerceiverEntity(id: string) {
	return {
		id,
		faction: "player" as const,
		worldPosition: { x: 0, y: 0, z: 0 },
		unit: {
			type: "maintenance_bot" as const,
			displayName: id,
			speed: 2,
			selected: false,
			components: [] as {
				name: string;
				functional: boolean;
				material: "electronic";
			}[],
		},
	};
}

function makeTargetEntity(id: string, z: number) {
	return {
		id,
		faction: "enemy" as const,
		worldPosition: { x: 0, y: 0, z },
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	_currentWeather = "clear";
	mockLightningRods_power.length = 0;
	mockBuildings_power.length = 0;
	mockUnits_power.length = 0;
	mockMovingUnits_movement.length = 0;
	clearAllVisionCaches();
	initPerceptionObstacles();
	jest.clearAllMocks();
	// Re-bind mock implementations after clearAllMocks
	const weatherEffectsMock = jest.requireMock("../weatherEffects") as {
		getWeatherModifiers: jest.Mock;
		applyMovementModifier: jest.Mock;
		getEffectivePerceptionRange: jest.Mock;
	};
	const SPEED: Record<string, number> = {
		clear: 1.0, cloudy: 1.0, rain: 0.8, storm: 0.6, fog: 1.0, acid_rain: 0.7,
	};
	const LIGHTNING: Record<string, number> = {
		clear: 1.0, cloudy: 1.0, rain: 1.5, storm: 3.0, fog: 1.0, acid_rain: 1.5,
	};
	const PERCEPTION: Record<string, number> = {
		clear: 1.0, cloudy: 0.9, rain: 0.8, storm: 0.6, fog: 0.5, acid_rain: 0.7,
	};
	weatherEffectsMock.getWeatherModifiers.mockImplementation((w: string) => ({
		movementSpeedMult: SPEED[w] ?? 1.0,
		lightningChanceMult: LIGHTNING[w] ?? 1.0,
		perceptionRangeMult: PERCEPTION[w] ?? 1.0,
		visibilityRange: 500,
		combatAccuracyMult: 1.0,
		harvestSpeedMult: 1.0,
		cubeExposureDamagePerSec: 0,
		ambientSoundPreset: "clear",
		skyboxTint: "#ffffff",
		particleDensity: 0,
	}));
	weatherEffectsMock.applyMovementModifier.mockImplementation(
		(base: number, w: string) => base * (SPEED[w] ?? 1.0),
	);
	weatherEffectsMock.getEffectivePerceptionRange.mockImplementation(
		(base: number, w: string) => base * (PERCEPTION[w] ?? 1.0),
	);

	const weatherSystemMock = jest.requireMock("../weatherSystem") as {
		getCurrentWeather: jest.Mock;
	};
	weatherSystemMock.getCurrentWeather.mockImplementation(() => _currentWeather);
});

// ---------------------------------------------------------------------------
// power.ts — lightning rod output multiplied by weather
// ---------------------------------------------------------------------------

describe("power.ts — weather wiring", () => {
	it("clear weather: lightningChanceMult=1.0 does not change rod output", () => {
		_currentWeather = "clear";
		const rod = makeRod("rod-1", 10);
		mockLightningRods_power.push(rod);

		powerSystem(0);

		const snapshot = getPowerSnapshot();
		// stormIntensity from the oscillator is > 0; mult=1.0 means no change
		expect(snapshot.totalGeneration).toBeGreaterThan(0);
		expect(getWeatherModifiers).toHaveBeenCalledWith("clear");
	});

	it("storm weather: lightningChanceMult=3.0 triples rod output vs clear", () => {
		const rod = makeRod("rod-1", 10);
		mockLightningRods_power.push(rod);

		// Measure clear output at a fixed tick so stormIntensity is the same
		_currentWeather = "clear";
		powerSystem(0);
		const clearOutput = rod.lightningRod.currentOutput;

		// Reset rod and measure storm output at the same tick
		rod.lightningRod.currentOutput = 0;
		_currentWeather = "storm";
		powerSystem(0);
		const stormOutput = rod.lightningRod.currentOutput;

		expect(stormOutput).toBeCloseTo(clearOutput * 3.0, 5);
	});

	it("rain weather: lightningChanceMult=1.5 gives 50% more output vs clear", () => {
		const rod = makeRod("rod-1", 10);
		mockLightningRods_power.push(rod);

		_currentWeather = "clear";
		powerSystem(0);
		const clearOutput = rod.lightningRod.currentOutput;

		rod.lightningRod.currentOutput = 0;
		_currentWeather = "rain";
		powerSystem(0);
		const rainOutput = rod.lightningRod.currentOutput;

		expect(rainOutput).toBeCloseTo(clearOutput * 1.5, 5);
	});

	it("fog weather: lightningChanceMult=1.0 is neutral", () => {
		const rod = makeRod("rod-1", 10);
		mockLightningRods_power.push(rod);

		_currentWeather = "clear";
		powerSystem(0);
		const clearOutput = rod.lightningRod.currentOutput;

		rod.lightningRod.currentOutput = 0;
		_currentWeather = "fog";
		powerSystem(0);
		const fogOutput = rod.lightningRod.currentOutput;

		expect(fogOutput).toBeCloseTo(clearOutput, 5);
	});

	it("total generation snapshot reflects weather multiplier (storm > clear)", () => {
		mockLightningRods_power.push(makeRod("r1", 10), makeRod("r2", 10));

		_currentWeather = "storm";
		powerSystem(0);
		const stormGen = getPowerSnapshot().totalGeneration;

		mockLightningRods_power[0].lightningRod.currentOutput = 0;
		mockLightningRods_power[1].lightningRod.currentOutput = 0;

		_currentWeather = "clear";
		powerSystem(0);
		const clearGen = getPowerSnapshot().totalGeneration;

		// storm has 3x lightning mult, clear has 1x.
		// Use a 5% tolerance to account for 1-decimal rounding in the snapshot.
		expect(stormGen / clearGen).toBeGreaterThan(2.9);
		expect(stormGen / clearGen).toBeLessThan(3.1);
	});
});

// ---------------------------------------------------------------------------
// movement.ts — speed reduced by rain/storm/acid_rain
// ---------------------------------------------------------------------------

describe("movement.ts — weather wiring", () => {
	it("clear weather: unit moves at full speed", () => {
		_currentWeather = "clear";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		// step = 10 * 1.0 * 1.0 = 10; target is at x=100 so position = 10
		expect(unit.worldPosition.x).toBeCloseTo(10);
	});

	it("rain weather: unit moves at 80% speed", () => {
		_currentWeather = "rain";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		// step = 10 * 0.8 * 1.0 = 8
		expect(unit.worldPosition.x).toBeCloseTo(8);
	});

	it("storm weather: unit moves at 60% speed", () => {
		_currentWeather = "storm";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		// step = 10 * 0.6 * 1.0 = 6
		expect(unit.worldPosition.x).toBeCloseTo(6);
	});

	it("acid_rain weather: unit moves at 70% speed", () => {
		_currentWeather = "acid_rain";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		// step = 10 * 0.7 * 1.0 = 7
		expect(unit.worldPosition.x).toBeCloseTo(7);
	});

	it("fog weather: unit speed is unaffected", () => {
		_currentWeather = "fog";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		// step = 10 * 1.0 * 1.0 = 10
		expect(unit.worldPosition.x).toBeCloseTo(10);
	});

	it("applyMovementModifier is called with the current weather", () => {
		_currentWeather = "storm";
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 1.0);

		expect(applyMovementModifier).toHaveBeenCalledWith(10, "storm");
	});

	it("weather modifier stacks correctly with gameSpeed multiplier", () => {
		_currentWeather = "rain"; // 0.8x
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(1.0, 2.0); // 2x gameSpeed

		// step = 10 * 0.8 * 2.0 = 16
		expect(unit.worldPosition.x).toBeCloseTo(16);
	});

	it("weather modifier stacks correctly with delta", () => {
		_currentWeather = "storm"; // 0.6x
		const unit = makeMovingUnit(10);
		mockMovingUnits_movement.push(unit);

		movementSystem(0.5, 1.0);

		// step = 10 * 0.6 * 0.5 = 3
		expect(unit.worldPosition.x).toBeCloseTo(3);
	});
});

// ---------------------------------------------------------------------------
// PerceptionSystem.ts — vision range reduced by fog/storm
// ---------------------------------------------------------------------------

describe("PerceptionSystem.ts — weather wiring", () => {
	// defaultRange = 20 (from mock config above)

	it("clear weather: entity at range 18 is visible (defaultRange=20, mult=1.0)", () => {
		_currentWeather = "clear";
		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 18);

		const result = getVisibleEntities("obs", [observer as never, target as never]);
		expect(result).toContain("tgt");
	});

	it("fog weather: perception range is halved (0.5x), entity at 18 is NOT visible", () => {
		_currentWeather = "fog";
		clearAllVisionCaches(); // force vision to be reconfigured

		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 18);

		// defaultRange=20, fog mult=0.5 => effective range=10
		// Target at z=18 is beyond effective range of 10
		const result = getVisibleEntities("obs", [observer as never, target as never]);
		expect(result).not.toContain("tgt");
	});

	it("fog weather: entity within reduced range (z=8) is still visible", () => {
		_currentWeather = "fog";
		clearAllVisionCaches();

		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 8);

		// effective range = 10, z=8 is within range
		const result = getVisibleEntities("obs", [observer as never, target as never]);
		expect(result).toContain("tgt");
	});

	it("storm weather: perception range reduced to 60%, entity at 18 is NOT visible", () => {
		_currentWeather = "storm";
		clearAllVisionCaches();

		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 18);

		// effective range = 20 * 0.6 = 12, target at 18 is outside
		const result = getVisibleEntities("obs", [observer as never, target as never]);
		expect(result).not.toContain("tgt");
	});

	it("storm weather: entity at 10 is visible (within 60% range)", () => {
		_currentWeather = "storm";
		clearAllVisionCaches();

		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 10);

		// effective range = 12, z=10 is within range
		const result = getVisibleEntities("obs", [observer as never, target as never]);
		expect(result).toContain("tgt");
	});

	it("getEffectivePerceptionRange is called with the current weather", () => {
		_currentWeather = "fog";
		clearAllVisionCaches();

		const observer = makePerceiverEntity("obs");
		const target = makeTargetEntity("tgt", 5);

		getVisibleEntities("obs", [observer as never, target as never]);

		expect(getEffectivePerceptionRange).toHaveBeenCalledWith(
			expect.any(Number),
			"fog",
		);
	});
});
