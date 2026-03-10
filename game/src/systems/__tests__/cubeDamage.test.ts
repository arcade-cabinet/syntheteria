import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CUBE_MATERIALS,
	damageCube,
	getCubeHP,
	getWeakestCubeInArea,
	initCubeHP,
	registerCubePosition,
	repairCube,
	resetCubeHP,
	setOnCubeDestroyed,
} from "../cubeDamage.ts";

describe("cubeDamage", () => {
	beforeEach(() => {
		resetCubeHP();
	});

	// -----------------------------------------------------------------------
	// initCubeHP
	// -----------------------------------------------------------------------

	describe("initCubeHP", () => {
		it("returns the durability for a known material", () => {
			const hp = initCubeHP("cube-1", "iron");
			expect(hp).toBe(CUBE_MATERIALS.iron.durability); // 100
		});

		it("returns default 100 for unknown material", () => {
			const hp = initCubeHP("cube-2", "unobtanium");
			expect(hp).toBe(100);
		});

		it("sets current HP equal to max HP", () => {
			initCubeHP("cube-3", "steel");
			const info = getCubeHP("cube-3");
			expect(info).not.toBeNull();
			expect(info!.current).toBe(info!.max);
			expect(info!.percentage).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Material-specific HP values
	// -----------------------------------------------------------------------

	describe("material-specific HP values", () => {
		it("scrap has 50 HP", () => {
			expect(initCubeHP("c", "scrap")).toBe(50);
		});

		it("iron has 100 HP", () => {
			expect(initCubeHP("c", "iron")).toBe(100);
		});

		it("steel has 200 HP", () => {
			expect(initCubeHP("c", "steel")).toBe(200);
		});

		it("titanium has 350 HP", () => {
			expect(initCubeHP("c", "titanium")).toBe(350);
		});

		it("concrete has 150 HP", () => {
			expect(initCubeHP("c", "concrete")).toBe(150);
		});

		it("composite has 250 HP", () => {
			expect(initCubeHP("c", "composite")).toBe(250);
		});
	});

	// -----------------------------------------------------------------------
	// damageCube
	// -----------------------------------------------------------------------

	describe("damageCube", () => {
		it("reduces HP correctly", () => {
			initCubeHP("cube-d1", "iron"); // 100 HP
			const result = damageCube("cube-d1", 30);
			expect(result.destroyed).toBe(false);
			expect(result.remainingHP).toBe(70);
		});

		it("does not go below 0", () => {
			initCubeHP("cube-d2", "scrap"); // 50 HP
			const result = damageCube("cube-d2", 999);
			expect(result.destroyed).toBe(true);
			expect(result.remainingHP).toBe(0);
		});

		it("destroys at exactly 0 HP", () => {
			initCubeHP("cube-d3", "scrap"); // 50 HP
			const result = damageCube("cube-d3", 50);
			expect(result.destroyed).toBe(true);
			expect(result.remainingHP).toBe(0);
		});

		it("removes HP entry after destruction", () => {
			initCubeHP("cube-d4", "scrap");
			damageCube("cube-d4", 50);
			expect(getCubeHP("cube-d4")).toBeNull();
		});

		it("returns destroyed=false with 0 remainingHP for untracked cube", () => {
			const result = damageCube("nonexistent", 10);
			expect(result.destroyed).toBe(false);
			expect(result.remainingHP).toBe(0);
		});

		it("fires onCubeDestroyed callback on destruction", () => {
			const cb = vi.fn();
			setOnCubeDestroyed(cb);
			initCubeHP("cube-cb", "scrap");
			damageCube("cube-cb", 50);
			expect(cb).toHaveBeenCalledWith("cube-cb");
		});

		it("does not fire callback when cube survives", () => {
			const cb = vi.fn();
			setOnCubeDestroyed(cb);
			initCubeHP("cube-cb2", "iron");
			damageCube("cube-cb2", 10);
			expect(cb).not.toHaveBeenCalled();
		});

		it("supports multiple sequential damages", () => {
			initCubeHP("cube-seq", "iron"); // 100
			damageCube("cube-seq", 20); // 80
			damageCube("cube-seq", 30); // 50
			const info = getCubeHP("cube-seq");
			expect(info!.current).toBe(50);
			expect(info!.max).toBe(100);
			expect(info!.percentage).toBeCloseTo(0.5);
		});
	});

	// -----------------------------------------------------------------------
	// repairCube
	// -----------------------------------------------------------------------

	describe("repairCube", () => {
		it("increases HP", () => {
			initCubeHP("cube-r1", "iron"); // 100
			damageCube("cube-r1", 40); // 60
			const result = repairCube("cube-r1", 20);
			expect(result).toBe(80);
		});

		it("caps at max HP", () => {
			initCubeHP("cube-r2", "iron"); // 100
			damageCube("cube-r2", 10); // 90
			const result = repairCube("cube-r2", 50);
			expect(result).toBe(100);
		});

		it("returns 0 for untracked cube", () => {
			const result = repairCube("nonexistent", 50);
			expect(result).toBe(0);
		});

		it("does nothing when already at full HP", () => {
			initCubeHP("cube-r3", "iron"); // 100
			const result = repairCube("cube-r3", 50);
			expect(result).toBe(100);
		});
	});

	// -----------------------------------------------------------------------
	// getCubeHP
	// -----------------------------------------------------------------------

	describe("getCubeHP", () => {
		it("returns null for untracked cube", () => {
			expect(getCubeHP("nope")).toBeNull();
		});

		it("returns correct percentage", () => {
			initCubeHP("cube-p", "steel"); // 200
			damageCube("cube-p", 50); // 150
			const info = getCubeHP("cube-p");
			expect(info!.percentage).toBeCloseTo(0.75);
		});
	});

	// -----------------------------------------------------------------------
	// getWeakestCubeInArea
	// -----------------------------------------------------------------------

	describe("getWeakestCubeInArea", () => {
		it("returns the lowest-HP cube within radius", () => {
			initCubeHP("wall-a", "iron"); // 100
			registerCubePosition("wall-a", { x: 0, y: 0, z: 0 });

			initCubeHP("wall-b", "iron"); // 100
			registerCubePosition("wall-b", { x: 1, y: 0, z: 0 });
			damageCube("wall-b", 60); // 40

			initCubeHP("wall-c", "iron"); // 100
			registerCubePosition("wall-c", { x: 2, y: 0, z: 0 });
			damageCube("wall-c", 20); // 80

			const weakest = getWeakestCubeInArea({ x: 1, y: 0, z: 0 }, 5);
			expect(weakest).toBe("wall-b");
		});

		it("ignores cubes outside radius", () => {
			initCubeHP("near", "scrap"); // 50
			registerCubePosition("near", { x: 0, y: 0, z: 0 });

			initCubeHP("far", "scrap"); // 50
			registerCubePosition("far", { x: 100, y: 0, z: 0 });
			damageCube("far", 40); // 10 HP but far away

			const weakest = getWeakestCubeInArea({ x: 0, y: 0, z: 0 }, 5);
			expect(weakest).toBe("near"); // "far" is out of range
		});

		it("returns null when no cubes are in range", () => {
			initCubeHP("distant", "iron");
			registerCubePosition("distant", { x: 100, y: 100, z: 100 });

			const result = getWeakestCubeInArea({ x: 0, y: 0, z: 0 }, 5);
			expect(result).toBeNull();
		});

		it("returns null when store is empty", () => {
			const result = getWeakestCubeInArea({ x: 0, y: 0, z: 0 }, 10);
			expect(result).toBeNull();
		});

		it("picks among equal-HP cubes deterministically", () => {
			initCubeHP("eq-a", "iron"); // 100
			registerCubePosition("eq-a", { x: 0, y: 0, z: 0 });

			initCubeHP("eq-b", "iron"); // 100
			registerCubePosition("eq-b", { x: 1, y: 0, z: 0 });

			// Both have the same HP — first one encountered wins (Map iteration order)
			const result = getWeakestCubeInArea({ x: 0, y: 0, z: 0 }, 10);
			expect(result).toBe("eq-a");
		});
	});

	// -----------------------------------------------------------------------
	// resetCubeHP
	// -----------------------------------------------------------------------

	describe("resetCubeHP", () => {
		it("clears all tracked cubes", () => {
			initCubeHP("a", "iron");
			initCubeHP("b", "steel");
			resetCubeHP();
			expect(getCubeHP("a")).toBeNull();
			expect(getCubeHP("b")).toBeNull();
		});
	});
});
