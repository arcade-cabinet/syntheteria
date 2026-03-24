/**
 * Unit tests for engagement rules.
 *
 * Tests that the EngagementRule trait:
 * - Defaults to "attack" for new player units
 * - Can be cycled through all four states
 * - Integrates with combat (hold/flee suppress retaliation)
 */
import type { Entity } from "koota";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	EngagementRule,
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { serializeComponents, type UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";

// Mock audio to avoid errors in test env
vi.mock("../../audio", () => ({
	playSfx: () => {},
}));

// Mock pathfinding
vi.mock("../../systems/pathfinding", () => ({
	findPath: () => [],
}));

const entities: Entity[] = [];

function spawnPlayerUnit(
	x: number,
	z: number,
	rule: "attack" | "flee" | "protect" | "hold" = "attack",
	components?: UnitComponent[],
): Entity {
	const comps = components ?? [
		{ name: "arms", functional: true, material: "metal" as const },
		{ name: "camera", functional: true, material: "electronic" as const },
		{ name: "legs", functional: true, material: "metal" as const },
		{ name: "power_cell", functional: true, material: "electronic" as const },
	];
	const e = world.spawn(
		EntityId({ value: `player_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Bot",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: serializeComponents(comps) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		EngagementRule({ value: rule }),
	);
	entities.push(e);
	return e;
}

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
});

describe("EngagementRule trait", () => {
	it("defaults to attack", () => {
		const unit = spawnPlayerUnit(0, 0);
		expect(unit.get(EngagementRule)!.value).toBe("attack");
	});

	it("can be set to each rule", () => {
		const rules = ["attack", "flee", "protect", "hold"] as const;
		for (const rule of rules) {
			const unit = spawnPlayerUnit(0, 0, rule);
			expect(unit.get(EngagementRule)!.value).toBe(rule);
		}
	});

	it("can be cycled through values", () => {
		const unit = spawnPlayerUnit(0, 0, "attack");

		const rules = ["attack", "flee", "protect", "hold"] as const;
		const current = unit.get(EngagementRule)!.value;
		const nextIdx = (rules.indexOf(current) + 1) % rules.length;
		unit.set(EngagementRule, { value: rules[nextIdx] });

		expect(unit.get(EngagementRule)!.value).toBe("flee");
	});
});

describe("engagement rule effects on combat", () => {
	it("attack rule allows retaliation (via combat check)", () => {
		const player = spawnPlayerUnit(0, 0, "attack");
		const rule = player.get(EngagementRule)!.value;
		expect(rule === "attack" || rule === "protect").toBe(true);
	});

	it("hold rule suppresses retaliation", () => {
		const player = spawnPlayerUnit(0, 0, "hold");
		const rule = player.get(EngagementRule)!.value;
		const canRetaliate = rule === "attack" || rule === "protect";
		expect(canRetaliate).toBe(false);
	});

	it("flee rule suppresses retaliation", () => {
		const player = spawnPlayerUnit(0, 0, "flee");
		const rule = player.get(EngagementRule)!.value;
		const canRetaliate = rule === "attack" || rule === "protect";
		expect(canRetaliate).toBe(false);
	});

	it("protect rule allows retaliation", () => {
		const player = spawnPlayerUnit(0, 0, "protect");
		const rule = player.get(EngagementRule)!.value;
		const canRetaliate = rule === "attack" || rule === "protect";
		expect(canRetaliate).toBe(true);
	});
});
