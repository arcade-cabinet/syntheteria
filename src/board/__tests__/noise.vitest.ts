import { describe, expect, it } from "vitest";
import { createNoise2D, seededRng, simplexNoise2D } from "../noise";

describe("seededRng", () => {
	it("same seed always produces the same sequence", () => {
		const rng1 = seededRng("hello");
		const rng2 = seededRng("hello");

		for (let i = 0; i < 20; i++) {
			expect(rng1()).toBe(rng2());
		}
	});

	it("different seeds produce different sequences", () => {
		const rng1 = seededRng("seed-alpha");
		const rng2 = seededRng("seed-beta");

		const values1 = Array.from({ length: 20 }, () => rng1());
		const values2 = Array.from({ length: 20 }, () => rng2());

		// At least one value must differ
		const anyDifference = values1.some((v, i) => v !== values2[i]);
		expect(anyDifference).toBe(true);
	});

	it("output values are in [0, 1)", () => {
		const rng = seededRng("range-check");
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

describe("createNoise2D", () => {
	it("output is in [0, 1] for integer coordinates", () => {
		const noise = createNoise2D(seededRng("integer-coords"));
		for (let x = 0; x < 10; x++) {
			for (let z = 0; z < 10; z++) {
				const v = noise(x, z);
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	});

	it("output is in [0, 1] for fractional coordinates", () => {
		const noise = createNoise2D(seededRng("fractional-coords"));
		const coords = [0.3, 1.7, 2.5, 4.99, 7.01];
		for (const x of coords) {
			for (const z of coords) {
				const v = noise(x, z);
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	});

	it("same rng produces the same noise function (deterministic)", () => {
		// Two rngs with the same seed advance in lock-step — both produce the same
		// seedOffset on the first call, so the resulting noise functions are identical.
		const noise1 = createNoise2D(seededRng("determinism-test"));
		const noise2 = createNoise2D(seededRng("determinism-test"));

		const coords = [
			[0, 0],
			[1, 2],
			[3.5, 4.25],
			[10, 10],
		];
		for (const [x, z] of coords) {
			expect(noise1(x, z)).toBe(noise2(x, z));
		}
	});

	it("different rng seeds produce different noise values at the same coords", () => {
		const noise1 = createNoise2D(seededRng("seed-one"));
		const noise2 = createNoise2D(seededRng("seed-two"));

		const coords = [
			[0, 0],
			[1, 1],
			[2, 3],
			[5, 7],
		];
		const anyDifference = coords.some(
			([x, z]) => noise1(x, z) !== noise2(x, z),
		);
		expect(anyDifference).toBe(true);
	});
});

describe("simplexNoise2D", () => {
	it("output is in [0, 1]", () => {
		const coords = [
			[0, 0],
			[1, 1],
			[3.5, 2.7],
			[10, 10],
			[0.1, 0.9],
		];
		for (const [x, z] of coords) {
			// Each call creates a fresh rng to avoid rng-state coupling between samples
			const v = simplexNoise2D(x, z, seededRng("range-simplex"));
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
	});

	it("is deterministic with the same seed", () => {
		// Because simplexNoise2D calls createNoise2D(rng)(x, z), two rngs seeded
		// identically will produce the same seedOffset and therefore the same output.
		const v1 = simplexNoise2D(3, 7, seededRng("simplex-det"));
		const v2 = simplexNoise2D(3, 7, seededRng("simplex-det"));
		expect(v1).toBe(v2);
	});
});
