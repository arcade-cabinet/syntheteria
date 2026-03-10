/**
 * Unit tests for the outpost system.
 *
 * Tests cover:
 * - getOutpostRadius: tier config lookup and fallback extrapolation
 * - getOutpostTier: lookup by outpost ID
 * - createOutpost: entity creation, territory claim, minimum spacing enforcement
 * - upgradeOutpost: tier increment, territory expansion, max-tier cap
 * - destroyOutpost: entity removal, territory cleanup
 * - getAllOutposts / getOutpostTerritory: store queries
 * - resetOutposts: store cleanup
 */

import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/types";
import {
	createOutpost,
	destroyOutpost,
	getAllOutposts,
	getOutpostRadius,
	getOutpostTerritory,
	getOutpostTier,
	resetOutposts,
	upgradeOutpost,
} from "../outpost";
import {
	getAllTerritories,
	resetTerritories,
} from "../territory";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const entitiesToCleanup: Entity[] = [];

beforeEach(() => {
	resetOutposts();
	resetTerritories();
});

afterEach(() => {
	// Clean up any entities added to the world
	for (const e of entitiesToCleanup) {
		try {
			world.remove(e);
		} catch {
			// entity may have already been removed by destroyOutpost
		}
	}
	entitiesToCleanup.length = 0;
	resetOutposts();
	resetTerritories();
});

// ---------------------------------------------------------------------------
// getOutpostRadius
// ---------------------------------------------------------------------------

describe("getOutpostRadius", () => {
	it("returns configured radius for tier 1", () => {
		expect(getOutpostRadius(1)).toBe(10);
	});

	it("returns configured radius for tier 2", () => {
		expect(getOutpostRadius(2)).toBe(20);
	});

	it("returns configured radius for tier 3", () => {
		expect(getOutpostRadius(3)).toBe(35);
	});

	it("extrapolates for tier 4 (beyond config)", () => {
		// last defined: tier 3, radius 35. Formula: 35 + (4-3)*15 = 50
		expect(getOutpostRadius(4)).toBe(50);
	});

	it("extrapolates for tier 5", () => {
		// 35 + (5-3)*15 = 65
		expect(getOutpostRadius(5)).toBe(65);
	});
});

// ---------------------------------------------------------------------------
// getOutpostTier
// ---------------------------------------------------------------------------

describe("getOutpostTier", () => {
	it("returns 0 for unknown outpost ID", () => {
		expect(getOutpostTier("nonexistent")).toBe(0);
	});

	it("returns the tier of a created outpost", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 2);
		expect(id).not.toBeNull();
		expect(getOutpostTier(id!)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// createOutpost
// ---------------------------------------------------------------------------

describe("createOutpost", () => {
	it("creates an outpost and returns its entity ID", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();
		expect(typeof id).toBe("string");

		// Verify entity was created in the world
		const entity = world.entities.find((e) => e.id === id);
		expect(entity).toBeDefined();
		if (entity) entitiesToCleanup.push(entity);
	});

	it("defaults to tier 1", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();
		expect(getOutpostTier(id!)).toBe(1);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("creates a territory associated with the outpost", () => {
		const id = createOutpost("player", { x: 10, z: 20 }, 1, 5);
		expect(id).not.toBeNull();

		const territories = getAllTerritories();
		expect(territories.length).toBeGreaterThanOrEqual(1);

		// The territory center should match the outpost position
		const territory = territories.find(
			(t) => t.center.x === 10 && t.center.z === 20,
		);
		expect(territory).toBeDefined();
		expect(territory?.ownerId).toBe("player");
		expect(territory?.radius).toBe(10); // tier 1 radius

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("sets the outpost faction correctly", () => {
		const id = createOutpost("cultist", { x: 0, z: 0 });
		expect(id).not.toBeNull();

		const entity = world.entities.find((e) => e.id === id);
		expect(entity?.faction).toBe("cultist");
		if (entity) entitiesToCleanup.push(entity);
	});

	it("adds outpost to the store", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();

		const all = getAllOutposts();
		expect(all.size).toBe(1);
		expect(all.has(id!)).toBe(true);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("enforces minimum spacing constraint", () => {
		const id1 = createOutpost("player", { x: 0, z: 0 });
		expect(id1).not.toBeNull();

		// Place second outpost within minimum spacing (15 units)
		const id2 = createOutpost("player", { x: 5, z: 5 });
		expect(id2).toBeNull(); // should be rejected

		expect(getAllOutposts().size).toBe(1);

		const entity = world.entities.find((e) => e.id === id1);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("allows outposts beyond minimum spacing", () => {
		const id1 = createOutpost("player", { x: 0, z: 0 });
		expect(id1).not.toBeNull();

		// Place second outpost beyond minimum spacing
		const id2 = createOutpost("player", { x: 50, z: 50 });
		expect(id2).not.toBeNull();

		expect(getAllOutposts().size).toBe(2);

		const e1 = world.entities.find((e) => e.id === id1);
		const e2 = world.entities.find((e) => e.id === id2);
		if (e1) entitiesToCleanup.push(e1);
		if (e2) entitiesToCleanup.push(e2);
	});

	it("allows custom tier on creation", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 3);
		expect(id).not.toBeNull();
		expect(getOutpostTier(id!)).toBe(3);

		// Territory radius should match tier 3
		const territories = getAllTerritories();
		expect(territories[0]?.radius).toBe(35);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});
});

// ---------------------------------------------------------------------------
// upgradeOutpost
// ---------------------------------------------------------------------------

describe("upgradeOutpost", () => {
	it("upgrades outpost to next tier", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 1);
		expect(id).not.toBeNull();

		const result = upgradeOutpost(id!);
		expect(result).toBe(true);
		expect(getOutpostTier(id!)).toBe(2);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("expands territory radius on upgrade", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 1);
		expect(id).not.toBeNull();

		upgradeOutpost(id!);

		const territories = getAllTerritories();
		// After upgrade to tier 2, radius should be 20
		const territory = territories.find(
			(t) => t.center.x === 0 && t.center.z === 0,
		);
		expect(territory?.radius).toBe(20);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("returns false at max tier", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 3);
		expect(id).not.toBeNull();

		const result = upgradeOutpost(id!);
		expect(result).toBe(false);
		expect(getOutpostTier(id!)).toBe(3); // unchanged

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("returns false for unknown outpost", () => {
		expect(upgradeOutpost("nonexistent")).toBe(false);
	});

	it("can upgrade from tier 1 to tier 3 sequentially", () => {
		const id = createOutpost("player", { x: 0, z: 0 }, 1);
		expect(id).not.toBeNull();

		expect(upgradeOutpost(id!)).toBe(true);
		expect(getOutpostTier(id!)).toBe(2);

		expect(upgradeOutpost(id!)).toBe(true);
		expect(getOutpostTier(id!)).toBe(3);

		// Third upgrade should fail (max tier)
		expect(upgradeOutpost(id!)).toBe(false);

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});
});

// ---------------------------------------------------------------------------
// destroyOutpost
// ---------------------------------------------------------------------------

describe("destroyOutpost", () => {
	it("removes the outpost from the store", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();
		expect(getAllOutposts().size).toBe(1);

		destroyOutpost(id!);
		expect(getAllOutposts().size).toBe(0);
	});

	it("removes the entity from the world", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();

		destroyOutpost(id!);

		const entity = world.entities.find((e) => e.id === id);
		expect(entity).toBeUndefined();
	});

	it("removes the associated territory", () => {
		const id = createOutpost("player", { x: 0, z: 0 });
		expect(id).not.toBeNull();
		expect(getAllTerritories().length).toBeGreaterThan(0);

		destroyOutpost(id!);
		// The territory that was at (0, 0) should be gone
		const remaining = getAllTerritories().filter(
			(t) => t.center.x === 0 && t.center.z === 0,
		);
		expect(remaining.length).toBe(0);
	});

	it("is a no-op for unknown outpost", () => {
		expect(() => destroyOutpost("nonexistent")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getOutpostTerritory
// ---------------------------------------------------------------------------

describe("getOutpostTerritory", () => {
	it("returns the territory for a valid outpost", () => {
		const id = createOutpost("player", { x: 10, z: 20 }, 1, 5);
		expect(id).not.toBeNull();

		const territories = getAllTerritories();
		const territory = getOutpostTerritory(id!, territories);
		expect(territory).toBeDefined();
		expect(territory?.center).toEqual({ x: 10, z: 20 });

		const entity = world.entities.find((e) => e.id === id);
		if (entity) entitiesToCleanup.push(entity);
	});

	it("returns undefined for unknown outpost", () => {
		const territory = getOutpostTerritory("nonexistent", []);
		expect(territory).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resetOutposts
// ---------------------------------------------------------------------------

describe("resetOutposts", () => {
	it("clears all outpost records", () => {
		createOutpost("player", { x: 0, z: 0 });
		createOutpost("player", { x: 50, z: 50 });
		expect(getAllOutposts().size).toBe(2);

		resetOutposts();
		expect(getAllOutposts().size).toBe(0);
	});
});
