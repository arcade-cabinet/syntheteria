import {
	createStorage,
	removeStorage,
	depositCube,
	withdrawCube,
	withdrawByMaterial,
	getStorageContents,
	getStorageCapacity,
	getStoragesByFaction,
	isHiddenFromPerception,
	getRetrievalTime,
	damageStorage,
	getSpilledCubes,
	getTotalHiddenValue,
	reset,
} from "../undergroundStorage.ts";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("undergroundStorage", () => {
	beforeEach(() => {
		reset();
	});

	// -----------------------------------------------------------------------
	// createStorage / removeStorage
	// -----------------------------------------------------------------------

	describe("createStorage", () => {
		it("returns a unique storage ID", () => {
			const id1 = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const id2 = createStorage({ x: 5, y: 0, z: 5 }, "player", 10, 1);
			expect(id1).not.toBe(id2);
		});

		it("creates storage with correct capacity", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 20, 2);
			const cap = getStorageCapacity(id);
			expect(cap.max).toBe(20);
			expect(cap.current).toBe(0);
		});

		it("clamps depth to 1–3 range", () => {
			const shallow = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 0);
			const deep = createStorage({ x: 5, y: 0, z: 0 }, "player", 10, 5);
			expect(getRetrievalTime(shallow)).toBe(0.5); // depth clamped to 1
			expect(getRetrievalTime(deep)).toBe(1.5); // depth clamped to 3
		});

		it("floors fractional capacity to integer", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 5.7, 1);
			const cap = getStorageCapacity(id);
			expect(cap.max).toBe(5);
		});

		it("enforces minimum capacity of 1", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 0, 1);
			const cap = getStorageCapacity(id);
			expect(cap.max).toBe(1);
		});
	});

	describe("removeStorage", () => {
		it("removes an existing storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			removeStorage(id);
			const cap = getStorageCapacity(id);
			expect(cap.max).toBe(0);
		});

		it("does nothing for nonexistent ID", () => {
			expect(() => removeStorage("nonexistent")).not.toThrow();
		});

		it("removes storage without spilling cubes", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			removeStorage(id);
			expect(getSpilledCubes(id)).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// depositCube
	// -----------------------------------------------------------------------

	describe("depositCube", () => {
		it("deposits a cube and increases current count", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const result = depositCube(id, "cube-1", "iron");
			expect(result).toBe(true);
			expect(getStorageCapacity(id).current).toBe(1);
		});

		it("returns false when storage is full", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 2, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			const result = depositCube(id, "cube-3", "iron");
			expect(result).toBe(false);
			expect(getStorageCapacity(id).current).toBe(2);
		});

		it("returns false for nonexistent storage", () => {
			const result = depositCube("nonexistent", "cube-1", "iron");
			expect(result).toBe(false);
		});

		it("returns false for destroyed storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			damageStorage(id, 100);
			const result = depositCube(id, "cube-1", "iron");
			expect(result).toBe(false);
		});

		it("stores cubes with correct material types", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			const contents = getStorageContents(id);
			expect(contents).toHaveLength(2);
			expect(contents[0].materialType).toBe("iron");
			expect(contents[1].materialType).toBe("copper");
		});
	});

	// -----------------------------------------------------------------------
	// withdrawCube (LIFO)
	// -----------------------------------------------------------------------

	describe("withdrawCube", () => {
		it("withdraws the most recently deposited cube (LIFO)", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			depositCube(id, "cube-3", "rare_alloy");

			const cube = withdrawCube(id);
			expect(cube).toEqual({ cubeId: "cube-3", materialType: "rare_alloy" });
			expect(getStorageCapacity(id).current).toBe(2);
		});

		it("returns null when storage is empty", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const cube = withdrawCube(id);
			expect(cube).toBeNull();
		});

		it("returns null for nonexistent storage", () => {
			expect(withdrawCube("nonexistent")).toBeNull();
		});

		it("returns null for destroyed storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			damageStorage(id, 100);
			expect(withdrawCube(id)).toBeNull();
		});

		it("allows withdrawing all cubes one by one", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");

			expect(withdrawCube(id)!.cubeId).toBe("cube-2");
			expect(withdrawCube(id)!.cubeId).toBe("cube-1");
			expect(withdrawCube(id)).toBeNull();
			expect(getStorageCapacity(id).current).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// withdrawByMaterial
	// -----------------------------------------------------------------------

	describe("withdrawByMaterial", () => {
		it("withdraws the most recent cube of a specific material", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			depositCube(id, "cube-3", "iron");

			const cube = withdrawByMaterial(id, "iron");
			expect(cube).toEqual({ cubeId: "cube-3", materialType: "iron" });
			expect(getStorageCapacity(id).current).toBe(2);
		});

		it("returns null when material type is not found", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			const cube = withdrawByMaterial(id, "rare_alloy");
			expect(cube).toBeNull();
			expect(getStorageCapacity(id).current).toBe(1);
		});

		it("returns null for nonexistent storage", () => {
			expect(withdrawByMaterial("nonexistent", "iron")).toBeNull();
		});

		it("returns null for destroyed storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			damageStorage(id, 100);
			expect(withdrawByMaterial(id, "iron")).toBeNull();
		});

		it("does not remove other cubes when withdrawing specific material", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			depositCube(id, "cube-3", "iron");

			withdrawByMaterial(id, "copper");
			const contents = getStorageContents(id);
			expect(contents).toHaveLength(2);
			expect(contents.every((c) => c.materialType === "iron")).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// getStorageContents
	// -----------------------------------------------------------------------

	describe("getStorageContents", () => {
		it("returns a copy of stored cubes", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			const contents = getStorageContents(id);
			contents.push({ cubeId: "fake", materialType: "fake", depositedAt: 0 });
			// Original storage should be unaffected
			expect(getStorageContents(id)).toHaveLength(1);
		});

		it("returns empty array for nonexistent storage", () => {
			expect(getStorageContents("nonexistent")).toEqual([]);
		});

		it("returns empty array for empty storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			expect(getStorageContents(id)).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getStorageCapacity
	// -----------------------------------------------------------------------

	describe("getStorageCapacity", () => {
		it("returns {0, 0} for nonexistent storage", () => {
			expect(getStorageCapacity("nonexistent")).toEqual({ current: 0, max: 0 });
		});

		it("tracks current count as cubes are deposited and withdrawn", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 5, 1);
			expect(getStorageCapacity(id)).toEqual({ current: 0, max: 5 });

			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "iron");
			expect(getStorageCapacity(id)).toEqual({ current: 2, max: 5 });

			withdrawCube(id);
			expect(getStorageCapacity(id)).toEqual({ current: 1, max: 5 });
		});
	});

	// -----------------------------------------------------------------------
	// getStoragesByFaction
	// -----------------------------------------------------------------------

	describe("getStoragesByFaction", () => {
		it("returns only storages for the given faction", () => {
			createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			createStorage({ x: 5, y: 0, z: 0 }, "player", 10, 2);
			createStorage({ x: 10, y: 0, z: 0 }, "enemy", 10, 1);

			const playerStorages = getStoragesByFaction("player");
			expect(playerStorages).toHaveLength(2);
			expect(playerStorages.every((s) => s.ownerFaction === "player")).toBe(true);
		});

		it("returns empty array for faction with no storages", () => {
			createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			expect(getStoragesByFaction("voltCollective")).toEqual([]);
		});

		it("returns deep copies (mutations do not affect internal state)", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			const storages = getStoragesByFaction("player");
			storages[0].cubes.push({ cubeId: "fake", materialType: "fake", depositedAt: 0 });
			expect(getStorageContents(id)).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// isHiddenFromPerception
	// -----------------------------------------------------------------------

	describe("isHiddenFromPerception", () => {
		it("returns true for intact storage within capacity", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			expect(isHiddenFromPerception(id)).toBe(true);
		});

		it("returns true for empty intact storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			expect(isHiddenFromPerception(id)).toBe(true);
		});

		it("returns false for destroyed storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			damageStorage(id, 100);
			expect(isHiddenFromPerception(id)).toBe(false);
		});

		it("returns false for nonexistent storage", () => {
			expect(isHiddenFromPerception("nonexistent")).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// getRetrievalTime
	// -----------------------------------------------------------------------

	describe("getRetrievalTime", () => {
		it("returns depth * 0.5 for depth 1", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			expect(getRetrievalTime(id)).toBe(0.5);
		});

		it("returns depth * 0.5 for depth 2", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 2);
			expect(getRetrievalTime(id)).toBe(1.0);
		});

		it("returns depth * 0.5 for depth 3", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 3);
			expect(getRetrievalTime(id)).toBe(1.5);
		});

		it("returns 0 for nonexistent storage", () => {
			expect(getRetrievalTime("nonexistent")).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// damageStorage
	// -----------------------------------------------------------------------

	describe("damageStorage", () => {
		it("reduces durability by damage amount", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const remaining = damageStorage(id, 30);
			expect(remaining).toBe(70);
		});

		it("destroys storage when durability reaches 0", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			const remaining = damageStorage(id, 100);
			expect(remaining).toBe(0);
			expect(isHiddenFromPerception(id)).toBe(false);
		});

		it("does not go below 0 durability", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const remaining = damageStorage(id, 999);
			expect(remaining).toBe(0);
		});

		it("spills all cubes when destroyed", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			depositCube(id, "cube-2", "copper");
			depositCube(id, "cube-3", "rare_alloy");

			damageStorage(id, 100);
			const spilled = getSpilledCubes(id);
			expect(spilled).toHaveLength(3);
			expect(spilled.map((c) => c.cubeId).sort()).toEqual(["cube-1", "cube-2", "cube-3"]);
		});

		it("empties the stored cubes array on destruction", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			damageStorage(id, 100);
			expect(getStorageContents(id)).toEqual([]);
		});

		it("returns 0 for nonexistent storage", () => {
			expect(damageStorage("nonexistent", 10)).toBe(0);
		});

		it("returns 0 for already-destroyed storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			damageStorage(id, 100);
			expect(damageStorage(id, 10)).toBe(0);
		});

		it("does not spill cubes on partial damage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			damageStorage(id, 50);
			expect(getSpilledCubes(id)).toEqual([]);
			expect(getStorageContents(id)).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// getSpilledCubes
	// -----------------------------------------------------------------------

	describe("getSpilledCubes", () => {
		it("returns empty array for intact storage", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			expect(getSpilledCubes(id)).toEqual([]);
		});

		it("returns empty array for nonexistent storage", () => {
			expect(getSpilledCubes("nonexistent")).toEqual([]);
		});

		it("returns empty array when destroyed storage had no cubes", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			damageStorage(id, 100);
			expect(getSpilledCubes(id)).toEqual([]);
		});

		it("returns a copy (mutations do not affect internal state)", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			damageStorage(id, 100);
			const spilled = getSpilledCubes(id);
			spilled.push({ cubeId: "fake", materialType: "fake", depositedAt: 0 });
			expect(getSpilledCubes(id)).toHaveLength(1);
		});
	});

	// -----------------------------------------------------------------------
	// getTotalHiddenValue
	// -----------------------------------------------------------------------

	describe("getTotalHiddenValue", () => {
		it("sums economic values for all hidden cubes in a faction", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron"); // 25
			depositCube(id, "cube-2", "copper"); // 15
			depositCube(id, "cube-3", "rare_alloy"); // 100
			expect(getTotalHiddenValue("player")).toBe(140);
		});

		it("returns 0 for faction with no storages", () => {
			expect(getTotalHiddenValue("nobody")).toBe(0);
		});

		it("excludes destroyed storages", () => {
			const id1 = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const id2 = createStorage({ x: 5, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id1, "cube-1", "iron"); // 25
			depositCube(id2, "cube-2", "rare_alloy"); // 100
			damageStorage(id1, 100); // destroy first storage
			expect(getTotalHiddenValue("player")).toBe(100);
		});

		it("excludes other factions", () => {
			const p = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const e = createStorage({ x: 5, y: 0, z: 0 }, "enemy", 10, 1);
			depositCube(p, "cube-1", "iron"); // 25
			depositCube(e, "cube-2", "rare_alloy"); // 100
			expect(getTotalHiddenValue("player")).toBe(25);
		});

		it("sums across multiple storages", () => {
			const id1 = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			const id2 = createStorage({ x: 5, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id1, "cube-1", "scrap_iron"); // 5
			depositCube(id2, "cube-2", "fiber_optics"); // 60
			expect(getTotalHiddenValue("player")).toBe(65);
		});

		it("returns 0 for unknown material types", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "unobtainium");
			expect(getTotalHiddenValue("player")).toBe(0);
		});

		it("correctly values each material type", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 20, 1);
			depositCube(id, "c1", "scrap_iron"); // 5
			depositCube(id, "c2", "iron"); // 25
			depositCube(id, "c3", "copper"); // 15
			depositCube(id, "c4", "e_waste"); // 10
			depositCube(id, "c5", "fiber_optics"); // 60
			depositCube(id, "c6", "rare_alloy"); // 100
			expect(getTotalHiddenValue("player")).toBe(215);
		});
	});

	// -----------------------------------------------------------------------
	// reset
	// -----------------------------------------------------------------------

	describe("reset", () => {
		it("clears all storages", () => {
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			depositCube(id, "cube-1", "iron");
			reset();
			expect(getStoragesByFaction("player")).toEqual([]);
			expect(getStorageCapacity(id)).toEqual({ current: 0, max: 0 });
		});

		it("resets ID counter so new IDs start fresh", () => {
			createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			reset();
			const id = createStorage({ x: 0, y: 0, z: 0 }, "player", 10, 1);
			expect(id).toBe("storage-1");
		});
	});
});
