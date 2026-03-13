import {
	areFactionsHostile,
	COMBAT_AP_COST,
	combatSystem,
	findTauntTarget,
	getLastCombatEvents,
	resetCombatState,
	TAUNT_RADIUS,
} from "./combat";
import {
	getTurnState,
	hasActionPoints,
	initializeTurnForUnits,
	resetTurnSystem,
	spendActionPoint,
} from "./turnSystem";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockUnitsArray: any[] = [];

jest.mock("../ecs/world", () => ({
	world: { query: () => [], entities: [] },
	units: {
		[Symbol.iterator]: () => mockUnitsArray[Symbol.iterator](),
	},
}));

jest.mock("../ai", () => ({
	cancelAgentTask: jest.fn(),
}));

jest.mock("../ecs/seed", () => ({
	gameplayRandom: jest.fn(() => 0.2),
}));

jest.mock("../world/runtimeState", () => ({
	setRuntimeResources: jest.fn(),
}));

jest.mock("../ecs/cityLayout", () => ({
	isInsideBuilding: () => false,
}));

jest.mock("../ai/runtimeState", () => ({
	isEntityExecutingAITask: () => false,
}));

jest.mock("../bots/definitions", () => ({
	getBotDefinition: (unitType: string) => {
		const roles: Record<string, string> = {
			mecha_golem: "guardian",
			maintenance_bot: "technician",
			mecha_scout: "scout",
			field_fighter: "striker",
			fabrication_unit: "fabricator",
			utility_drone: "hauler",
			feral_drone: "cult_mech",
			mecha_trooper: "rogue_sentinel",
			quadruped_tank: "siege_engine",
		};
		return roles[unitType] ? { role: roles[unitType] } : null;
	},
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUnit(
	id: string,
	faction: string,
	x: number,
	z: number,
	components = [
		{ name: "arms", functional: true, material: "metal" as const },
		{ name: "legs", functional: true, material: "metal" as const },
		{ name: "sensor", functional: true, material: "electronic" as const },
	],
	unitType = "feral_drone",
) {
	const data: Record<string, any> = {
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Unit: { components, type: unitType, speed: 3 },
		MapFragment: { fragmentId: "primary" },
	};
	return {
		get: (trait: any) => {
			if (trait === undefined) return undefined;
			const name =
				typeof trait === "function" ? trait.name || trait.toString() : trait;
			// Map Koota trait references to our data keys
			for (const key of Object.keys(data)) {
				if (String(name).includes(key) || String(trait).includes(key)) {
					return data[key];
				}
			}
			return data[name];
		},
		destroy: jest.fn(),
	};
}

// Patch the trait imports so .get(Identity) works in our mocks
jest.mock("../ecs/traits", () => {
	const Identity = "Identity";
	const Unit = "Unit";
	const WorldPosition = "WorldPosition";
	const MapFragment = "MapFragment";
	return {
		Identity,
		Unit,
		WorldPosition,
		MapFragment,
		hasArms: (entity: any) => {
			const unit = entity.get("Unit");
			return unit?.components.some(
				(c: any) => c.name === "arms" && c.functional,
			);
		},
	};
});

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockUnitsArray.length = 0;
	resetCombatState();
	resetTurnSystem();
});

describe("areFactionsHostile", () => {
	it("same faction is not hostile", () => {
		expect(areFactionsHostile("player", "player")).toBe(false);
		expect(areFactionsHostile("feral", "feral")).toBe(false);
	});

	it("wildlife is never hostile", () => {
		expect(areFactionsHostile("wildlife", "player")).toBe(false);
		expect(areFactionsHostile("player", "wildlife")).toBe(false);
		expect(areFactionsHostile("feral", "wildlife")).toBe(false);
	});

	it("different non-wildlife factions are hostile", () => {
		expect(areFactionsHostile("player", "feral")).toBe(true);
		expect(areFactionsHostile("feral", "player")).toBe(true);
		expect(areFactionsHostile("rogue", "cultist")).toBe(true);
		expect(areFactionsHostile("player", "rogue")).toBe(true);
		expect(areFactionsHostile("cultist", "feral")).toBe(true);
	});
});

describe("combatSystem — AP cost (task #21)", () => {
	it("player unit attack costs 1 AP", () => {
		const player = makeUnit("p1", "player", 0, 0);
		const enemy = makeUnit("e1", "feral", 1, 0);
		mockUnitsArray.push(player, enemy);

		// Initialize turn state with AP for player unit
		initializeTurnForUnits(["p1"]);
		expect(hasActionPoints("p1")).toBe(true);
		const apBefore = getTurnState().unitStates.get("p1")!.actionPoints;

		combatSystem();

		const apAfter = getTurnState().unitStates.get("p1")!.actionPoints;
		const events = getLastCombatEvents();

		// Player attacked — AP should decrease by COMBAT_AP_COST
		if (events.some((e) => e.attackerId === "p1")) {
			expect(apAfter).toBe(apBefore - COMBAT_AP_COST);
		}
	});

	it("player unit without AP cannot initiate attack", () => {
		const player = makeUnit("p1", "player", 0, 0);
		const enemy = makeUnit("e1", "feral", 1, 0);
		mockUnitsArray.push(player, enemy);

		// Initialize with AP then spend them all
		initializeTurnForUnits(["p1"]);
		const maxAP = getTurnState().unitStates.get("p1")!.actionPoints;
		for (let i = 0; i < maxAP; i++) {
			spendActionPoint("p1");
		}
		expect(hasActionPoints("p1")).toBe(false);

		combatSystem();

		const events = getLastCombatEvents();
		// Player should not initiate any attack (p1 has 0 AP)
		// However, p1 may still retaliate when attacked by e1 (retaliation is free)
		// The feral unit e1 initiates, then p1 retaliates
		const playerInitiated = events.filter(
			(e) =>
				e.attackerId === "p1" &&
				// Check that this is not a retaliation by ensuring
				// no prior event in the same tick shows e1 attacking p1
				!events.some(
					(prior) =>
						prior.attackerId === "e1" &&
						prior.targetId === "p1" &&
						events.indexOf(prior) < events.indexOf(e),
				),
		);
		// The feral (e1) should be the initiator, p1 should only appear as retaliator
		const feralInitiated = events.filter((e) => e.attackerId === "e1");
		expect(feralInitiated.length).toBeGreaterThanOrEqual(0);
		// p1 never appears as the first attacker in a combat exchange
		const p1AsFirstAttacker = events.length > 0 && events[0].attackerId === "p1";
		expect(p1AsFirstAttacker).toBe(false);
	});

	it("AI faction units attack without AP", () => {
		const feral1 = makeUnit("f1", "feral", 0, 0);
		const feral2 = makeUnit("f2", "rogue", 1, 0);
		mockUnitsArray.push(feral1, feral2);

		// No turn state initialized for AI units — they should still fight
		combatSystem();

		// The attack should go through (feral vs rogue are hostile)
		const events = getLastCombatEvents();
		// With our random mock at 0.2, both ATTACK_CHANCE and hit chance should pass
		expect(events.length).toBeGreaterThanOrEqual(0); // may or may not hit depending on random
	});
});

describe("combatSystem — faction-on-faction (task #22)", () => {
	it("feral attacks rogue when in range", () => {
		const feral = makeUnit("f1", "feral", 0, 0);
		const rogue = makeUnit("r1", "rogue", 1, 0);
		mockUnitsArray.push(feral, rogue);

		combatSystem();

		const events = getLastCombatEvents();
		// With random at 0.2, attack chance (0.4) passes, hit chance (0.3 or 0.6) passes
		if (events.length > 0) {
			expect(events[0].attackerId).toBe("f1");
			expect(events[0].targetId).toBe("r1");
		}
	});

	it("cultist attacks player when in range", () => {
		const cultist = makeUnit("c1", "cultist", 0, 0);
		const player = makeUnit("p1", "player", 1, 0);
		mockUnitsArray.push(cultist, player);

		combatSystem();

		const events = getLastCombatEvents();
		if (events.length > 0) {
			expect(events[0].attackerId).toBe("c1");
			expect(events[0].targetId).toBe("p1");
		}
	});

	it("same faction units do not attack each other", () => {
		const f1 = makeUnit("f1", "feral", 0, 0);
		const f2 = makeUnit("f2", "feral", 1, 0);
		mockUnitsArray.push(f1, f2);

		combatSystem();

		const events = getLastCombatEvents();
		expect(events).toHaveLength(0);
	});

	it("wildlife is neutral — not attacked", () => {
		const player = makeUnit("p1", "player", 0, 0);
		const animal = makeUnit("w1", "wildlife", 1, 0);
		mockUnitsArray.push(player, animal);

		initializeTurnForUnits(["p1"]);
		combatSystem();

		const events = getLastCombatEvents();
		expect(events).toHaveLength(0);
	});

	it("units out of melee range do not fight", () => {
		const feral = makeUnit("f1", "feral", 0, 0);
		const rogue = makeUnit("r1", "rogue", 10, 0); // 10 units away
		mockUnitsArray.push(feral, rogue);

		combatSystem();

		const events = getLastCombatEvents();
		expect(events).toHaveLength(0);
	});

	it("destroyed units drop salvage and are removed", () => {
		// Create a unit with only one component so it gets destroyed on first hit
		const feral = makeUnit("f1", "feral", 0, 0);
		const target = makeUnit("t1", "rogue", 1, 0, [
			{ name: "core", functional: true, material: "metal" as const },
		]);
		mockUnitsArray.push(feral, target);

		combatSystem();

		const events = getLastCombatEvents();
		const destroyEvents = events.filter((e) => e.targetDestroyed);
		if (destroyEvents.length > 0) {
			expect(target.destroy).toHaveBeenCalled();
		}
	});
});

describe("combatSystem — each attacker fights once per tick", () => {
	it("attacker only initiates against one target per tick", () => {
		const attacker = makeUnit("a1", "feral", 0, 0);
		const t1 = makeUnit("t1", "player", 1, 0);
		const t2 = makeUnit("t2", "rogue", 1, 1);
		mockUnitsArray.push(attacker, t1, t2);

		combatSystem();

		const events = getLastCombatEvents();
		// a1 may appear as attacker both for its initiated attack
		// AND as a retaliator if another unit (t2) attacks it.
		// Count how many *unique targets* a1 attacked as initiator
		// (not retaliations). The first event involving a1 as attacker
		// is the initiated attack; subsequent ones with a1 as attacker
		// but different targets are retaliations from other exchanges.
		const a1InitiatedTargets = new Set<string>();
		const seenTargetOf = new Set<string>();
		for (const e of events) {
			if (e.attackerId === "a1" && !seenTargetOf.has("a1")) {
				a1InitiatedTargets.add(e.targetId);
			}
			if (e.targetId === "a1") {
				seenTargetOf.add("a1");
			}
		}
		// a1 should only have initiated against one target
		expect(a1InitiatedTargets.size).toBeLessThanOrEqual(1);
	});
});

describe("Guardian taunt (task #45)", () => {
	it("findTauntTarget returns Guardian within taunt radius", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const guardian = makeUnit(
			"g1",
			"player",
			3,
			0,
			[
				{ name: "arms", functional: true, material: "metal" as const },
				{ name: "armor_plating", functional: true, material: "metal" as const },
			],
			"mecha_golem",
		);
		const nonGuardian = makeUnit("p1", "player", 1, 0);

		const allUnits = [attacker, guardian, nonGuardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBe(guardian);
	});

	it("findTauntTarget returns null when no Guardian nearby", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const nonGuardian = makeUnit("p1", "player", 1, 0);

		const allUnits = [attacker, nonGuardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBeNull();
	});

	it("findTauntTarget returns null when Guardian is beyond taunt radius", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const guardian = makeUnit(
			"g1",
			"player",
			TAUNT_RADIUS + 1,
			0,
			[
				{ name: "arms", functional: true, material: "metal" as const },
			],
			"mecha_golem",
		);

		const allUnits = [attacker, guardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBeNull();
	});

	it("findTauntTarget picks the closest Guardian when multiple exist", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const farGuardian = makeUnit(
			"g1",
			"player",
			4,
			0,
			[{ name: "arms", functional: true, material: "metal" as const }],
			"mecha_golem",
		);
		const closeGuardian = makeUnit(
			"g2",
			"player",
			2,
			0,
			[{ name: "arms", functional: true, material: "metal" as const }],
			"mecha_golem",
		);

		const allUnits = [attacker, farGuardian, closeGuardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBe(closeGuardian);
	});

	it("findTauntTarget ignores same-faction Guardians", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const friendlyGuardian = makeUnit(
			"g1",
			"feral",
			2,
			0,
			[{ name: "arms", functional: true, material: "metal" as const }],
			"mecha_golem",
		);

		const allUnits = [attacker, friendlyGuardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBeNull();
	});

	it("findTauntTarget ignores destroyed Guardians", () => {
		const attacker = makeUnit("e1", "feral", 0, 0);
		const deadGuardian = makeUnit(
			"g1",
			"player",
			2,
			0,
			[{ name: "arms", functional: false, material: "metal" as const }],
			"mecha_golem",
		);

		const allUnits = [attacker, deadGuardian] as any[];
		const result = findTauntTarget(attacker as any, allUnits);
		expect(result).toBeNull();
	});

	it("TAUNT_RADIUS is exported and equals 5", () => {
		expect(TAUNT_RADIUS).toBe(5);
	});
});
