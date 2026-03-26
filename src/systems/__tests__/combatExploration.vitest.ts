/**
 * Combat + exploration integration test.
 *
 * Verifies the end-to-end chain:
 *   1. Select unit, move toward enemy
 *   2. Encounter cult mech, combat resolves with component damage
 *   3. Fog reveals on movement (exploration system)
 *   4. Fragments merge when units from different fragments meet
 *
 * Uses the global world singleton. Each test spawns entities directly
 * with traits (bypassing factory.ts terrain/fragment dependencies).
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	createFragment,
	deleteFragment,
	getFogAt,
	type MapFragment,
} from "../../ecs/terrain";
import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { UnitComponent } from "../../ecs/types";
import { serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { combatSystem, getLastCombatEvents } from "../combat";
import { explorationSystem } from "../exploration";
import { fragmentMergeSystem } from "../fragmentMerge";
import { movementSystem } from "../movement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const entities: Entity[] = [];
const fragmentIds: string[] = [];

function makeComponents(...parts: UnitComponent[]): string {
	return serializeComponents(parts);
}

function spawnPlayerUnit(
	x: number,
	z: number,
	components: UnitComponent[],
	fragmentId: string,
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `player_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: makeComponents(...components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

function spawnCultMech(
	x: number,
	z: number,
	components: UnitComponent[],
	fragmentId: string,
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `cult_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "cultist" }),
		Fragment({ fragmentId }),
		Unit({
			unitType: "wanderer",
			displayName: "Cult Wanderer",
			speed: 2,
			selected: false,
		}),
		UnitComponents({ componentsJson: makeComponents(...components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

function trackFragment(frag: MapFragment): MapFragment {
	fragmentIds.push(frag.id);
	return frag;
}

const FULL_COMPONENTS: UnitComponent[] = [
	{ name: "camera", functional: true, material: "electronic" },
	{ name: "arms", functional: true, material: "metal" },
	{ name: "legs", functional: true, material: "metal" },
	{ name: "power_cell", functional: true, material: "electronic" },
];

const WEAK_COMPONENTS: UnitComponent[] = [
	{ name: "camera", functional: true, material: "electronic" },
	{ name: "power_cell", functional: true, material: "electronic" },
];

// ---------------------------------------------------------------------------
// Teardown — must use isAlive() for Koota entities
// ---------------------------------------------------------------------------

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	for (const id of fragmentIds) {
		deleteFragment(id);
	}
	fragmentIds.length = 0;
});

// ---------------------------------------------------------------------------
// Exploration — fog reveals on movement
// ---------------------------------------------------------------------------

describe("exploration — fog reveals", () => {
	it("unit with camera reveals detailed fog around its position", () => {
		const frag = trackFragment(createFragment());

		// Check fog is initially unexplored at unit position
		expect(getFogAt(frag, 0, 0)).toBe(0);

		spawnPlayerUnit(
			0,
			0,
			[{ name: "camera", functional: true, material: "electronic" }],
			frag.id,
		);

		explorationSystem();

		// After exploration, the unit's position should be detailed (2)
		expect(getFogAt(frag, 0, 0)).toBe(2);
		// Nearby cell within vision radius (6) should also be revealed
		expect(getFogAt(frag, 3, 3)).toBe(2);
	});

	it("unit without camera reveals abstract fog", () => {
		const frag = trackFragment(createFragment());

		spawnPlayerUnit(
			0,
			0,
			[{ name: "legs", functional: true, material: "metal" }],
			frag.id,
		);

		explorationSystem();

		// Without camera, fog is abstract (1)
		expect(getFogAt(frag, 0, 0)).toBe(1);
	});

	it("fog outside vision radius remains unexplored", () => {
		const frag = trackFragment(createFragment());

		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id);

		explorationSystem();

		// Well outside vision radius of 6
		expect(getFogAt(frag, 20, 20)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Movement — unit moves along path
// ---------------------------------------------------------------------------

describe("movement — unit follows path", () => {
	it("unit moves toward waypoint along path", () => {
		const frag = trackFragment(createFragment());

		const unit = spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "mover_1");

		// Set a navigation path: (0,0) → (10,0)
		unit.set(Navigation, {
			pathJson: JSON.stringify([{ x: 10, y: 0, z: 0 }]),
			pathIndex: 0,
			moving: true,
		});

		// Simulate several movement ticks (delta=0.1s, speed=3, gameSpeed=1)
		for (let i = 0; i < 10; i++) {
			movementSystem(0.1, 1);
		}

		const pos = unit.get(Position)!;
		// Should have moved in the +x direction
		expect(pos.x).toBeGreaterThan(0);
	});

	it("unit stops when reaching waypoint", () => {
		const frag = trackFragment(createFragment());

		const unit = spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "mover_2");

		// Short path — 1 unit away, unit speed is 3/sec
		unit.set(Navigation, {
			pathJson: JSON.stringify([{ x: 1, y: 0, z: 0 }]),
			pathIndex: 0,
			moving: true,
		});

		// 1 second of movement at speed 3 should reach waypoint at distance 1
		movementSystem(1.0, 1);

		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Combat — component damage resolution
// ---------------------------------------------------------------------------

describe("combat — component damage", () => {
	it("hostile cult mech in melee range can damage player components", () => {
		const frag = trackFragment(createFragment());

		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "player_combat");
		// Place cult mech within melee range (2.5)
		spawnCultMech(1, 0, FULL_COMPONENTS, frag.id, "cult_combat");

		// Run combat many times — eventually damage should land
		let anyDamage = false;
		for (let tick = 0; tick < 100; tick++) {
			combatSystem();
			const events = getLastCombatEvents();
			if (events.length > 0) {
				anyDamage = true;
				break;
			}
		}

		expect(anyDamage).toBe(true);
	});

	it("combat events report component name and target", () => {
		const frag = trackFragment(createFragment());

		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "player_evt");
		spawnCultMech(1, 0, FULL_COMPONENTS, frag.id, "cult_evt");

		// Run until we get a combat event
		let found = false;
		for (let tick = 0; tick < 200; tick++) {
			combatSystem();
			const events = getLastCombatEvents();
			for (const ev of events) {
				expect(ev.attackerId).toBeTruthy();
				expect(ev.targetId).toBeTruthy();
				expect(ev.componentDamaged).toBeTruthy();
				expect(typeof ev.targetDestroyed).toBe("boolean");
				found = true;
			}
			if (found) break;
		}
		expect(found).toBe(true);
	});

	it("unit with all components broken is destroyed", () => {
		const frag = trackFragment(createFragment());

		// Player with only 1 component — easy to destroy
		const fragilePlayer = spawnPlayerUnit(
			0,
			0,
			[{ name: "power_cell", functional: true, material: "electronic" }],
			frag.id,
			"fragile",
		);
		// Strong cult mech with arms right next to the player
		spawnCultMech(
			1,
			0,
			[
				{ name: "arms", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
			frag.id,
			"destroyer",
		);

		// Run combat until player is destroyed or max attempts
		for (let tick = 0; tick < 500; tick++) {
			combatSystem();
			if (!fragilePlayer.isAlive()) break;
		}

		expect(fragilePlayer.isAlive()).toBe(false);
	});

	it("units out of melee range do not fight", () => {
		const frag = trackFragment(createFragment());

		// Place units far apart (distance = 20 >> melee range 2.5)
		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "far_player");
		spawnCultMech(20, 0, FULL_COMPONENTS, frag.id, "far_cult");

		combatSystem();
		const events = getLastCombatEvents();
		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Fragment merge — fog unification
// ---------------------------------------------------------------------------

describe("fragment merge — fog unification", () => {
	it("units from different fragments merge when close", () => {
		const frag1 = trackFragment(createFragment());
		const frag2 = trackFragment(createFragment());

		// Place units from different fragments within merge distance (6)
		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag1.id, "merge_a");
		spawnPlayerUnit(3, 0, FULL_COMPONENTS, frag2.id, "merge_b");

		const events = fragmentMergeSystem();

		// Should produce a merge event
		expect(events.length).toBeGreaterThan(0);
		expect(events[0].absorbedId).toBeTruthy();
		expect(events[0].survivorId).toBeTruthy();
	});

	it("units from same fragment do not trigger merge", () => {
		const frag = trackFragment(createFragment());

		spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag.id, "same_a");
		spawnPlayerUnit(3, 0, FULL_COMPONENTS, frag.id, "same_b");

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(0);
	});

	it("units from different fragments too far apart do not merge", () => {
		const frag1 = trackFragment(createFragment());
		const frag2 = trackFragment(createFragment());

		// Place units far apart (distance = 50 >> merge distance 6)
		spawnPlayerUnit(-25, 0, FULL_COMPONENTS, frag1.id, "far_a");
		spawnPlayerUnit(25, 0, FULL_COMPONENTS, frag2.id, "far_b");

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(0);
	});

	it("after merge, both units share the same fragment", () => {
		const frag1 = trackFragment(createFragment());
		const frag2 = trackFragment(createFragment());

		const unitA = spawnPlayerUnit(0, 0, FULL_COMPONENTS, frag1.id, "shared_a");
		const unitB = spawnPlayerUnit(3, 0, FULL_COMPONENTS, frag2.id, "shared_b");

		fragmentMergeSystem();

		const fragIdA = unitA.get(Fragment)!.fragmentId;
		const fragIdB = unitB.get(Fragment)!.fragmentId;
		expect(fragIdA).toBe(fragIdB);
	});
});

// ---------------------------------------------------------------------------
// Full integration — move, explore, fight, merge
// ---------------------------------------------------------------------------

describe("full integration — move, explore, fight, merge", () => {
	it("unit moves, reveals fog, encounters enemy, combat resolves", () => {
		const frag = trackFragment(createFragment());

		// Player starts at origin
		const player = spawnPlayerUnit(
			0,
			0,
			FULL_COMPONENTS,
			frag.id,
			"integ_player",
		);

		// Enemy positioned ahead
		spawnCultMech(5, 0, WEAK_COMPONENTS, frag.id, "integ_cult");

		// Step 1: Set movement path toward enemy
		player.set(Navigation, {
			pathJson: JSON.stringify([{ x: 4, y: 0, z: 0 }]),
			pathIndex: 0,
			moving: true,
		});

		// Step 2: Move + explore over several frames
		for (let frame = 0; frame < 20; frame++) {
			movementSystem(0.1, 1);
		}
		explorationSystem();

		// Fog should be revealed around the player's path
		expect(getFogAt(frag, 0, 0)).toBe(2);

		// Step 3: Player should be close to the enemy now
		const playerPos = player.get(Position)!;
		expect(playerPos.x).toBeGreaterThan(2);

		// Step 4: Run combat — they should be in melee range
		let combatOccurred = false;
		for (let tick = 0; tick < 100; tick++) {
			combatSystem();
			if (getLastCombatEvents().length > 0) {
				combatOccurred = true;
				break;
			}
		}
		expect(combatOccurred).toBe(true);
	});

	it("two fragments merge after units are moved close together", () => {
		const fragA = trackFragment(createFragment());
		const fragB = trackFragment(createFragment());

		// Start far apart — use large distance to prevent accidental merge
		const unitA = spawnPlayerUnit(
			-30,
			0,
			FULL_COMPONENTS,
			fragA.id,
			"merge_move_a",
		);
		const unitB = spawnPlayerUnit(
			30,
			0,
			FULL_COMPONENTS,
			fragB.id,
			"merge_move_b",
		);

		// Verify no merge while far apart
		const earlyEvents = fragmentMergeSystem();
		expect(earlyEvents).toHaveLength(0);

		// Teleport unit A close to unit B (within merge distance 6)
		unitA.set(Position, { x: 27, y: 0, z: 0 });

		// Now they should be close enough to merge (distance = 3)
		const mergeEvents = fragmentMergeSystem();
		expect(mergeEvents.length).toBeGreaterThan(0);

		// Both units should now share a fragment
		expect(unitA.get(Fragment)!.fragmentId).toBe(
			unitB.get(Fragment)!.fragmentId,
		);
	});
});
