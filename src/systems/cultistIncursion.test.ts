import type { BreachZone } from "./breachZones";
import { loadBreachZones, resetBreachZones } from "./breachZones";
import {
	callLightning,
	cultistBehaviorTick,
	getEscalationFactor,
	getSpawnInterval,
	getWaveSize,
	isWithinBreachFogSense,
	resetCultistIncursion,
	setTerritorySize,
	spawnCultistWave,
} from "./cultistIncursion";
import { resetTurnSystem } from "./turnSystem";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the ECS world
const mockEntities: Array<{
	traits: Map<unknown, unknown>;
	get: (trait: unknown) => unknown;
	set: (trait: unknown, value: unknown) => void;
	destroy: () => void;
}> = [];

jest.mock("../ecs/world", () => ({
	world: {
		spawn: (...traits: unknown[]) => {
			const traitMap = new Map<unknown, unknown>();
			for (const t of traits) {
				traitMap.set(t, {});
			}
			const entity = {
				traits: traitMap,
				get: (trait: unknown) => traitMap.get(trait),
				set: (trait: unknown, value: unknown) => traitMap.set(trait, value),
				destroy: () => {
					const idx = mockEntities.indexOf(entity);
					if (idx >= 0) mockEntities.splice(idx, 1);
				},
			};
			mockEntities.push(entity);
			return entity;
		},
	},
	units: {
		[Symbol.iterator]: () => mockEntities[Symbol.iterator](),
	},
	buildings: {
		[Symbol.iterator]: () => ([] as unknown[])[Symbol.iterator](),
	},
}));

jest.mock("../ecs/seed", () => ({
	gameplayRandom: () => Math.random(),
}));

jest.mock("./weather", () => ({
	getWeatherSnapshot: () => ({
		cultistActivityMultiplier: 1.0,
	}),
}));

// Mock traits — just use symbols as trait markers
jest.mock("../ecs/traits", () => {
	const AIController = Symbol("AIController");
	const Identity = Symbol("Identity");
	const WorldPosition = Symbol("WorldPosition");
	const MapFragment = Symbol("MapFragment");
	const Unit = Symbol("Unit");
	const Navigation = Symbol("Navigation");
	const Building = Symbol("Building");
	return {
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
		Building,
	};
});

jest.mock("../bots", () => ({
	createBotUnitState: (args: Record<string, unknown>) => ({
		type: args.unitType,
		archetypeId: "cult_conduit",
		markLevel: 1,
		speechProfile: "cult",
		displayName: args.displayName ?? "Cultist",
		speed: args.speed ?? 2,
		selected: false,
		components: args.components ?? [],
	}),
}));

jest.mock("../world/sectorCoordinates", () => ({
	gridToWorld: (q: number, r: number) => ({ x: q * 2, y: 0, z: r * 2 }),
}));

// ─── Test Data ────────────────────────────────────────────────────────────────

function makeBreachZones(): BreachZone[] {
	return [
		{
			id: "breach_0",
			centerQ: 10,
			centerR: -8,
			cells: [
				{ q: 10, r: -8 },
				{ q: 11, r: -8 },
				{ q: 10, r: -7 },
			],
			isPrimary: true,
		},
		{
			id: "breach_1",
			centerQ: -12,
			centerR: 6,
			cells: [
				{ q: -12, r: 6 },
				{ q: -11, r: 6 },
			],
			isPrimary: false,
		},
		{
			id: "breach_2",
			centerQ: 5,
			centerR: 15,
			cells: [
				{ q: 5, r: 15 },
				{ q: 6, r: 15 },
				{ q: 5, r: 16 },
			],
			isPrimary: false,
		},
	];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("cultistIncursion", () => {
	beforeEach(() => {
		mockEntities.length = 0;
		resetCultistIncursion();
		resetBreachZones();
		resetTurnSystem();
		loadBreachZones(makeBreachZones());
	});

	describe("escalation system", () => {
		it("escalation factor is 0 with no territory", () => {
			setTerritorySize(0);
			expect(getEscalationFactor()).toBe(0);
		});

		it("escalation factor is 1 at max territory", () => {
			setTerritorySize(80);
			expect(getEscalationFactor()).toBe(1);
		});

		it("escalation factor is clamped at 1 for huge territory", () => {
			setTerritorySize(200);
			expect(getEscalationFactor()).toBe(1);
		});

		it("escalation factor scales linearly", () => {
			setTerritorySize(40);
			expect(getEscalationFactor()).toBe(0.5);
		});

		it("spawn interval decreases with escalation", () => {
			setTerritorySize(0);
			const lowInterval = getSpawnInterval();
			setTerritorySize(80);
			const highInterval = getSpawnInterval();
			expect(lowInterval).toBeGreaterThan(highInterval);
			expect(lowInterval).toBe(5);
			expect(highInterval).toBe(2);
		});

		it("wave size increases with escalation", () => {
			setTerritorySize(0);
			const lowWave = getWaveSize();
			setTerritorySize(80);
			const highWave = getWaveSize();
			expect(highWave).toBeGreaterThan(lowWave);
			expect(lowWave).toBe(1);
			expect(highWave).toBe(4);
		});
	});

	describe("spawnCultistWave", () => {
		it("spawns cultists on the first eligible turn", () => {
			setTerritorySize(10);
			const events = spawnCultistWave(5);
			expect(events.length).toBeGreaterThan(0);
		});

		it("does not spawn when interval has not elapsed", () => {
			setTerritorySize(10);
			spawnCultistWave(5); // first wave
			const events = spawnCultistWave(6); // too soon
			expect(events).toEqual([]);
		});

		it("spawns at breach zone coordinates", () => {
			setTerritorySize(10);
			const events = spawnCultistWave(5);
			const zones = makeBreachZones();
			const allCells = zones.flatMap((z) => z.cells);
			for (const event of events) {
				const matchesAny = allCells.some(
					(c) => c.q === event.q && c.r === event.r,
				);
				expect(matchesAny).toBe(true);
			}
		});

		it("respects max cultist cap", () => {
			setTerritorySize(80);
			// Spawn many waves until capped
			for (let turn = 0; turn < 100; turn += 2) {
				spawnCultistWave(turn);
			}
			// Count total cultists in mock entities
			expect(mockEntities.length).toBeLessThanOrEqual(12);
		});

		it("returns empty when no breach zones loaded", () => {
			resetBreachZones();
			setTerritorySize(40);
			const events = spawnCultistWave(5);
			expect(events).toEqual([]);
		});
	});

	describe("cultistBehaviorTick", () => {
		it("returns empty array when no cultists exist", () => {
			const events = cultistBehaviorTick();
			expect(events).toEqual([]);
		});
	});

	describe("isWithinBreachFogSense", () => {
		it("returns true for cells near breach zones", () => {
			expect(isWithinBreachFogSense(10, -8)).toBe(true);
			expect(isWithinBreachFogSense(12, -6)).toBe(true);
		});

		it("returns false for distant cells", () => {
			expect(isWithinBreachFogSense(100, 100)).toBe(false);
		});
	});

	describe("storm interaction", () => {
		it("callLightning returns 0 when no targets are nearby", () => {
			const damaged = callLightning("cultist_0", 10, -8);
			expect(damaged).toBe(0);
		});
	});
});
