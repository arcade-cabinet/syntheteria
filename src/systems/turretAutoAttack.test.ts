import {
	resetTurretAutoAttack,
	turretAutoAttackTick,
} from "./turretAutoAttack";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockBuildings: any[] = [];
const mockUnits: any[] = [];

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

jest.mock("../ecs/world", () => ({
	buildings: {
		[Symbol.iterator]: () => mockBuildings[Symbol.iterator](),
	},
	units: {
		[Symbol.iterator]: () => mockUnits[Symbol.iterator](),
	},
	world: { query: () => [] },
}));

jest.mock("../config/buildings.json", () => ({
	defense_turret: {
		attackRange: 8,
		attackDamage: 3,
		attackCooldown: 2,
	},
}));

jest.mock("../ecs/seed", () => ({
	gameplayRandom: jest.fn(() => 0.1),
}));

jest.mock("./combat", () => ({
	areFactionsHostile: jest.fn(
		(a: string, b: string) => a !== b && a !== "wildlife" && b !== "wildlife",
	),
}));

jest.mock("./turnSystem", () => ({
	registerEnvironmentPhaseHandler: jest.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEntity(traitData: Record<string, any>) {
	let destroyed = false;
	return {
		get: (trait: any) => {
			if (trait === undefined) return undefined;
			const name =
				typeof trait === "function" ? trait.name || trait.toString() : trait;
			for (const key of Object.keys(traitData)) {
				if (String(name).includes(key) || String(trait).includes(key)) {
					return traitData[key];
				}
			}
			return traitData[name];
		},
		has: () => true,
		destroy: jest.fn(() => {
			destroyed = true;
		}),
		get isDestroyed() {
			return destroyed;
		},
	};
}

function makeTurret(
	id: string,
	faction: string,
	x: number,
	z: number,
	powered = true,
	operational = true,
) {
	return makeEntity({
		Building: {
			type: "defense_turret",
			powered,
			operational,
			selected: false,
			components: [],
		},
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
	});
}

function makeUnit(
	id: string,
	faction: string,
	x: number,
	z: number,
	components?: any[],
) {
	const defaultComponents = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
	];
	return makeEntity({
		Unit: {
			type: "maintenance_bot",
			components: components ?? defaultComponents,
			selected: false,
		},
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
	});
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockBuildings.length = 0;
	mockUnits.length = 0;
	resetTurretAutoAttack();
});

describe("turretAutoAttack", () => {
	it("fires at nearest hostile unit within range", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		mockUnits.push(makeUnit("enemy_1", "rogue", 3, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(1);
		expect(events[0]!.turretEntityId).toBe("turret_1");
		expect(events[0]!.targetEntityId).toBe("enemy_1");
		expect(events[0]!.componentsDestroyed).toBeGreaterThan(0);
	});

	it("does not fire at friendly units", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		mockUnits.push(makeUnit("friendly_1", "player", 3, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(0);
	});

	it("does not fire at units out of range", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		mockUnits.push(makeUnit("enemy_1", "rogue", 20, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(0);
	});

	it("does not fire when unpowered", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0, false));
		mockUnits.push(makeUnit("enemy_1", "rogue", 3, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(0);
	});

	it("does not fire when not operational", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0, true, false));
		mockUnits.push(makeUnit("enemy_1", "rogue", 3, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(0);
	});

	it("respects cooldown between attacks", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		mockUnits.push(makeUnit("enemy_1", "rogue", 3, 0));

		// First attack succeeds
		const events1 = turretAutoAttackTick();
		expect(events1).toHaveLength(1);

		// Should be on cooldown (2 turns)
		const events2 = turretAutoAttackTick();
		expect(events2).toHaveLength(0);

		const events3 = turretAutoAttackTick();
		expect(events3).toHaveLength(0);

		// Cooldown expired — should fire again
		const events4 = turretAutoAttackTick();
		expect(events4).toHaveLength(1);
	});

	it("targets nearest hostile when multiple are in range", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		mockUnits.push(makeUnit("enemy_far", "rogue", 7, 0));
		mockUnits.push(makeUnit("enemy_near", "rogue", 2, 0));

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(1);
		expect(events[0]!.targetEntityId).toBe("enemy_near");
	});

	it("destroys unit when all components broken", () => {
		mockBuildings.push(makeTurret("turret_1", "player", 0, 0));
		const weakEnemy = makeUnit("enemy_1", "rogue", 3, 0, [
			{ name: "camera", functional: true, material: "electronic" },
		]);
		mockUnits.push(weakEnemy);

		const events = turretAutoAttackTick();
		expect(events).toHaveLength(1);
		expect(events[0]!.targetKilled).toBe(true);
		expect(weakEnemy.isDestroyed).toBe(true);
	});

	it("registers environment phase handler on import", () => {
		const { registerEnvironmentPhaseHandler } = require("./turnSystem");
		expect(registerEnvironmentPhaseHandler).toHaveBeenCalled();
	});
});
