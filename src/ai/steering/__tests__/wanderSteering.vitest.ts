import { beforeEach, describe, expect, it } from "vitest";
import {
	computeWanderDirection,
	pickWanderTile,
	resetWanderState,
} from "../wanderSteering";

beforeEach(() => {
	resetWanderState();
});

describe("computeWanderDirection", () => {
	it("returns a normalized direction vector", () => {
		const dir = computeWanderDirection(1, 5, 5, 1, 0, 100);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1, 1);
	});

	it("produces different directions for different seeds", () => {
		const d1 = computeWanderDirection(1, 5, 5, 1, 0, 100);
		resetWanderState();
		const d2 = computeWanderDirection(1, 5, 5, 1, 0, 200);
		// Very unlikely to be identical with different seeds
		const same =
			Math.abs(d1.dx - d2.dx) < 0.001 && Math.abs(d1.dz - d2.dz) < 0.001;
		expect(same).toBe(false);
	});

	it("produces different directions for different unit IDs", () => {
		const d1 = computeWanderDirection(1, 5, 5, 0, 0, 100);
		const d2 = computeWanderDirection(2, 5, 5, 0, 0, 100);
		const same =
			Math.abs(d1.dx - d2.dx) < 0.001 && Math.abs(d1.dz - d2.dz) < 0.001;
		expect(same).toBe(false);
	});

	it("works with zero heading", () => {
		const dir = computeWanderDirection(1, 5, 5, 0, 0, 42);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1, 1);
	});

	it("evolves over successive calls (jitter accumulates)", () => {
		const d1 = computeWanderDirection(1, 5, 5, 1, 0, 100);
		const d2 = computeWanderDirection(1, 5, 5, 1, 0, 200);
		// Second call jitters the persistent target — direction should shift
		const same =
			Math.abs(d1.dx - d2.dx) < 0.001 && Math.abs(d1.dz - d2.dz) < 0.001;
		expect(same).toBe(false);
	});
});

describe("pickWanderTile", () => {
	const candidates = [
		{ x: 4, z: 5 }, // left
		{ x: 6, z: 5 }, // right
		{ x: 5, z: 4 }, // up
		{ x: 5, z: 6 }, // down
	];

	it("returns null for empty candidates", () => {
		const result = pickWanderTile(
			1,
			{ x: 5, z: 5 },
			0,
			0,
			[],
			{ x: 5, z: 5 },
			4,
			100,
		);
		expect(result).toBeNull();
	});

	it("returns the single candidate when only one exists", () => {
		const result = pickWanderTile(
			1,
			{ x: 5, z: 5 },
			0,
			0,
			[{ x: 6, z: 5 }],
			{ x: 5, z: 5 },
			4,
			100,
		);
		expect(result).toEqual({ x: 6, z: 5 });
	});

	it("picks a valid candidate tile", () => {
		const result = pickWanderTile(
			1,
			{ x: 5, z: 5 },
			1,
			0,
			candidates,
			{ x: 5, z: 5 },
			4,
			100,
		);
		expect(result).not.toBeNull();
		expect(candidates).toContainEqual(result);
	});

	it("biases toward patrol center when near edge of patrol radius", () => {
		// Unit is far from center — should bias back
		const farCandidates = [
			{ x: 9, z: 5 }, // further from center
			{ x: 7, z: 5 }, // closer to center
		];
		const result = pickWanderTile(
			1,
			{ x: 8, z: 5 },
			1,
			0,
			farCandidates,
			{ x: 3, z: 5 },
			4,
			100,
		);
		// When at distance 5 from center (radius 4), strong bias toward center
		expect(result).toEqual({ x: 7, z: 5 });
	});

	it("produces varied movement over many turns", () => {
		const positions = new Set<string>();
		// Vary heading directions across iterations to test full wander diversity
		const headings = [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1],
			[1, 1],
			[-1, 1],
			[1, -1],
			[-1, -1],
		];
		for (let turn = 0; turn < 20; turn++) {
			resetWanderState();
			const [hx, hz] = headings[turn % headings.length];
			const result = pickWanderTile(
				turn,
				{ x: 5, z: 5 },
				hx,
				hz,
				candidates,
				{ x: 5, z: 5 },
				10,
				turn * 31,
			);
			if (result) positions.add(`${result.x},${result.z}`);
		}
		// Varied headings + unit IDs → varied tile picks
		expect(positions.size).toBeGreaterThanOrEqual(2);
	});
});
