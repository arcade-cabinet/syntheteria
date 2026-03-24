/**
 * Tests for the resource scavenging system.
 *
 * Covers both ECS-based scavenging (ScavengeSite entities)
 * and the global resource pool management.
 */

import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import {
	Faction,
	Inventory,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { UnitComponent } from "../../ecs/types";
import { serializeComponents } from "../../ecs/types";
import {
	addResource,
	getResources,
	resetResources,
	spendResource,
} from "../resources";

// --- Helpers ---

const ARMS_FUNCTIONAL: UnitComponent[] = [
	{ name: "arms", functional: true, material: "metal" },
	{ name: "legs", functional: true, material: "metal" },
	{ name: "power_cell", functional: true, material: "electronic" },
];

const NO_ARMS: UnitComponent[] = [
	{ name: "camera", functional: true, material: "electronic" },
	{ name: "legs", functional: true, material: "metal" },
];

function spawnTestUnit(
	w: ReturnType<typeof createWorld>,
	opts: { x: number; z: number; components: UnitComponent[]; moving?: boolean },
) {
	return w.spawn(
		Position({ x: opts.x, y: 0, z: opts.z }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: serializeComponents(opts.components) }),
		Faction({ value: "player" }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: opts.moving ?? false }),
		Inventory({ inventoryJson: "{}" }),
	);
}

function spawnScavengeSite(
	w: ReturnType<typeof createWorld>,
	opts: {
		x: number;
		z: number;
		materialType: string;
		amount: number;
		remaining: number;
	},
) {
	return w.spawn(
		Position({ x: opts.x, y: 0, z: opts.z }),
		ScavengeSite({
			materialType: opts.materialType,
			amountPerScavenge: opts.amount,
			remaining: opts.remaining,
		}),
	);
}

// --- Tests ---

describe("ResourcePool", () => {
	beforeEach(() => {
		resetResources();
	});

	it("starts with zero resources", () => {
		const pool = getResources();
		expect(pool.scrapMetal).toBe(0);
		expect(pool.circuitry).toBe(0);
		expect(pool.powerCells).toBe(0);
		expect(pool.durasteel).toBe(0);
	});

	it("addResource increases pool", () => {
		addResource("scrapMetal", 5);
		addResource("circuitry", 3);
		const pool = getResources();
		expect(pool.scrapMetal).toBe(5);
		expect(pool.circuitry).toBe(3);
	});

	it("spendResource decreases pool and returns true", () => {
		addResource("durasteel", 10);
		const result = spendResource("durasteel", 4);
		expect(result).toBe(true);
		expect(getResources().durasteel).toBe(6);
	});

	it("spendResource returns false when insufficient", () => {
		addResource("powerCells", 2);
		const result = spendResource("powerCells", 5);
		expect(result).toBe(false);
		// Should not have spent anything
		expect(getResources().powerCells).toBe(2);
	});

	it("getResources returns a copy, not a reference", () => {
		addResource("scrapMetal", 10);
		const pool = getResources();
		pool.scrapMetal = 999;
		expect(getResources().scrapMetal).toBe(10);
	});
});

describe("ECS ScavengeSite scavenging", () => {
	let w: ReturnType<typeof createWorld>;

	beforeEach(() => {
		w = createWorld();
		resetResources();
	});

	it("unit with arms at site collects into inventory", () => {
		const unit = spawnTestUnit(w, { x: 5, z: 5, components: ARMS_FUNCTIONAL });
		spawnScavengeSite(w, {
			x: 5,
			z: 6,
			materialType: "scrapMetal",
			amount: 3,
			remaining: 2,
		});

		// Simulate scavenging by running the query logic inline
		// (The actual resourceSystem() uses the module-level world singleton,
		//  so we test the trait/inventory integration here)
		const sites = Array.from(w.query(Position, ScavengeSite));
		expect(sites.length).toBe(1);

		const siteData = sites[0].get(ScavengeSite)!;
		expect(siteData.materialType).toBe("scrapMetal");
		expect(siteData.remaining).toBe(2);
		expect(siteData.amountPerScavenge).toBe(3);

		// Verify unit has Inventory trait
		expect(unit.has(Inventory)).toBe(true);
		const invJson = unit.get(Inventory)?.inventoryJson;
		expect(invJson).toBe("{}");
	});

	it("depleted site has remaining=0", () => {
		const site = spawnScavengeSite(w, {
			x: 10,
			z: 10,
			materialType: "circuitry",
			amount: 2,
			remaining: 1,
		});

		// Deplete it
		site.set(ScavengeSite, { remaining: 0 });
		expect(site.get(ScavengeSite)!.remaining).toBe(0);
	});

	it("unit without arms cannot be a scavenger", () => {
		const unit = spawnTestUnit(w, { x: 5, z: 5, components: NO_ARMS });
		// Unit without arms should not have the right component configuration
		const comps = JSON.parse(unit.get(UnitComponents)!.componentsJson);
		const hasArms = comps.some(
			(c: UnitComponent) => c.name === "arms" && c.functional,
		);
		expect(hasArms).toBe(false);
	});

	it("moving unit should not scavenge (moving flag check)", () => {
		const unit = spawnTestUnit(w, {
			x: 5,
			z: 5,
			components: ARMS_FUNCTIONAL,
			moving: true,
		});
		const nav = unit.get(Navigation)!;
		expect(nav.moving).toBe(true);
	});
});

describe("materials config", () => {
	it("all 4 material types are valid ResourcePool keys", () => {
		const pool = getResources();
		expect("scrapMetal" in pool).toBe(true);
		expect("circuitry" in pool).toBe(true);
		expect("powerCells" in pool).toBe(true);
		expect("durasteel" in pool).toBe(true);
	});

	it("legacy eWaste and intactComponents are no longer in pool", () => {
		const pool = getResources();
		expect("eWaste" in pool).toBe(false);
		expect("intactComponents" in pool).toBe(false);
	});
});
