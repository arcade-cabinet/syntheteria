/**
 * Hacking system tests.
 *
 * Verifies: initiation requirements, range checks, progress ticking,
 * interruption conditions, faction switch on completion, compute gating.
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { resetCompute } from "../compute";
import {
	canBeHacked,
	cancelHack,
	canInitiateHack,
	getActiveHacks,
	getHackProgress,
	getLastHackEvents,
	HACK_PROGRESS_REQUIRED,
	HACK_RANGE,
	hackingSystem,
	resetHacking,
	startHack,
} from "../hacking";

const entities: Entity[] = [];

function spawnUnit(
	id: string,
	faction: "player" | "feral" | "cultist" | "rogue",
	x: number,
	z: number,
	opts: {
		components?: {
			name: string;
			functional: boolean;
			material: "metal" | "plastic" | "electronic";
		}[];
	} = {},
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

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	resetHacking();
	resetCompute();
});

// ---------------------------------------------------------------------------
// canBeHacked
// ---------------------------------------------------------------------------

describe("canBeHacked", () => {
	it("returns true for feral units", () => {
		const target = spawnUnit("feral1", "feral", 5, 5);
		expect(canBeHacked(target)).toBe(true);
	});

	it("returns true for rogue units", () => {
		const target = spawnUnit("rogue1", "rogue", 5, 5);
		expect(canBeHacked(target)).toBe(true);
	});

	it("returns false for cultist units (humans cannot be hacked)", () => {
		const target = spawnUnit("cult1", "cultist", 5, 5);
		expect(canBeHacked(target)).toBe(false);
	});

	it("returns false for player units", () => {
		const target = spawnUnit("p1", "player", 5, 5);
		expect(canBeHacked(target)).toBe(false);
	});

	it("returns false for units with all components broken", () => {
		const target = spawnUnit("feral1", "feral", 5, 5, {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
			],
		});
		expect(canBeHacked(target)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canInitiateHack
// ---------------------------------------------------------------------------

describe("canInitiateHack", () => {
	it("returns true for player unit with functional camera", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		expect(canInitiateHack(hacker)).toBe(true);
	});

	it("returns false for non-player units", () => {
		const unit = spawnUnit("feral1", "feral", 0, 0);
		expect(canInitiateHack(unit)).toBe(false);
	});

	it("returns false for player unit without functional camera", () => {
		const hacker = spawnUnit("p1", "player", 0, 0, {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
			],
		});
		expect(canInitiateHack(hacker)).toBe(false);
	});

	it("returns false for player unit with no camera at all", () => {
		const hacker = spawnUnit("p1", "player", 0, 0, {
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});
		expect(canInitiateHack(hacker)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// startHack
// ---------------------------------------------------------------------------

describe("startHack", () => {
	it("initiates hack when all requirements met", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7); // within HACK_RANGE

		expect(startHack(hacker, target)).toBe(true);
		expect(getActiveHacks().size).toBe(1);
	});

	it("fails when target is out of range", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		const target = spawnUnit("feral1", "feral", 50, 50); // way out of range

		expect(startHack(hacker, target)).toBe(false);
		expect(getActiveHacks().size).toBe(0);
	});

	it("fails when target is a cultist", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("cult1", "cultist", 5, 7);

		expect(startHack(hacker, target)).toBe(false);
	});

	it("fails when hacker has no functional camera", () => {
		const hacker = spawnUnit("p1", "player", 5, 5, {
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
			],
		});
		const target = spawnUnit("feral1", "feral", 5, 7);

		expect(startHack(hacker, target)).toBe(false);
	});

	it("stops hacker movement on initiation", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		hacker.set(Navigation, { moving: true });
		const target = spawnUnit("feral1", "feral", 5, 7);

		startHack(hacker, target);
		expect(hacker.get(Navigation)!.moving).toBe(false);
	});

	it("replaces existing hack when hacker starts a new one", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target1 = spawnUnit("feral1", "feral", 5, 7);
		const target2 = spawnUnit("feral2", "feral", 5, 8);

		startHack(hacker, target1);
		expect(getActiveHacks().size).toBe(1);

		startHack(hacker, target2);
		expect(getActiveHacks().size).toBe(1);
		const hack = getActiveHacks().get("p1")!;
		expect(hack.targetId).toBe("feral2");
	});
});

// ---------------------------------------------------------------------------
// hackingSystem -- progress + completion
// ---------------------------------------------------------------------------

describe("hackingSystem", () => {
	it("progresses hack each tick", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		hackingSystem();
		const progress = getHackProgress("p1");
		expect(progress).toBeGreaterThan(0);
		expect(progress).toBeLessThan(1);
	});

	it("completes hack after enough ticks and switches faction", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		for (let i = 0; i < HACK_PROGRESS_REQUIRED; i++) {
			hackingSystem();
		}

		// Target should now be player faction
		expect(target.get(Faction)?.value).toBe("player");

		// Hack should be removed
		expect(getActiveHacks().size).toBe(0);

		// Should have a completion event
		const events = getLastHackEvents();
		expect(events.some((e) => e.type === "completed")).toBe(true);
	});

	it("interrupts hack when target moves out of range", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		// Move target out of range
		target.set(Position, { x: 100, y: 0, z: 100 });

		hackingSystem();

		expect(getActiveHacks().size).toBe(0);
		const events = getLastHackEvents();
		expect(
			events.some(
				(e) => e.type === "interrupted" && e.reason === "out_of_range",
			),
		).toBe(true);
	});

	it("interrupts hack when hacker's camera is destroyed", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		// Break the hacker's camera
		hacker.set(UnitComponents, {
			componentsJson: serializeComponents([
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			]),
		});

		hackingSystem();

		expect(getActiveHacks().size).toBe(0);
		const events = getLastHackEvents();
		expect(
			events.some(
				(e) => e.type === "interrupted" && e.reason === "camera_destroyed",
			),
		).toBe(true);
	});

	it("interrupts hack when target is destroyed", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		target.destroy();

		hackingSystem();

		expect(getActiveHacks().size).toBe(0);
		const events = getLastHackEvents();
		expect(
			events.some(
				(e) => e.type === "interrupted" && e.reason === "entity_destroyed",
			),
		).toBe(true);
	});

	it("interrupts hack when target is already converted", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		// Manually convert the target
		target.set(Faction, { value: "player" });

		hackingSystem();

		expect(getActiveHacks().size).toBe(0);
		const events = getLastHackEvents();
		expect(
			events.some(
				(e) => e.type === "interrupted" && e.reason === "target_unhackable",
			),
		).toBe(true);
	});

	it("stops target movement on successful hack", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		target.set(Navigation, { moving: true });
		startHack(hacker, target);

		for (let i = 0; i < HACK_PROGRESS_REQUIRED; i++) {
			hackingSystem();
		}

		expect(target.get(Navigation)!.moving).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// cancelHack
// ---------------------------------------------------------------------------

describe("cancelHack", () => {
	it("removes an active hack", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		expect(cancelHack("p1")).toBe(true);
		expect(getActiveHacks().size).toBe(0);
	});

	it("returns false when no hack to cancel", () => {
		expect(cancelHack("nonexistent")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getHackProgress
// ---------------------------------------------------------------------------

describe("getHackProgress", () => {
	it("returns null when not hacking", () => {
		expect(getHackProgress("nobody")).toBeNull();
	});

	it("returns normalized progress (0-1)", () => {
		const hacker = spawnUnit("p1", "player", 5, 5);
		const target = spawnUnit("feral1", "feral", 5, 7);
		startHack(hacker, target);

		expect(getHackProgress("p1")).toBe(0);

		hackingSystem();
		const progress = getHackProgress("p1");
		expect(progress).toBeGreaterThan(0);
		expect(progress).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("exact range boundary (at HACK_RANGE) succeeds", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		const target = spawnUnit("feral1", "feral", HACK_RANGE, 0);

		expect(startHack(hacker, target)).toBe(true);
	});

	it("slightly beyond HACK_RANGE fails", () => {
		const hacker = spawnUnit("p1", "player", 0, 0);
		const target = spawnUnit("feral1", "feral", HACK_RANGE + 0.1, 0);

		expect(startHack(hacker, target)).toBe(false);
	});

	it("multiple hackers can hack different targets simultaneously", () => {
		const hacker1 = spawnUnit("p1", "player", 5, 5);
		const hacker2 = spawnUnit("p2", "player", 15, 15);
		const target1 = spawnUnit("feral1", "feral", 5, 7);
		const target2 = spawnUnit("feral2", "feral", 15, 17);

		startHack(hacker1, target1);
		startHack(hacker2, target2);

		expect(getActiveHacks().size).toBe(2);
	});
});
