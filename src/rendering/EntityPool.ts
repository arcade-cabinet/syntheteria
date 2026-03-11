/**
 * EntityPool — generic fixed-size object pool with zero per-allocation cost.
 *
 * Maintains a pre-allocated array of objects. Free objects are tracked via
 * a free-list stack. Allocation is O(1); deallocation is O(1). Useful for:
 *
 *   - MaterialCube rigid bodies (spawn/despawn from compression events)
 *   - Projectile objects (turret fire, unit attacks)
 *   - Particle systems (harvest, damage, compression VFX)
 *   - Temporary marker entities
 *
 * Design principles:
 *   - Pool capacity is fixed at creation — no dynamic resize
 *   - Objects are reset via a caller-provided reset() function
 *   - Active/inactive state tracked per slot
 *   - Pure utility functions exported for tests
 *
 * Usage:
 *   const pool = new EntityPool(100, () => ({ x: 0, y: 0, alive: false }));
 *   const obj = pool.acquire();   // O(1), null if exhausted
 *   pool.release(obj);            // O(1), marks slot free
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PoolSlot<T> {
	/** The pooled object. */
	object: T;
	/** Whether this slot is currently in use. */
	active: boolean;
	/** Stable index within the pool (0-indexed). */
	readonly index: number;
}

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Build the initial free-list stack for a pool of size `capacity`.
 * Returns an array of indices [capacity-1, ..., 1, 0] (stack, pop gives 0 first).
 */
export function buildFreeList(capacity: number): number[] {
	const list = new Array<number>(capacity);
	for (let i = 0; i < capacity; i++) {
		list[i] = capacity - 1 - i;
	}
	return list;
}

/**
 * Calculate pool utilization as a fraction (0–1).
 * @param activeCount - Number of currently active slots
 * @param capacity - Total pool capacity
 */
export function poolUtilization(activeCount: number, capacity: number): number {
	if (capacity === 0) return 0;
	return Math.min(1, activeCount / capacity);
}

/**
 * Determine whether a pool is saturated (no free slots remaining).
 */
export function isPoolSaturated(freeCount: number): boolean {
	return freeCount === 0;
}

// ---------------------------------------------------------------------------
// EntityPool class
// ---------------------------------------------------------------------------

/**
 * Generic fixed-size object pool.
 *
 * @template T The type of pooled object.
 */
export class EntityPool<T> {
	private readonly slots: PoolSlot<T>[];
	private readonly freeList: number[];
	private _activeCount = 0;
	private readonly _capacity: number;

	/**
	 * @param capacity - Maximum number of objects in the pool
	 * @param factory - Function that creates a new (inactive) object instance
	 * @param reset - Function called when an object is released back to the pool
	 */
	constructor(
		capacity: number,
		factory: (index: number) => T,
		private readonly reset: (object: T) => void,
	) {
		this._capacity = capacity;
		this.slots = new Array(capacity);
		this.freeList = buildFreeList(capacity);

		for (let i = 0; i < capacity; i++) {
			this.slots[i] = {
				object: factory(i),
				active: false,
				index: i,
			};
		}
	}

	/**
	 * Acquire a free object from the pool.
	 * Returns null if the pool is exhausted.
	 */
	acquire(): PoolSlot<T> | null {
		if (this.freeList.length === 0) return null;
		const idx = this.freeList.pop()!;
		const slot = this.slots[idx];
		slot.active = true;
		this._activeCount++;
		return slot;
	}

	/**
	 * Release an object back to the pool.
	 * Calls the reset function and marks the slot inactive.
	 * No-op if the slot is already inactive.
	 */
	release(slot: PoolSlot<T>): void {
		if (!slot.active) return;
		slot.active = false;
		this.reset(slot.object);
		this.freeList.push(slot.index);
		this._activeCount--;
	}

	/**
	 * Release an object by its pool index.
	 * No-op if the index is out of bounds or the slot is already inactive.
	 */
	releaseByIndex(index: number): void {
		if (index < 0 || index >= this._capacity) return;
		const slot = this.slots[index];
		if (slot) this.release(slot);
	}

	/**
	 * Call a function on every active slot.
	 * Prefer this over manual iteration when processing active objects.
	 */
	forEachActive(fn: (slot: PoolSlot<T>) => void): void {
		for (const slot of this.slots) {
			if (slot.active) fn(slot);
		}
	}

	/**
	 * Call a function on every slot regardless of active state.
	 */
	forEachSlot(fn: (slot: PoolSlot<T>) => void): void {
		for (const slot of this.slots) {
			fn(slot);
		}
	}

	/**
	 * Release all active objects at once (bulk reset).
	 * Useful for scene teardown.
	 */
	releaseAll(): void {
		for (const slot of this.slots) {
			if (slot.active) this.release(slot);
		}
	}

	/** Number of currently active (in-use) objects. */
	get activeCount(): number {
		return this._activeCount;
	}

	/** Number of free (available) slots. */
	get freeCount(): number {
		return this.freeList.length;
	}

	/** Maximum pool capacity. */
	get capacity(): number {
		return this._capacity;
	}

	/** Fraction of pool capacity in use (0–1). */
	get utilization(): number {
		return poolUtilization(this._activeCount, this._capacity);
	}

	/** Whether the pool has no free slots. */
	get isSaturated(): boolean {
		return isPoolSaturated(this.freeList.length);
	}
}
