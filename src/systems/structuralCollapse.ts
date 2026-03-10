/**
 * Structural collapse system for cube walls.
 *
 * In Syntheteria, walls are built by stacking physical 0.5m cubes.
 * Different materials have different HP values. When support cubes
 * are destroyed (HP reaches 0), unsupported cubes above cascade-collapse.
 * This creates dynamic destruction during raids — knock out the
 * foundation and the wall topples.
 *
 * All state is module-level Maps with a reset() function for test isolation.
 * Self-contained: no ECS, no config imports, no framework dependencies.
 *
 * Grid convention: positions are snapped to 0.5m increments.
 * A block at y=0 is on the ground. Support is checked at y - 0.5.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Grid cell size in world units. */
const GRID_STEP = 0.5;

/**
 * Material HP lookup. Unknown materials default to DEFAULT_HP.
 */
const MATERIAL_HP: Record<string, number> = {
	scrap_iron: 30,
	iron: 60,
	copper: 40,
	e_waste: 15,
	fiber_optics: 10,
	rare_alloy: 100,
};

const DEFAULT_HP = 30;

/**
 * Structural integrity decay per 0.5m layer above ground.
 * Ground blocks (y=0) have integrity 1.0. Each GRID_STEP up reduces by 0.1.
 */
const INTEGRITY_DECAY_PER_LAYER = 0.1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockData {
	blockId: string;
	position: Position;
	materialType: string;
	hp: number;
	maxHp: number;
}

export interface Position {
	x: number;
	y: number;
	z: number;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Primary block storage keyed by blockId. */
const blocks = new Map<string, BlockData>();

/** Spatial index keyed by grid position string "x,y,z". */
const positionIndex = new Map<string, string>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Snap a single axis value to the nearest GRID_STEP multiple. */
function snap(v: number): number {
	return Math.round(v / GRID_STEP) * GRID_STEP;
}

/** Round to avoid floating-point drift (e.g. 0.1+0.2 != 0.3). */
function round(v: number): number {
	return Math.round(v * 1e6) / 1e6;
}

/** Create a canonical grid key string from a position. */
function posKey(pos: Position): string {
	return `${round(snap(pos.x))},${round(snap(pos.y))},${round(snap(pos.z))}`;
}

/** Snap a position to the grid. */
function snapPosition(pos: Position): Position {
	return {
		x: round(snap(pos.x)),
		y: round(snap(pos.y)),
		z: round(snap(pos.z)),
	};
}

/** Get the max HP for a material type. */
function maxHpForMaterial(materialType: string): number {
	return MATERIAL_HP[materialType] ?? DEFAULT_HP;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a placed cube as a structural block.
 *
 * The position is snapped to the 0.5m grid. HP is initialized based
 * on the material type. If a block with the same ID already exists,
 * it is overwritten.
 */
export function registerBlock(
	blockId: string,
	position: Position,
	materialType: string,
): void {
	const snapped = snapPosition(position);
	const maxHp = maxHpForMaterial(materialType);

	const data: BlockData = {
		blockId,
		position: snapped,
		materialType,
		hp: maxHp,
		maxHp,
	};

	blocks.set(blockId, data);
	positionIndex.set(posKey(snapped), blockId);
}

/**
 * Remove a block by ID, triggering collapse on any blocks that
 * lose support as a result.
 *
 * @returns Array of block IDs that collapsed (does NOT include the
 *          removed block itself). Collapsed blocks are removed from state.
 */
export function removeBlock(blockId: string): string[] {
	const block = blocks.get(blockId);
	if (!block) return [];

	// Remove from both indexes
	positionIndex.delete(posKey(block.position));
	blocks.delete(blockId);

	// Find and remove all blocks that lost support
	const collapsed = findCollapsingBlocks();
	for (const id of collapsed) {
		const b = blocks.get(id);
		if (b) {
			positionIndex.delete(posKey(b.position));
			blocks.delete(id);
		}
	}

	return collapsed;
}

/**
 * Find the block at a grid position (snapped to 0.5m grid).
 *
 * @returns The BlockData, or undefined if no block at that position.
 */
export function getBlockAt(position: Position): BlockData | undefined {
	const key = posKey(position);
	const blockId = positionIndex.get(key);
	if (blockId === undefined) return undefined;
	return blocks.get(blockId);
}

/**
 * Get blocks directly above this block (at y + GRID_STEP, same x/z).
 *
 * A block "directly above" shares the same x and z, with y exactly
 * one grid step higher. This returns at most one block (since only
 * one block can occupy a grid cell), but returns an array for
 * consistency with multi-support scenarios.
 */
export function getBlocksAbove(blockId: string): BlockData[] {
	const block = blocks.get(blockId);
	if (!block) return [];

	const abovePos: Position = {
		x: block.position.x,
		y: round(block.position.y + GRID_STEP),
		z: block.position.z,
	};

	const above = getBlockAt(abovePos);
	return above ? [above] : [];
}

/**
 * Check whether a block has structural support.
 *
 * A block is supported if:
 * - It is on the ground (y === 0), OR
 * - There is a block directly below it (y - GRID_STEP, same x/z)
 */
export function checkStability(blockId: string): boolean {
	const block = blocks.get(blockId);
	if (!block) return false;

	// Ground level = stable
	if (block.position.y <= 0) return true;

	// Check for support below
	const belowPos: Position = {
		x: block.position.x,
		y: round(block.position.y - GRID_STEP),
		z: block.position.z,
	};

	return getBlockAt(belowPos) !== undefined;
}

/**
 * Simulate what would collapse if the given block were removed.
 *
 * Does NOT actually remove anything — purely a preview. Snapshots
 * the full state, runs the collapse detection, then restores.
 *
 * @returns Array of block IDs that would collapse (excludes the
 *          removed block itself).
 */
export function simulateCollapse(removedBlockId: string): string[] {
	const block = blocks.get(removedBlockId);
	if (!block) return [];

	// Snapshot full state (findCollapsingBlocks is destructive)
	const blocksCopy = new Map<string, BlockData>();
	for (const [id, b] of blocks) {
		blocksCopy.set(id, { ...b, position: { ...b.position } });
	}
	const posIndexCopy = new Map(positionIndex);

	// Temporarily remove the target block
	const key = posKey(block.position);
	positionIndex.delete(key);
	blocks.delete(removedBlockId);

	// Run collapse detection (mutates blocks/positionIndex)
	const collapsed = findCollapsingBlocks();

	// Restore full state from snapshot
	blocks.clear();
	for (const [id, b] of blocksCopy) {
		blocks.set(id, b);
	}
	positionIndex.clear();
	for (const [k, v] of posIndexCopy) {
		positionIndex.set(k, v);
	}

	return collapsed;
}

/**
 * Apply damage to a block. If HP drops to 0 or below, the block is
 * destroyed and collapse is triggered on blocks above.
 *
 * @returns Object with `destroyed` flag, `remainingHp`, and `collapsed`
 *          array of block IDs that fell as a result of destruction.
 */
export function applyDamageToBlock(
	blockId: string,
	damage: number,
): { destroyed: boolean; remainingHp: number; collapsed: string[] } {
	const block = blocks.get(blockId);
	if (!block) {
		return { destroyed: false, remainingHp: 0, collapsed: [] };
	}

	block.hp = Math.max(0, block.hp - damage);

	if (block.hp <= 0) {
		const collapsed = removeBlock(blockId);
		return { destroyed: true, remainingHp: 0, collapsed };
	}

	return { destroyed: false, remainingHp: block.hp, collapsed: [] };
}

/**
 * Get the current HP of a block.
 *
 * @returns Current HP, or -1 if the block does not exist.
 */
export function getBlockHP(blockId: string): number {
	const block = blocks.get(blockId);
	return block ? block.hp : -1;
}

/**
 * Flood-fill to find all blocks connected to this block.
 *
 * Two blocks are "connected" if they are face-adjacent (sharing a
 * face on the 0.5m grid — i.e. differ by exactly GRID_STEP on one
 * axis and are equal on the other two).
 *
 * @returns Array of block IDs in the connected structure (includes
 *          the starting block).
 */
export function getConnectedStructure(blockId: string): string[] {
	const start = blocks.get(blockId);
	if (!start) return [];

	const visited = new Set<string>();
	const queue: string[] = [blockId];
	visited.add(blockId);

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const current = blocks.get(currentId)!;

		// Check all 6 face-adjacent positions
		const neighbors = getFaceAdjacentPositions(current.position);
		for (const nPos of neighbors) {
			const nId = positionIndex.get(posKey(nPos));
			if (nId !== undefined && !visited.has(nId)) {
				visited.add(nId);
				queue.push(nId);
			}
		}
	}

	return Array.from(visited);
}

/**
 * Compute structural integrity of a block (0.0 to 1.0).
 *
 * Ground-level blocks (y=0) have integrity 1.0. Each layer of
 * GRID_STEP above ground reduces integrity by 0.1. Minimum is 0.0.
 *
 * A block with no support below (floating) has integrity 0.0.
 */
export function getStructuralIntegrity(blockId: string): number {
	const block = blocks.get(blockId);
	if (!block) return 0;

	// Unsupported blocks have zero integrity
	if (!checkStability(blockId)) return 0;

	// Layers above ground: y / GRID_STEP
	const layersAboveGround = Math.round(block.position.y / GRID_STEP);
	const integrity = Math.max(0, 1.0 - layersAboveGround * INTEGRITY_DECAY_PER_LAYER);
	return Math.round(integrity * 100) / 100; // avoid float drift
}

/**
 * Preview what would fall if this block were removed, without
 * modifying any state. Alias for simulateCollapse.
 */
export function getCollapseChain(blockId: string): string[] {
	return simulateCollapse(blockId);
}

/**
 * Clear all structural collapse state. Call in test beforeEach
 * for isolation.
 */
export function reset(): void {
	blocks.clear();
	positionIndex.clear();
}

// ---------------------------------------------------------------------------
// Internal: collapse detection
// ---------------------------------------------------------------------------

/**
 * Find all blocks that currently lack support (upward cascade).
 *
 * A block is unsupported if it is NOT at ground level AND has no
 * block directly below it. Collapse cascades: if block A supports
 * block B, and A collapses, then B also collapses.
 *
 * Uses iterative passes to handle multi-layer cascades.
 */
function findCollapsingBlocks(): string[] {
	const collapsed: string[] = [];

	// Iterate until no more blocks collapse (handles cascades)
	let changed = true;
	while (changed) {
		changed = false;
		for (const [id, block] of blocks) {
			if (block.position.y <= 0) continue; // ground = safe

			const belowPos: Position = {
				x: block.position.x,
				y: round(block.position.y - GRID_STEP),
				z: block.position.z,
			};

			if (getBlockAt(belowPos) === undefined) {
				// No support — this block collapses
				collapsed.push(id);
				positionIndex.delete(posKey(block.position));
				blocks.delete(id);
				changed = true;
			}
		}
	}

	return collapsed;
}

/**
 * Get the 6 face-adjacent grid positions for flood-fill.
 */
function getFaceAdjacentPositions(pos: Position): Position[] {
	return [
		{ x: round(pos.x + GRID_STEP), y: pos.y, z: pos.z },
		{ x: round(pos.x - GRID_STEP), y: pos.y, z: pos.z },
		{ x: pos.x, y: round(pos.y + GRID_STEP), z: pos.z },
		{ x: pos.x, y: round(pos.y - GRID_STEP), z: pos.z },
		{ x: pos.x, y: pos.y, z: round(pos.z + GRID_STEP) },
		{ x: pos.x, y: pos.y, z: round(pos.z - GRID_STEP) },
	];
}
