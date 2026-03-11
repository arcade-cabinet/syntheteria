/**
 * Tests for EntityPool pure utilities and EntityPool class.
 */

import {
	buildFreeList,
	poolUtilization,
	isPoolSaturated,
	EntityPool,
} from "../EntityPool";

// ---------------------------------------------------------------------------
// buildFreeList
// ---------------------------------------------------------------------------

describe("buildFreeList", () => {
	it("creates a list of length capacity", () => {
		expect(buildFreeList(5)).toHaveLength(5);
	});

	it("contains all indices 0 to capacity-1", () => {
		const list = buildFreeList(5);
		const sorted = [...list].sort((a, b) => a - b);
		expect(sorted).toEqual([0, 1, 2, 3, 4]);
	});

	it("returns empty array for capacity 0", () => {
		expect(buildFreeList(0)).toHaveLength(0);
	});

	it("popping gives index 0 first (stack order)", () => {
		const list = buildFreeList(3);
		// List is [2, 1, 0] — pop gives 0
		expect(list.pop()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// poolUtilization
// ---------------------------------------------------------------------------

describe("poolUtilization", () => {
	it("returns 0 for empty pool", () => {
		expect(poolUtilization(0, 10)).toBe(0);
	});

	it("returns 1 when fully utilized", () => {
		expect(poolUtilization(10, 10)).toBe(1);
	});

	it("returns 0.5 at half capacity", () => {
		expect(poolUtilization(5, 10)).toBe(0.5);
	});

	it("clamps to 1 if activeCount exceeds capacity", () => {
		expect(poolUtilization(15, 10)).toBe(1);
	});

	it("returns 0 for zero capacity", () => {
		expect(poolUtilization(0, 0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isPoolSaturated
// ---------------------------------------------------------------------------

describe("isPoolSaturated", () => {
	it("returns true when freeCount is 0", () => {
		expect(isPoolSaturated(0)).toBe(true);
	});

	it("returns false when freeCount > 0", () => {
		expect(isPoolSaturated(1)).toBe(false);
		expect(isPoolSaturated(100)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// EntityPool class
// ---------------------------------------------------------------------------

interface Particle {
	x: number;
	y: number;
	alive: boolean;
}

function makeParticle(index: number): Particle {
	return { x: 0, y: 0, alive: false };
}

function resetParticle(p: Particle): void {
	p.x = 0;
	p.y = 0;
	p.alive = false;
}

describe("EntityPool", () => {
	it("starts with all slots free", () => {
		const pool = new EntityPool(10, makeParticle, resetParticle);
		expect(pool.freeCount).toBe(10);
		expect(pool.activeCount).toBe(0);
		expect(pool.capacity).toBe(10);
	});

	it("acquire() returns a slot", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		const slot = pool.acquire();
		expect(slot).not.toBeNull();
		expect(slot?.active).toBe(true);
	});

	it("acquire() decreases freeCount by 1", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		pool.acquire();
		expect(pool.freeCount).toBe(4);
		expect(pool.activeCount).toBe(1);
	});

	it("acquire() returns null when pool is exhausted", () => {
		const pool = new EntityPool(2, makeParticle, resetParticle);
		pool.acquire();
		pool.acquire();
		expect(pool.acquire()).toBeNull();
	});

	it("release() marks slot inactive", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		const slot = pool.acquire()!;
		pool.release(slot);
		expect(slot.active).toBe(false);
	});

	it("release() increases freeCount by 1", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		const slot = pool.acquire()!;
		expect(pool.freeCount).toBe(4);
		pool.release(slot);
		expect(pool.freeCount).toBe(5);
	});

	it("release() calls reset function", () => {
		const resetSpy = jest.fn();
		const pool = new EntityPool(5, makeParticle, resetSpy);
		const slot = pool.acquire()!;
		pool.release(slot);
		expect(resetSpy).toHaveBeenCalledWith(slot.object);
	});

	it("release() is no-op on inactive slot", () => {
		const resetSpy = jest.fn();
		const pool = new EntityPool(5, makeParticle, resetSpy);
		const slot = pool.acquire()!;
		pool.release(slot);
		pool.release(slot); // second release
		expect(resetSpy).toHaveBeenCalledTimes(1); // reset only once
	});

	it("released slot can be acquired again", () => {
		const pool = new EntityPool(1, makeParticle, resetParticle);
		const slot1 = pool.acquire()!;
		pool.release(slot1);
		const slot2 = pool.acquire();
		expect(slot2).not.toBeNull();
	});

	it("slots have stable indices", () => {
		const pool = new EntityPool(3, makeParticle, resetParticle);
		const slots = [pool.acquire()!, pool.acquire()!, pool.acquire()!];
		const indices = slots.map((s) => s.index);
		// All 3 indices should be distinct
		expect(new Set(indices).size).toBe(3);
		// All should be in [0, 2]
		for (const i of indices) {
			expect(i).toBeGreaterThanOrEqual(0);
			expect(i).toBeLessThanOrEqual(2);
		}
	});

	it("forEachActive() iterates only active slots", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		const s1 = pool.acquire()!;
		const s2 = pool.acquire()!;
		pool.release(s2);

		const seen: number[] = [];
		pool.forEachActive((slot) => seen.push(slot.index));
		expect(seen).toHaveLength(1);
		expect(seen[0]).toBe(s1.index);
	});

	it("forEachSlot() iterates all slots", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		pool.acquire();
		let count = 0;
		pool.forEachSlot(() => count++);
		expect(count).toBe(5);
	});

	it("releaseAll() frees all active slots", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		pool.acquire();
		pool.acquire();
		pool.acquire();
		pool.releaseAll();
		expect(pool.activeCount).toBe(0);
		expect(pool.freeCount).toBe(5);
	});

	it("utilization is 0 when empty", () => {
		const pool = new EntityPool(10, makeParticle, resetParticle);
		expect(pool.utilization).toBe(0);
	});

	it("utilization is 1 when full", () => {
		const pool = new EntityPool(3, makeParticle, resetParticle);
		pool.acquire();
		pool.acquire();
		pool.acquire();
		expect(pool.utilization).toBe(1);
	});

	it("isSaturated is true when pool is full", () => {
		const pool = new EntityPool(2, makeParticle, resetParticle);
		pool.acquire();
		pool.acquire();
		expect(pool.isSaturated).toBe(true);
	});

	it("isSaturated is false when slots remain", () => {
		const pool = new EntityPool(2, makeParticle, resetParticle);
		pool.acquire();
		expect(pool.isSaturated).toBe(false);
	});

	it("releaseByIndex() works correctly", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		const slot = pool.acquire()!;
		const idx = slot.index;
		pool.releaseByIndex(idx);
		expect(slot.active).toBe(false);
	});

	it("releaseByIndex() no-op for out-of-bounds index", () => {
		const pool = new EntityPool(5, makeParticle, resetParticle);
		expect(() => pool.releaseByIndex(-1)).not.toThrow();
		expect(() => pool.releaseByIndex(100)).not.toThrow();
	});

	it("zero-capacity pool always returns null on acquire", () => {
		const pool = new EntityPool(0, makeParticle, resetParticle);
		expect(pool.acquire()).toBeNull();
		expect(pool.isSaturated).toBe(true);
	});
});
