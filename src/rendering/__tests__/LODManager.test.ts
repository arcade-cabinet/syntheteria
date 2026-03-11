/**
 * Tests for LODManager pure utilities and LODManager class.
 */

import {
	classifyLOD,
	distanceSqXZ,
	classifyBatch,
	countByLevel,
	filterVisible,
	updateFrequency,
	shouldUpdate,
	LODManager,
	type LODConfig,
	type LODLevel,
} from "../LODManager";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: LODConfig = {
	highMediumSq: 400,   // 20m
	mediumLowSq: 6400,   // 80m
	lowCulledSq: 40000,  // 200m
};

// ---------------------------------------------------------------------------
// classifyLOD
// ---------------------------------------------------------------------------

describe("classifyLOD", () => {
	it("returns 'high' for distance 0 (at camera)", () => {
		expect(classifyLOD(0, DEFAULT_CONFIG)).toBe("high");
	});

	it("returns 'high' for distance just under 20m", () => {
		expect(classifyLOD(19 * 19, DEFAULT_CONFIG)).toBe("high");
	});

	it("returns 'high' for distance exactly at highMediumSq boundary minus 1", () => {
		expect(classifyLOD(399, DEFAULT_CONFIG)).toBe("high");
	});

	it("returns 'medium' at exactly highMediumSq", () => {
		expect(classifyLOD(400, DEFAULT_CONFIG)).toBe("medium");
	});

	it("returns 'medium' for distance between 20m and 80m", () => {
		expect(classifyLOD(50 * 50, DEFAULT_CONFIG)).toBe("medium");
	});

	it("returns 'low' at exactly mediumLowSq", () => {
		expect(classifyLOD(6400, DEFAULT_CONFIG)).toBe("low");
	});

	it("returns 'low' for distance between 80m and 200m", () => {
		expect(classifyLOD(100 * 100, DEFAULT_CONFIG)).toBe("low");
	});

	it("returns 'culled' at exactly lowCulledSq", () => {
		expect(classifyLOD(40000, DEFAULT_CONFIG)).toBe("culled");
	});

	it("returns 'culled' for distance > 200m", () => {
		expect(classifyLOD(300 * 300, DEFAULT_CONFIG)).toBe("culled");
	});

	it("uses default config when none provided", () => {
		const result = classifyLOD(0);
		expect(result).toBe("high");
	});
});

// ---------------------------------------------------------------------------
// distanceSqXZ
// ---------------------------------------------------------------------------

describe("distanceSqXZ", () => {
	it("returns 0 for same position", () => {
		expect(distanceSqXZ(5, 3, 5, 3)).toBe(0);
	});

	it("computes correct squared distance", () => {
		// 3-4-5 right triangle: 3² + 4² = 25
		expect(distanceSqXZ(0, 0, 3, 4)).toBe(25);
	});

	it("is symmetric", () => {
		expect(distanceSqXZ(1, 2, 5, 8)).toBe(distanceSqXZ(5, 8, 1, 2));
	});

	it("ignores Y component (not passed)", () => {
		// Same XZ, different Y would be caller's responsibility
		expect(distanceSqXZ(0, 0, 10, 0)).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// classifyBatch
// ---------------------------------------------------------------------------

describe("classifyBatch", () => {
	it("returns empty array for empty input", () => {
		const result = classifyBatch([], 0, 0);
		expect(result).toHaveLength(0);
	});

	it("classifies single near object as high", () => {
		const result = classifyBatch([{ id: "a", x: 5, z: 0 }], 0, 0);
		expect(result[0]?.level).toBe("high");
		expect(result[0]?.id).toBe("a");
	});

	it("classifies distant object correctly", () => {
		const result = classifyBatch([{ id: "far", x: 300, z: 0 }], 0, 0);
		expect(result[0]?.level).toBe("culled");
	});

	it("returns correct distanceSq", () => {
		const result = classifyBatch([{ id: "obj", x: 10, z: 0 }], 0, 0);
		expect(result[0]?.distanceSq).toBe(100);
	});

	it("reuses provided output array", () => {
		const out = [{ id: "", level: "high" as LODLevel, distanceSq: 0 }];
		const result = classifyBatch([{ id: "x", x: 0, z: 0 }], 0, 0, DEFAULT_CONFIG, out);
		expect(result).toBe(out); // same reference
	});

	it("handles multiple objects", () => {
		const objs = [
			{ id: "near", x: 5, z: 0 },
			{ id: "mid", x: 50, z: 0 },
			{ id: "far", x: 250, z: 0 },
		];
		const result = classifyBatch(objs, 0, 0);
		expect(result[0]?.level).toBe("high");
		expect(result[1]?.level).toBe("medium");
		expect(result[2]?.level).toBe("culled");
	});
});

// ---------------------------------------------------------------------------
// countByLevel
// ---------------------------------------------------------------------------

describe("countByLevel", () => {
	it("returns zeros for empty array", () => {
		const counts = countByLevel([]);
		expect(counts.high).toBe(0);
		expect(counts.medium).toBe(0);
		expect(counts.low).toBe(0);
		expect(counts.culled).toBe(0);
	});

	it("counts each level correctly", () => {
		const entries = [
			{ id: "a", level: "high" as LODLevel, distanceSq: 0 },
			{ id: "b", level: "high" as LODLevel, distanceSq: 10 },
			{ id: "c", level: "medium" as LODLevel, distanceSq: 500 },
			{ id: "d", level: "culled" as LODLevel, distanceSq: 50000 },
		];
		const counts = countByLevel(entries);
		expect(counts.high).toBe(2);
		expect(counts.medium).toBe(1);
		expect(counts.low).toBe(0);
		expect(counts.culled).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// filterVisible
// ---------------------------------------------------------------------------

describe("filterVisible", () => {
	it("removes culled entries", () => {
		const entries = [
			{ id: "a", level: "high" as LODLevel, distanceSq: 0 },
			{ id: "b", level: "culled" as LODLevel, distanceSq: 50000 },
			{ id: "c", level: "medium" as LODLevel, distanceSq: 500 },
		];
		const visible = filterVisible(entries);
		expect(visible).toHaveLength(2);
		expect(visible.every((e) => e.level !== "culled")).toBe(true);
	});

	it("returns all entries when none are culled", () => {
		const entries = [
			{ id: "a", level: "high" as LODLevel, distanceSq: 0 },
			{ id: "b", level: "low" as LODLevel, distanceSq: 10000 },
		];
		expect(filterVisible(entries)).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// updateFrequency
// ---------------------------------------------------------------------------

describe("updateFrequency", () => {
	it("high objects update every frame (frequency 1)", () => {
		expect(updateFrequency("high")).toBe(1);
	});

	it("medium objects update every 2 frames", () => {
		expect(updateFrequency("medium")).toBe(2);
	});

	it("low objects update every 4 frames", () => {
		expect(updateFrequency("low")).toBe(4);
	});

	it("culled objects never update (Infinity)", () => {
		expect(updateFrequency("culled")).toBe(Infinity);
	});
});

// ---------------------------------------------------------------------------
// shouldUpdate
// ---------------------------------------------------------------------------

describe("shouldUpdate", () => {
	it("high level always updates", () => {
		for (let frame = 0; frame < 10; frame++) {
			expect(shouldUpdate("high", frame, 0)).toBe(true);
		}
	});

	it("culled level never updates", () => {
		for (let frame = 0; frame < 10; frame++) {
			expect(shouldUpdate("culled", frame, 0)).toBe(false);
		}
	});

	it("medium level updates every 2 frames", () => {
		// (frame + objectIndex) % 2 === 0
		expect(shouldUpdate("medium", 0, 0)).toBe(true);  // (0+0)%2=0
		expect(shouldUpdate("medium", 1, 0)).toBe(false); // (1+0)%2=1
		expect(shouldUpdate("medium", 2, 0)).toBe(true);  // (2+0)%2=0
	});

	it("staggering: different objects update on different frames", () => {
		// At frame 0: object 0 updates, object 1 doesn't
		expect(shouldUpdate("medium", 0, 0)).toBe(true);
		expect(shouldUpdate("medium", 0, 1)).toBe(false);
		// At frame 1: object 0 doesn't, object 1 does
		expect(shouldUpdate("medium", 1, 0)).toBe(false);
		expect(shouldUpdate("medium", 1, 1)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// LODManager class
// ---------------------------------------------------------------------------

describe("LODManager", () => {
	it("starts with no levels", () => {
		const mgr = new LODManager();
		expect(mgr.getLevel("any")).toBe("culled");
	});

	it("after update, correctly classifies near object as high", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "bot1", x: 5, z: 0 }], 0, 0);
		expect(mgr.getLevel("bot1")).toBe("high");
	});

	it("after update, classifies distant object as culled", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "bot_far", x: 300, z: 0 }], 0, 0);
		expect(mgr.getLevel("bot_far")).toBe("culled");
	});

	it("unknown entity returns culled", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "known", x: 5, z: 0 }], 0, 0);
		expect(mgr.getLevel("unknown_entity")).toBe("culled");
	});

	it("remove() removes entity from cache", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "x", x: 5, z: 0 }], 0, 0);
		expect(mgr.getLevel("x")).toBe("high");
		mgr.remove("x");
		expect(mgr.getLevel("x")).toBe("culled");
	});

	it("clear() resets all levels", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "a", x: 5, z: 0 }, { id: "b", x: 10, z: 0 }], 0, 0);
		mgr.clear();
		expect(mgr.getLevel("a")).toBe("culled");
		expect(mgr.getLevel("b")).toBe("culled");
	});

	it("getStats() returns counts matching classified objects", () => {
		const mgr = new LODManager();
		mgr.update([
			{ id: "near", x: 5, z: 0 },
			{ id: "far", x: 300, z: 0 },
		], 0, 0);
		const stats = mgr.getStats();
		expect(stats.high).toBe(1);
		expect(stats.culled).toBe(1);
	});

	it("shouldUpdate returns false for culled entities", () => {
		const mgr = new LODManager();
		mgr.update([{ id: "far", x: 300, z: 0 }], 0, 0);
		expect(mgr.shouldUpdate("far", 0)).toBe(false);
	});

	it("accepts custom LOD config", () => {
		const mgr = new LODManager({ highMediumSq: 100 }); // 10m boundary
		mgr.update([{ id: "obj", x: 15, z: 0 }], 0, 0); // 15m away → medium
		expect(mgr.getLevel("obj")).toBe("medium");
	});
});
