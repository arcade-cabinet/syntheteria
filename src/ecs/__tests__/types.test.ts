/**
 * Unit tests for types.ts — component helper functions.
 */

import type { UnitComponent, UnitEntity } from "../types";
import {
	hasCamera,
	hasArms,
	hasFunctionalComponent,
	getBrokenComponents,
	getFunctionalComponents,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponents(...specs: [string, boolean, "metal" | "plastic" | "electronic"][]): UnitComponent[] {
	return specs.map(([name, functional, material]) => ({ name, functional, material }));
}

function makeUnitEntity(components: UnitComponent[]): UnitEntity {
	return {
		id: "test_unit",
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		mapFragment: { fragmentId: "frag_0" },
		unit: {
			type: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
			components,
		},
	} as UnitEntity;
}

// ---------------------------------------------------------------------------
// hasCamera
// ---------------------------------------------------------------------------

describe("hasCamera", () => {
	it("returns true when entity has a functional camera component", () => {
		const entity = makeUnitEntity(
			makeComponents(["camera", true, "electronic"], ["arms", true, "metal"])
		);
		expect(hasCamera(entity)).toBe(true);
	});

	it("returns false when camera is broken", () => {
		const entity = makeUnitEntity(
			makeComponents(["camera", false, "electronic"])
		);
		expect(hasCamera(entity)).toBe(false);
	});

	it("returns false when entity has no camera component", () => {
		const entity = makeUnitEntity(
			makeComponents(["arms", true, "metal"], ["legs", true, "metal"])
		);
		expect(hasCamera(entity)).toBe(false);
	});

	it("returns false when components array is empty", () => {
		const entity = makeUnitEntity([]);
		expect(hasCamera(entity)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// hasArms
// ---------------------------------------------------------------------------

describe("hasArms", () => {
	it("returns true when entity has functional arms", () => {
		const entity = makeUnitEntity(
			makeComponents(["arms", true, "metal"])
		);
		expect(hasArms(entity)).toBe(true);
	});

	it("returns false when arms are broken", () => {
		const entity = makeUnitEntity(
			makeComponents(["arms", false, "metal"])
		);
		expect(hasArms(entity)).toBe(false);
	});

	it("returns false when entity has no arms", () => {
		const entity = makeUnitEntity(
			makeComponents(["camera", true, "electronic"])
		);
		expect(hasArms(entity)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// hasFunctionalComponent
// ---------------------------------------------------------------------------

describe("hasFunctionalComponent", () => {
	const components = makeComponents(
		["camera", true, "electronic"],
		["arms", false, "metal"],
		["motor", true, "electronic"]
	);

	it("returns true for a component that is functional", () => {
		expect(hasFunctionalComponent(components, "camera")).toBe(true);
		expect(hasFunctionalComponent(components, "motor")).toBe(true);
	});

	it("returns false for a component that is broken", () => {
		expect(hasFunctionalComponent(components, "arms")).toBe(false);
	});

	it("returns false for a component that doesn't exist", () => {
		expect(hasFunctionalComponent(components, "reactor")).toBe(false);
	});

	it("returns false for an empty components array", () => {
		expect(hasFunctionalComponent([], "camera")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getBrokenComponents
// ---------------------------------------------------------------------------

describe("getBrokenComponents", () => {
	it("returns only broken components", () => {
		const components = makeComponents(
			["camera", true, "electronic"],
			["arms", false, "metal"],
			["motor", false, "electronic"],
			["legs", true, "metal"]
		);
		const broken = getBrokenComponents(components);
		expect(broken).toHaveLength(2);
		expect(broken[0].name).toBe("arms");
		expect(broken[1].name).toBe("motor");
	});

	it("returns empty array when all components are functional", () => {
		const components = makeComponents(
			["camera", true, "electronic"],
			["arms", true, "metal"]
		);
		expect(getBrokenComponents(components)).toHaveLength(0);
	});

	it("returns all components when all are broken", () => {
		const components = makeComponents(
			["camera", false, "electronic"],
			["arms", false, "metal"]
		);
		expect(getBrokenComponents(components)).toHaveLength(2);
	});

	it("returns empty array for empty input", () => {
		expect(getBrokenComponents([])).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getFunctionalComponents
// ---------------------------------------------------------------------------

describe("getFunctionalComponents", () => {
	it("returns only functional components", () => {
		const components = makeComponents(
			["camera", true, "electronic"],
			["arms", false, "metal"],
			["motor", true, "electronic"]
		);
		const functional = getFunctionalComponents(components);
		expect(functional).toHaveLength(2);
		expect(functional[0].name).toBe("camera");
		expect(functional[1].name).toBe("motor");
	});

	it("returns empty array when all components are broken", () => {
		const components = makeComponents(
			["camera", false, "electronic"],
			["arms", false, "metal"]
		);
		expect(getFunctionalComponents(components)).toHaveLength(0);
	});

	it("returns all components when all are functional", () => {
		const components = makeComponents(
			["camera", true, "electronic"],
			["arms", true, "metal"]
		);
		expect(getFunctionalComponents(components)).toHaveLength(2);
	});

	it("returns empty array for empty input", () => {
		expect(getFunctionalComponents([])).toHaveLength(0);
	});
});
