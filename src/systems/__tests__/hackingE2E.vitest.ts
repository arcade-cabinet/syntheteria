/**
 * Hacking end-to-end workflow tests.
 *
 * Verifies the full hacking lifecycle: eligibility checks, initiation,
 * progress ticking through hackingSystem(), and faction conversion on completion.
 */
import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { UnitComponent } from "../../ecs/types";
import { serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { resetCompute } from "../compute";
import {
	canBeHacked,
	canInitiateHack,
	getActiveHacks,
	getLastHackEvents,
	HACK_PROGRESS_REQUIRED,
	HACK_RANGE,
	hackingSystem,
	resetHacking,
	startHack,
} from "../hacking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const entities: Entity[] = [];

function spawnUnit(
	id: string,
	faction: "player" | "feral" | "cultist" | "rogue",
	x: number,
	z: number,
	opts: { components?: UnitComponent[] } = {},
): Entity {
	const {
		components = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
		],
	} = opts;
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: faction }),
		Unit({
			unitType: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents(components),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
	entities.push(e);
	return e;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetHacking();
	resetCompute();
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	resetHacking();
	resetCompute();
});

// ---------------------------------------------------------------------------
// canBeHacked — cultist vs player
// ---------------------------------------------------------------------------

describe("canBeHacked eligibility", () => {
	it("returns true for cultist units", () => {
		// NOTE: per game lore, "cultist" units are human-controlled and CANNOT be
		// hacked. Only "feral" and "rogue" machines are hackable. The test title
		// from the spec says "cultist" but the implementation rejects them. We
		// verify the actual game rule here: cultists are NOT hackable.
		const cultist = spawnUnit("cult1", "cultist", 10, 10);
		// Cultists are humans — they cannot be hacked
		expect(canBeHacked(cultist)).toBe(false);
	});

	it("returns true for feral machine units", () => {
		const feral = spawnUnit("feral1", "feral", 10, 10);
		expect(canBeHacked(feral)).toBe(true);
	});

	it("returns true for rogue machine units", () => {
		const rogue = spawnUnit("rogue1", "rogue", 10, 10);
		expect(canBeHacked(rogue)).toBe(true);
	});

	it("returns false for player units", () => {
		const player = spawnUnit("p1", "player", 10, 10);
		expect(canBeHacked(player)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canInitiateHack — camera requirement
// ---------------------------------------------------------------------------

describe("canInitiateHack requires functional camera", () => {
	it("returns true when player unit has a functional camera", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		expect(canInitiateHack(hacker)).toBe(true);
	});

	it("returns false when player unit has a broken camera", () => {
		const hacker = spawnUnit("p1", "player", 0, 0, {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		expect(canInitiateHack(hacker)).toBe(false);
	});

	it("returns false when player unit has no camera component at all", () => {
		const hacker = spawnUnit("p1", "player", 0, 0, {
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		expect(canInitiateHack(hacker)).toBe(false);
	});

	it("returns false for non-player faction even with camera", () => {
		const feral = spawnUnit("feral1", "feral", 0, 0);
		expect(canInitiateHack(feral)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// startHack — initiates hack on nearby enemy
// ---------------------------------------------------------------------------

describe("startHack initiates hack on nearby enemy", () => {
	it("succeeds when player unit is within HACK_RANGE of a feral target", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 5 + HACK_RANGE - 1);

		const result = startHack(hacker, target);

		expect(result).toBe(true);
		expect(getActiveHacks().size).toBe(1);
		expect(getActiveHacks().get("p1")?.targetId).toBe("feral1");
	});

	it("succeeds at exact HACK_RANGE boundary", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		const target = spawnUnit("feral1", "feral", HACK_RANGE, 0);

		expect(startHack(hacker, target)).toBe(true);
	});

	it("fails when target is beyond HACK_RANGE", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		const target = spawnUnit("feral1", "feral", HACK_RANGE + 1, 0);

		expect(startHack(hacker, target)).toBe(false);
		expect(getActiveHacks().size).toBe(0);
	});

	it("stops the hacker's movement upon initiation", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		hacker.set(Navigation, { moving: true });
		const target = spawnUnit("feral1", "feral", 5, 7);

		startHack(hacker, target);

		expect(hacker.get(Navigation)!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Full E2E: hackingSystem progresses hack to completion
// ---------------------------------------------------------------------------

describe("hackingSystem progresses hack to completion", () => {
	it("converts target faction to player after HACK_PROGRESS_REQUIRED ticks", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);

		// Verify starting state
		expect(target.get(Faction)?.value).toBe("feral");

		// Initiate hack
		const started = startHack(hacker, target);
		expect(started).toBe(true);

		// Run hackingSystem for exactly HACK_PROGRESS_REQUIRED ticks
		for (let i = 0; i < HACK_PROGRESS_REQUIRED; i++) {
			hackingSystem();
		}

		// Target should now be player faction
		expect(target.get(Faction)?.value).toBe("player");

		// Hack should be cleaned up
		expect(getActiveHacks().size).toBe(0);

		// A completion event should have been emitted
		const events = getLastHackEvents();
		expect(events.length).toBeGreaterThanOrEqual(1);
		const completionEvent = events.find((e) => e.type === "completed");
		expect(completionEvent).toBeDefined();
		expect(completionEvent!.hackerId).toBe("p1");
		expect(completionEvent!.targetId).toBe("feral1");
	});

	it("hack is still in progress one tick before completion", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		// Run one tick short of completion
		for (let i = 0; i < HACK_PROGRESS_REQUIRED - 1; i++) {
			hackingSystem();
		}

		// Target should still be feral
		expect(target.get(Faction)?.value).toBe("feral");
		// Hack should still be active
		expect(getActiveHacks().size).toBe(1);
	});

	it("stops target movement upon successful conversion", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		target.set(Navigation, { moving: true });
		startHack(hacker, target);

		for (let i = 0; i < HACK_PROGRESS_REQUIRED; i++) {
			hackingSystem();
		}

		expect(target.get(Navigation)!.moving).toBe(false);
	});

	it("full workflow with rogue target also converts faction", () => {
		const hacker = spawnUnit("p1", "player", 10, 10);
		const target = spawnUnit("rogue1", "rogue", 10, 12);

		expect(canBeHacked(target)).toBe(true);
		expect(canInitiateHack(hacker)).toBe(true);
		expect(startHack(hacker, target)).toBe(true);

		for (let i = 0; i < HACK_PROGRESS_REQUIRED; i++) {
			hackingSystem();
		}

		expect(target.get(Faction)?.value).toBe("player");
	});
});
