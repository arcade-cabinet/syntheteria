/**
 * Tests for the exploration (fog-of-war reveal) system.
 *
 * Verifies that units reveal fog around their position,
 * that camera-equipped units produce detailed fog (2) while
 * others produce abstract fog (1), and that fog only upgrades
 * (never downgrades).
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import {
	createFragment,
	getFogAt,
	type MapFragment,
	resetFragments,
	setFogAt,
} from "../../ecs/terrain";
import { Fragment, Position, Unit, UnitComponents } from "../../ecs/traits";
import { serializeComponents, type UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import { explorationSystem } from "../exploration";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const entities: Entity[] = [];

function spawnExplorer(
	x: number,
	z: number,
	components: UnitComponent[],
	fragment: MapFragment,
): Entity {
	const e = world.spawn(
		Position({ x, y: 0, z }),
		Fragment({ fragmentId: fragment.id }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Explorer",
			speed: 3,
			selected: false,
		}),
		UnitComponents({ componentsJson: serializeComponents(components) }),
	);
	entities.push(e);
	return e;
}

const CAMERA: UnitComponent = {
	name: "camera",
	functional: true,
	material: "electronic",
};
const BROKEN_CAMERA: UnitComponent = {
	name: "camera",
	functional: false,
	material: "electronic",
};
const LEGS: UnitComponent = {
	name: "legs",
	functional: true,
	material: "metal",
};

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
	resetFragments();
});

// ---------------------------------------------------------------------------
// Fog reveal types
// ---------------------------------------------------------------------------

describe("fog reveal types", () => {
	it("unit with functional camera reveals detailed fog (2)", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [CAMERA, LEGS], frag);

		explorationSystem();

		expect(getFogAt(frag, 0, 0)).toBe(2);
	});

	it("unit without camera reveals abstract fog (1)", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [LEGS], frag);

		explorationSystem();

		expect(getFogAt(frag, 0, 0)).toBe(1);
	});

	it("unit with broken camera reveals abstract fog (1)", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [BROKEN_CAMERA, LEGS], frag);

		explorationSystem();

		expect(getFogAt(frag, 0, 0)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Vision radius
// ---------------------------------------------------------------------------

describe("vision radius", () => {
	it("reveals fog within vision radius (6 units)", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [CAMERA], frag);

		explorationSystem();

		// At distance 5 (within radius 6) — should be revealed
		expect(getFogAt(frag, 5, 0)).toBe(2);
		expect(getFogAt(frag, 0, 5)).toBe(2);
		expect(getFogAt(frag, -5, 0)).toBe(2);
	});

	it("does not reveal fog beyond vision radius", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [CAMERA], frag);

		explorationSystem();

		// At distance 7 (beyond radius 6) — should remain unexplored
		expect(getFogAt(frag, 7, 0)).toBe(0);
		expect(getFogAt(frag, 0, 7)).toBe(0);
	});

	it("reveals in a circle, not a square", () => {
		const frag = createFragment();
		spawnExplorer(0, 0, [CAMERA], frag);

		explorationSystem();

		// Corner at (5,5) has distance ~7.07 — beyond radius 6
		expect(getFogAt(frag, 5, 5)).toBe(0);
		// Corner at (4,4) has distance ~5.66 — within radius 6
		expect(getFogAt(frag, 4, 4)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Fog upgrade semantics
// ---------------------------------------------------------------------------

describe("fog upgrade semantics", () => {
	it("detailed fog (2) is not downgraded by abstract reveal (1)", () => {
		const frag = createFragment();

		// Pre-set fog to detailed
		setFogAt(frag, 0, 0, 2);
		expect(getFogAt(frag, 0, 0)).toBe(2);

		// Unit without camera reveals abstract (1)
		spawnExplorer(0, 0, [LEGS], frag);
		explorationSystem();

		// Should remain detailed — fog never downgrades
		expect(getFogAt(frag, 0, 0)).toBe(2);
	});

	it("abstract fog (1) is upgraded to detailed (2) by camera unit", () => {
		const frag = createFragment();

		// Pre-set fog to abstract
		setFogAt(frag, 0, 0, 1);

		// Camera unit upgrades to detailed
		spawnExplorer(0, 0, [CAMERA], frag);
		explorationSystem();

		expect(getFogAt(frag, 0, 0)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Fragment isolation
// ---------------------------------------------------------------------------

describe("fragment isolation", () => {
	it("units only reveal fog on their own fragment", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		// Unit belongs to fragA, positioned at (0,0)
		spawnExplorer(0, 0, [CAMERA], fragA);

		explorationSystem();

		// fragA should have fog revealed
		expect(getFogAt(fragA, 0, 0)).toBe(2);
		// fragB should remain unexplored
		expect(getFogAt(fragB, 0, 0)).toBe(0);
	});

	it("multiple units on different fragments each reveal their own fog", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		spawnExplorer(10, 10, [CAMERA], fragA);
		spawnExplorer(-10, -10, [LEGS], fragB);

		explorationSystem();

		expect(getFogAt(fragA, 10, 10)).toBe(2);
		expect(getFogAt(fragB, -10, -10)).toBe(1);
		// Cross-fragment positions remain unexplored
		expect(getFogAt(fragA, -10, -10)).toBe(0);
		expect(getFogAt(fragB, 10, 10)).toBe(0);
	});
});
