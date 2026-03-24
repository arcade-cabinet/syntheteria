/**
 * Unit tests for ECS type helpers — serialization, component queries.
 */

import { describe, expect, it } from "vitest";
import type { UnitComponent } from "../types";
import {
	getBrokenComponents,
	getFunctionalComponents,
	hasArms,
	hasCamera,
	hasFunctionalComponent,
	parseComponents,
	parsePath,
	serializeComponents,
	serializePath,
} from "../types";

describe("component serialization", () => {
	const sampleComponents: UnitComponent[] = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: false, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
	];

	it("round-trips through serialize/parse", () => {
		const json = serializeComponents(sampleComponents);
		const parsed = parseComponents(json);
		expect(parsed).toEqual(sampleComponents);
	});

	it("handles empty array", () => {
		const json = serializeComponents([]);
		expect(parseComponents(json)).toEqual([]);
	});
});

describe("path serialization", () => {
	it("round-trips Vec3 array", () => {
		const path = [
			{ x: 0, y: 1, z: 2 },
			{ x: 3, y: 4, z: 5 },
		];
		const json = serializePath(path);
		expect(parsePath(json)).toEqual(path);
	});

	it("handles empty path", () => {
		expect(parsePath("[]")).toEqual([]);
	});
});

describe("component queries", () => {
	const components: UnitComponent[] = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: false, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	];

	it("hasCamera returns true when camera is functional", () => {
		expect(hasCamera(components)).toBe(true);
	});

	it("hasCamera returns false when camera is broken", () => {
		const broken = components.map((c) =>
			c.name === "camera" ? { ...c, functional: false } : c,
		);
		expect(hasCamera(broken)).toBe(false);
	});

	it("hasArms returns false when arms are broken", () => {
		expect(hasArms(components)).toBe(false);
	});

	it("hasFunctionalComponent finds by name", () => {
		expect(hasFunctionalComponent(components, "legs")).toBe(true);
		expect(hasFunctionalComponent(components, "arms")).toBe(false);
		expect(hasFunctionalComponent(components, "nonexistent")).toBe(false);
	});

	it("getBrokenComponents returns only broken parts", () => {
		const broken = getBrokenComponents(components);
		expect(broken).toHaveLength(1);
		expect(broken[0].name).toBe("arms");
	});

	it("getFunctionalComponents returns only working parts", () => {
		const working = getFunctionalComponents(components);
		expect(working).toHaveLength(3);
		expect(working.map((c) => c.name)).toEqual([
			"camera",
			"legs",
			"power_cell",
		]);
	});

	it("handles empty component list", () => {
		expect(getBrokenComponents([])).toEqual([]);
		expect(getFunctionalComponents([])).toEqual([]);
		expect(hasCamera([])).toBe(false);
		expect(hasArms([])).toBe(false);
	});
});
