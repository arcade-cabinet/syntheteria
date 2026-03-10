/**
 * Unit tests for BotContext utility functions.
 *
 * Tests cover:
 * - distanceSqXZ: squared XZ-plane distance calculation
 * - summarizeComponents: component health summarization
 */

import { distanceSqXZ, summarizeComponents } from "../BotContext.ts";

// ---------------------------------------------------------------------------
// distanceSqXZ
// ---------------------------------------------------------------------------

describe("distanceSqXZ", () => {
	it("returns 0 for identical positions", () => {
		const a = { x: 5, y: 10, z: 3 };
		expect(distanceSqXZ(a, a)).toBe(0);
	});

	it("computes squared distance on the XZ plane", () => {
		const a = { x: 0, y: 0, z: 0 };
		const b = { x: 3, y: 0, z: 4 };
		expect(distanceSqXZ(a, b)).toBe(25); // 3^2 + 4^2
	});

	it("ignores Y coordinate difference", () => {
		const a = { x: 0, y: 0, z: 0 };
		const b = { x: 3, y: 100, z: 4 };
		expect(distanceSqXZ(a, b)).toBe(25);
	});

	it("handles negative coordinates", () => {
		const a = { x: -5, y: 0, z: -10 };
		const b = { x: 5, y: 0, z: 10 };
		// dx=10, dz=20 => 100 + 400 = 500
		expect(distanceSqXZ(a, b)).toBe(500);
	});

	it("is symmetric", () => {
		const a = { x: 1, y: 2, z: 3 };
		const b = { x: 7, y: 8, z: 9 };
		expect(distanceSqXZ(a, b)).toBe(distanceSqXZ(b, a));
	});

	it("handles zero X difference (purely Z distance)", () => {
		const a = { x: 0, y: 0, z: 0 };
		const b = { x: 0, y: 0, z: 5 };
		expect(distanceSqXZ(a, b)).toBe(25);
	});

	it("handles zero Z difference (purely X distance)", () => {
		const a = { x: 0, y: 0, z: 0 };
		const b = { x: 7, y: 0, z: 0 };
		expect(distanceSqXZ(a, b)).toBe(49);
	});

	it("handles fractional coordinates", () => {
		const a = { x: 0.5, y: 0, z: 0.5 };
		const b = { x: 1.5, y: 0, z: 1.5 };
		// dx=1, dz=1 => 1 + 1 = 2
		expect(distanceSqXZ(a, b)).toBeCloseTo(2);
	});
});

// ---------------------------------------------------------------------------
// summarizeComponents
// ---------------------------------------------------------------------------

describe("summarizeComponents", () => {
	it("returns zero values for empty component list", () => {
		const result = summarizeComponents([]);
		expect(result).toEqual({
			total: 0,
			functional: 0,
			healthRatio: 0,
			hasArms: false,
			hasCamera: false,
			hasLegs: false,
		});
	});

	it("counts total and functional components correctly", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: false },
			{ name: "legs", functional: true },
		];

		const result = summarizeComponents(components);

		expect(result.total).toBe(3);
		expect(result.functional).toBe(2);
	});

	it("computes healthRatio as functional / total", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: false },
			{ name: "legs", functional: true },
			{ name: "sensor", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.healthRatio).toBeCloseTo(0.5);
	});

	it("returns healthRatio of 1.0 when all components are functional", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "legs", functional: true },
		];

		const result = summarizeComponents(components);
		expect(result.healthRatio).toBeCloseTo(1.0);
	});

	it("returns healthRatio of 0.0 when all components are broken", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "legs", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.healthRatio).toBeCloseTo(0.0);
	});

	it("detects functional arms", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "legs", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.hasArms).toBe(true);
	});

	it("detects broken arms as hasArms=false", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "legs", functional: true },
		];

		const result = summarizeComponents(components);
		expect(result.hasArms).toBe(false);
	});

	it("detects functional camera", () => {
		const components = [
			{ name: "camera", functional: true },
			{ name: "arms", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.hasCamera).toBe(true);
	});

	it("detects functional legs", () => {
		const components = [
			{ name: "legs", functional: true },
			{ name: "camera", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.hasLegs).toBe(true);
	});

	it("handles components with non-standard names", () => {
		const components = [
			{ name: "sensor", functional: true },
			{ name: "antenna", functional: true },
		];

		const result = summarizeComponents(components);
		expect(result.total).toBe(2);
		expect(result.functional).toBe(2);
		expect(result.hasArms).toBe(false);
		expect(result.hasCamera).toBe(false);
		expect(result.hasLegs).toBe(false);
	});

	it("handles multiple arms (only needs one functional)", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "arms", functional: true },
		];

		const result = summarizeComponents(components);
		expect(result.hasArms).toBe(true);
	});

	it("returns hasArms=false when all arms are broken", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "arms", functional: false },
		];

		const result = summarizeComponents(components);
		expect(result.hasArms).toBe(false);
	});
});
