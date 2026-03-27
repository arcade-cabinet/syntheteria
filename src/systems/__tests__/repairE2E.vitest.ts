/**
 * Repair end-to-end workflow tests.
 *
 * Covers the full repair lifecycle: validation, resource consumption,
 * component repair, and system tick processing.
 */
import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { parseComponents, serializeComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { getActiveRepairs, repairSystem, startRepair } from "../repair";
import { addResource, getResources, resetResources } from "../resources";

const entities: Entity[] = [];

function makeComponents(...parts: UnitComponent[]): string {
	return serializeComponents(parts);
}

const FUNCTIONAL_ARMS: UnitComponent = {
	name: "arms",
	functional: true,
	material: "metal",
};
const FUNCTIONAL_LEGS: UnitComponent = {
	name: "legs",
	functional: true,
	material: "metal",
};
const FUNCTIONAL_CAMERA: UnitComponent = {
	name: "camera",
	functional: true,
	material: "electronic",
};
const BROKEN_CAMERA: UnitComponent = {
	name: "camera",
	functional: false,
	material: "electronic",
};
const BROKEN_LEGS: UnitComponent = {
	name: "legs",
	functional: false,
	material: "metal",
};

function spawnUnit(
	x: number,
	z: number,
	components: UnitComponent[],
	id?: string,
): Entity {
	const e = world.spawn(
		EntityId({ value: id ?? `unit_e2e_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "test" }),
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

beforeEach(() => {
	resetResources();
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	// Drain any leftover active repairs by ticking until empty
	for (let i = 0; i < 20; i++) {
		if (getActiveRepairs().length === 0) break;
		repairSystem();
	}
	resetResources();
});

describe("repair end-to-end", () => {
	it("startRepair returns false if repairer has no arms", () => {
		// Repairer only has legs and camera -- no arms at all
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_LEGS, FUNCTIONAL_CAMERA]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA, FUNCTIONAL_LEGS]);

		addResource("circuitry", 50);
		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("startRepair returns false if target has no broken components", () => {
		// Target has all components functional
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS, FUNCTIONAL_LEGS]);
		const target = spawnUnit(1, 0, [FUNCTIONAL_CAMERA, FUNCTIONAL_LEGS]);

		addResource("circuitry", 50);
		addResource("scrapMetal", 50);
		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("startRepair consumes resources and fixes component", () => {
		// Provide exactly enough resources: camera is electronic -> 2 circuitry
		addResource("circuitry", 10);

		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS, FUNCTIONAL_LEGS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA, FUNCTIONAL_LEGS]);

		const resourcesBefore = getResources();
		expect(resourcesBefore.circuitry).toBe(10);

		const started = startRepair(repairer, target, "camera");
		expect(started).toBe(true);

		// Resources should be spent immediately on startRepair
		const resourcesAfter = getResources();
		expect(resourcesAfter.circuitry).toBe(8); // 10 - 2 (electronic cost)

		// Complete the repair (5 ticks)
		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		// Component should now be functional
		const comps = parseComponents(target.get(UnitComponents)?.componentsJson);
		const camera = comps.find((c: UnitComponent) => c.name === "camera");
		expect(camera?.functional).toBe(true);
		expect(getActiveRepairs()).toHaveLength(0);
	});

	it("startRepair returns false without sufficient resources", () => {
		// No resources at all -- pool is at zero from resetResources()
		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS, FUNCTIONAL_LEGS]);
		const target = spawnUnit(1, 0, [BROKEN_CAMERA]); // electronic -> 2 circuitry needed

		const started = startRepair(repairer, target, "camera");

		expect(started).toBe(false);
		expect(getActiveRepairs()).toHaveLength(0);
		// Resources should remain untouched at zero
		expect(getResources().circuitry).toBe(0);
	});

	it("repairSystem processes active repairs", () => {
		addResource("scrapMetal", 50);

		const repairer = spawnUnit(0, 0, [FUNCTIONAL_ARMS]);
		const target = spawnUnit(1, 0, [BROKEN_LEGS], "repair_target");

		// Start repair on legs (metal -> 3 scrapMetal)
		const started = startRepair(repairer, target, "legs");
		expect(started).toBe(true);
		expect(getActiveRepairs()).toHaveLength(1);
		expect(getActiveRepairs()[0].ticksRemaining).toBe(5);

		// Tick 3 times -- should still be in progress
		repairSystem();
		repairSystem();
		repairSystem();
		expect(getActiveRepairs()).toHaveLength(1);
		expect(getActiveRepairs()[0].ticksRemaining).toBe(2);

		// Component should still be broken mid-repair
		const midComps = parseComponents(
			target.get(UnitComponents)?.componentsJson,
		);
		const midLegs = midComps.find((c: UnitComponent) => c.name === "legs");
		expect(midLegs?.functional).toBe(false);

		// Tick remaining 2 times to complete
		repairSystem();
		repairSystem();

		// Repair should be done
		expect(getActiveRepairs()).toHaveLength(0);

		// Component should now be fixed
		const finalComps = parseComponents(
			target.get(UnitComponents)?.componentsJson,
		);
		const finalLegs = finalComps.find((c: UnitComponent) => c.name === "legs");
		expect(finalLegs?.functional).toBe(true);
	});
});
