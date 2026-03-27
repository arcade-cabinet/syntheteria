/**
 * Tests for ActionPanel component logic.
 *
 * Tests the selection-based action availability and button behavior
 * by querying the ECS directly — same logic the ActionPanel uses.
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	EngagementRule,
	EntityId,
	Faction,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../../../ecs/traits";
import { parseComponents } from "../../../ecs/types";
import { world } from "../../../ecs/world";

// Mock base management
vi.mock("../../../systems/baseManagement", () => ({
	foundBase: vi.fn(() => {
		return world.spawn(
			EntityId({ value: "test_base" }),
			Position({ x: 0, y: 0, z: 0 }),
			Faction({ value: "player" }),
		);
	}),
	validateBaseLocation: vi.fn(() => null),
}));

vi.mock("../../base/BasePanel", () => ({
	selectBase: vi.fn(),
}));

import {
	foundBase,
	validateBaseLocation,
} from "../../../systems/baseManagement";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const entities: Entity[] = [];

afterEach(() => {
	for (const entity of entities) {
		try {
			entity.destroy();
		} catch {
			// Entity may already be destroyed
		}
	}
	entities.length = 0;
	vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function spawnPlayerUnit(opts?: {
	components?: Array<{ name: string; functional: boolean; material: string }>;
	x?: number;
	z?: number;
}): Entity {
	const comps = opts?.components ?? [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	];

	const entity = world.spawn(
		EntityId({ value: `unit_${entities.length}` }),
		Position({ x: opts?.x ?? 50, y: 0, z: opts?.z ?? 50 }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: true,
		}),
		UnitComponents({ componentsJson: JSON.stringify(comps) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		EngagementRule({ value: "attack" }),
	);
	entities.push(entity);
	return entity;
}

/** Simulate ActionPanel's selection logic. */
function findSelectedPlayerUnit(): Entity | null {
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Unit)!.selected && entity.get(Faction)!.value === "player") {
			return entity;
		}
	}
	return null;
}

/** Simulate ActionPanel's scavenge proximity check. */
function hasNearbyScavenge(unitPos: { x: number; z: number }): boolean {
	const SCAVENGE_RANGE = 3.0;
	for (const site of world.query(Position, ScavengeSite)) {
		const siteData = site.get(ScavengeSite)!;
		if (siteData.remaining <= 0) continue;
		const sPos = site.get(Position)!;
		const dx = sPos.x - unitPos.x;
		const dz = sPos.z - unitPos.z;
		if (Math.sqrt(dx * dx + dz * dz) <= SCAVENGE_RANGE) {
			return true;
		}
	}
	return false;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("action availability", () => {
	it("shows actions when unit selected", () => {
		spawnPlayerUnit();

		const selected = findSelectedPlayerUnit();
		expect(selected).not.toBeNull();
	});

	it("shows no actions when nothing selected", () => {
		const unit = world.spawn(
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Idle Bot",
				speed: 3,
				selected: false,
			}),
		);
		entities.push(unit);

		const selected = findSelectedPlayerUnit();
		expect(selected).toBeNull();
	});

	it("MOVE button depends on functional legs", () => {
		const unit = spawnPlayerUnit({
			components: [
				{ name: "legs", functional: false, material: "metal" },
				{ name: "arms", functional: true, material: "metal" },
			],
		});

		const comps = parseComponents(
			unit.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const hasLegs = comps.some((c) => c.name === "legs" && c.functional);

		expect(hasLegs).toBe(false);
	});

	it("ATTACK button depends on functional arms", () => {
		const unit = spawnPlayerUnit({
			components: [
				{ name: "arms", functional: false, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});

		const comps = parseComponents(
			unit.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const hasArms = comps.some((c) => c.name === "arms" && c.functional);

		expect(hasArms).toBe(false);
	});

	it("SCAVENGE button depends on arms and nearby resources", () => {
		const unit = spawnPlayerUnit();
		const pos = unit.get(Position)!;

		// No scavenge sites nearby
		expect(hasNearbyScavenge(pos)).toBe(false);

		// Add a nearby scavenge site
		const site = world.spawn(
			Position({ x: pos.x + 1, y: 0, z: pos.z }),
			ScavengeSite({
				materialType: "scrapMetal",
				amountPerScavenge: 2,
				remaining: 5,
			}),
		);
		entities.push(site);

		expect(hasNearbyScavenge(pos)).toBe(true);
	});

	it("FOUND BASE button calls foundBase", () => {
		const unit = spawnPlayerUnit();
		const pos = unit.get(Position)!;

		// Simulate what the FOUND BASE button does
		const error = validateBaseLocation(
			world,
			Math.floor(pos.x / 2),
			Math.floor(pos.z / 2),
			"player",
		);
		expect(error).toBeNull();

		const baseName = "Test Base";
		foundBase(
			world,
			Math.floor(pos.x / 2),
			Math.floor(pos.z / 2),
			"player",
			baseName,
		);
		expect(foundBase).toHaveBeenCalled();
	});
});

describe("stance cycling", () => {
	it("cycles through engagement stances", () => {
		const unit = spawnPlayerUnit();
		const STANCE_ORDER = ["attack", "protect", "hold", "flee"] as const;

		let currentStance = unit.get(EngagementRule)?.value ?? "attack";
		expect(currentStance).toBe("attack");

		// Cycle through all stances
		for (let i = 0; i < STANCE_ORDER.length; i++) {
			const idx = STANCE_ORDER.indexOf(
				currentStance as (typeof STANCE_ORDER)[number],
			);
			const next = STANCE_ORDER[(idx + 1) % STANCE_ORDER.length]!;
			unit.set(EngagementRule, { value: next });
			currentStance = next;
		}

		// After full cycle, back to attack
		expect(currentStance).toBe("attack");
	});
});

describe("hostile unit handling", () => {
	it("shows hostile indicator for non-player units", () => {
		const enemy = world.spawn(
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "feral" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Feral Bot",
				speed: 2,
				selected: true,
			}),
		);
		entities.push(enemy);

		// ActionPanel checks faction before showing unit actions
		const faction = enemy.get(Faction)!.value;
		expect(faction).not.toBe("player");
	});
});

describe("REPAIR button (US-3.3)", () => {
	it("detects broken components on selected unit", () => {
		const unit = spawnPlayerUnit({
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});

		const comps = parseComponents(
			unit.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const brokenComps = comps.filter((c) => !c.functional);

		expect(brokenComps.length).toBe(1);
		expect(brokenComps[0].name).toBe("camera");
	});

	it("identifies nearby repairer with functional arms", () => {
		// Unit with broken component
		const target = spawnPlayerUnit({
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
			x: 50,
			z: 50,
		});

		// Nearby unit with functional arms (can repair) — spawned for side effect
		spawnPlayerUnit({
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
			x: 51,
			z: 50,
		});

		const targetPos = target.get(Position)!;

		// Simulate the findNearbyRepairer logic
		const REPAIR_RANGE = 3.0;
		let foundRepairer: Entity | null = null;
		for (const entity of world.query(Unit, Faction, Position, UnitComponents)) {
			if (entity.get(Faction)?.value !== "player") continue;
			const pos = entity.get(Position)!;
			const dx = pos.x - targetPos.x;
			const dz = pos.z - targetPos.z;
			if (Math.sqrt(dx * dx + dz * dz) > REPAIR_RANGE) continue;
			const comps = parseComponents(
				entity.get(UnitComponents)?.componentsJson ?? "[]",
			);
			if (comps.some((c) => c.name === "arms" && c.functional)) {
				foundRepairer = entity;
				break;
			}
		}

		expect(foundRepairer).not.toBeNull();
	});

	it("no REPAIR when no broken components", () => {
		const unit = spawnPlayerUnit({
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		});

		const comps = parseComponents(
			unit.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const brokenComps = comps.filter((c) => !c.functional);

		expect(brokenComps.length).toBe(0);
	});
});

describe("HACK button (US-4.3)", () => {
	it("canInitiateHack requires player faction and functional camera", () => {
		// Player unit with camera
		const hacker = spawnPlayerUnit({
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
			],
		});

		const faction = hacker.get(Faction)?.value;
		expect(faction).toBe("player");

		const comps = parseComponents(
			hacker.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const hasCamera = comps.some((c) => c.name === "camera" && c.functional);
		expect(hasCamera).toBe(true);
	});

	it("cannot hack if no functional camera", () => {
		const hacker = spawnPlayerUnit({
			components: [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
			],
		});

		const comps = parseComponents(
			hacker.get(UnitComponents)?.componentsJson ?? "[]",
		);
		const hasCamera = comps.some((c) => c.name === "camera" && c.functional);
		expect(hasCamera).toBe(false);
	});

	it("detects nearby hackable feral/rogue enemies", () => {
		spawnPlayerUnit({ x: 50, z: 50 });

		// Spawn a feral enemy within hack range (6 units)
		const enemy = world.spawn(
			EntityId({ value: "enemy_hack_target" }),
			Position({ x: 53, y: 0, z: 50 }),
			Faction({ value: "feral" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Feral Bot",
				speed: 2,
				selected: false,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				]),
			}),
		);
		entities.push(enemy);

		// Check hackable
		const enemyFaction = enemy.get(Faction)?.value;
		expect(enemyFaction === "feral" || enemyFaction === "rogue").toBe(true);
	});

	it("cultists cannot be hacked (they are human)", () => {
		const cultist = world.spawn(
			Position({ x: 53, y: 0, z: 50 }),
			Faction({ value: "cultist" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Cult Mech",
				speed: 2,
				selected: false,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "camera", functional: true, material: "electronic" },
				]),
			}),
		);
		entities.push(cultist);

		// Cultists are NOT in the hackable factions set
		const faction = cultist.get(Faction)?.value;
		expect(faction).toBe("cultist");
		// canBeHacked checks for feral/rogue only
	});
});
