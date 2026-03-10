import { afterEach, describe, expect, it } from "vitest";
import {
	addCubeToBelt,
	getBelt,
	getBeltContents,
	registerBelt,
	removeCubeFromBelt,
	resetBelts,
	setOnCubeDelivered,
	setOnCubeEjected,
	updateBeltTransport,
} from "../beltTransport";
import {
	connectBelts,
	connectBeltToMachine,
	resetRouting,
} from "../beltRouting";

afterEach(() => {
	resetBelts();
	resetRouting();
	setOnCubeDelivered(null);
	setOnCubeEjected(null);
});

// ---------------------------------------------------------------------------
// Cube moves along belt over time
// ---------------------------------------------------------------------------

describe("cube movement", () => {
	it("advances a cube along the belt each update", () => {
		registerBelt("b1", 4); // 4m belt
		expect(addCubeToBelt("c1", "b1")).toBe(true);

		// Belt speed is 2 m/s (from config). After 0.5s the cube should be at
		// progress = (2 * 0.5) / 4 = 0.25
		updateBeltTransport(0.5);

		const contents = getBeltContents("b1");
		expect(contents).toHaveLength(1);
		expect(contents[0].cubeId).toBe("c1");
		expect(contents[0].progress).toBeCloseTo(0.25, 5);
	});

	it("cube reaches the output end and is ejected (no connection)", () => {
		registerBelt("b1", 2); // 2m belt
		addCubeToBelt("c1", "b1");

		const ejectedCubes: string[] = [];
		setOnCubeEjected((cubeId) => ejectedCubes.push(cubeId));

		// Belt speed 2 m/s, belt length 2m => 1 second to traverse
		updateBeltTransport(1.0);

		// Cube should have been ejected
		expect(getBeltContents("b1")).toHaveLength(0);
		expect(ejectedCubes).toContain("c1");
	});

	it("cube is set to kinematic while on belt", () => {
		registerBelt("b1", 4);
		addCubeToBelt("c1", "b1");

		const belt = getBelt("b1");
		expect(belt?.cubes[0].bodyType).toBe("kinematic");
	});
});

// ---------------------------------------------------------------------------
// Belt capacity enforced
// ---------------------------------------------------------------------------

describe("belt capacity", () => {
	it("rejects cubes beyond capacity", () => {
		// Belt of length 1.2m with spacing 0.6m => max 2 cubes
		registerBelt("b1", 1.2);
		expect(addCubeToBelt("c1", "b1")).toBe(true);

		// Move c1 forward so there's room at input
		updateBeltTransport(0.5); // progress ~ 0.83

		expect(addCubeToBelt("c2", "b1")).toBe(true);

		// Third cube should be rejected (belt is at max capacity of 2)
		expect(addCubeToBelt("c3", "b1")).toBe(false);
	});

	it("rejects cube when input end is blocked by spacing", () => {
		registerBelt("b1", 6); // max 10 cubes, plenty of room
		addCubeToBelt("c1", "b1");
		// c1 is at progress 0 => world pos 0, so next cube can't fit
		// (needs >= 0.6m from input)
		expect(addCubeToBelt("c2", "b1")).toBe(false);
	});

	it("duplicate cube on same belt is rejected", () => {
		registerBelt("b1", 6);
		addCubeToBelt("c1", "b1");
		expect(addCubeToBelt("c1", "b1")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Manual removal
// ---------------------------------------------------------------------------

describe("manual removal", () => {
	it("removes a cube from the belt", () => {
		registerBelt("b1", 4);
		addCubeToBelt("c1", "b1");
		updateBeltTransport(0.1);

		expect(removeCubeFromBelt("c1")).toBe(true);
		expect(getBeltContents("b1")).toHaveLength(0);
	});

	it("returns false for a cube not on any belt", () => {
		expect(removeCubeFromBelt("nonexistent")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Connected belts auto-transfer
// ---------------------------------------------------------------------------

describe("connected belts", () => {
	it("auto-transfers a cube from belt A output to belt B input", () => {
		registerBelt("a", 2);
		registerBelt("b", 10); // long belt so cube doesn't traverse it the same frame
		connectBelts("a", "b");

		addCubeToBelt("c1", "a");

		// Move cube to end of belt A (belt speed 2, length 2 => 1s)
		updateBeltTransport(1.0);

		// Cube should have left belt A and be on belt B
		const contentsA = getBeltContents("a");
		const contentsB = getBeltContents("b");

		expect(contentsA).toHaveLength(0);
		expect(contentsB).toHaveLength(1);
		expect(contentsB[0].cubeId).toBe("c1");
		// Cube enters B at progress 0, then B is also processed this frame,
		// so it advances by (2*1.0)/10 = 0.2
		expect(contentsB[0].progress).toBeCloseTo(0.2, 5);
	});

	it("cube stays at output if connected belt is full", () => {
		registerBelt("a", 2);
		registerBelt("b", 0.6); // capacity = 1
		connectBelts("a", "b");

		addCubeToBelt("existing", "b");
		addCubeToBelt("c1", "a");

		// Move c1 to end of belt A
		updateBeltTransport(1.0);

		// c1 should still be on belt A at progress 1 (waiting)
		const contentsA = getBeltContents("a");
		expect(contentsA).toHaveLength(1);
		expect(contentsA[0].cubeId).toBe("c1");
		expect(contentsA[0].progress).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Machine delivery callback
// ---------------------------------------------------------------------------

describe("machine delivery", () => {
	it("calls onCubeDelivered when belt outputs to a machine", () => {
		registerBelt("b1", 2);
		connectBeltToMachine("b1", "machine1", "input");

		const deliveries: { cubeId: string; targetId: string; port: string }[] =
			[];
		setOnCubeDelivered((cubeId, connection) => {
			deliveries.push({
				cubeId,
				targetId: connection.targetId,
				port: connection.port ?? "",
			});
		});

		addCubeToBelt("c1", "b1");
		updateBeltTransport(1.0);

		expect(getBeltContents("b1")).toHaveLength(0);
		expect(deliveries).toHaveLength(1);
		expect(deliveries[0]).toEqual({
			cubeId: "c1",
			targetId: "machine1",
			port: "input",
		});
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("adding cube to non-existent belt returns false", () => {
		expect(addCubeToBelt("c1", "nonexistent")).toBe(false);
	});

	it("getBeltContents for non-existent belt returns empty array", () => {
		expect(getBeltContents("nonexistent")).toEqual([]);
	});

	it("multiple cubes maintain spacing on the belt", () => {
		registerBelt("b1", 6); // max 10 cubes
		addCubeToBelt("c1", "b1");

		// Move c1 forward enough to make room
		updateBeltTransport(0.5); // c1 at progress ~0.167 (1m / 6m)

		addCubeToBelt("c2", "b1");
		updateBeltTransport(0.1);

		const contents = getBeltContents("b1");
		expect(contents).toHaveLength(2);

		// Both cubes should have at least CUBE_SPACING / beltLength apart
		const gap = contents[1].progress - contents[0].progress;
		expect(gap).toBeGreaterThanOrEqual(0.6 / 6 - 0.001);
	});
});
