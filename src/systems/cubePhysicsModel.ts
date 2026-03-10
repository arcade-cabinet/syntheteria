/**
 * Cube physics model — pure logic for cube stacking, stability,
 * and toppling calculations.
 *
 * Cubes are 0.5m rigid bodies that can be stacked. Stacks have
 * stability based on their height, width, and support pattern.
 * Unstable stacks topple, scattering cubes.
 *
 * This is the data/logic layer — Rapier handles actual physics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubeData {
	id: string;
	materialType: string;
	position: { x: number; y: number; z: number };
	stackId?: string;
	stackLayer?: number; // 0 = ground, 1 = on top, etc.
}

export interface StackData {
	id: string;
	cubes: string[]; // cube IDs from bottom to top
	basePosition: { x: number; z: number };
	height: number; // number of layers
	stability: number; // 0-1
	toppled: boolean;
}

export interface ToppleResult {
	stackId: string;
	scatteredCubes: Array<{
		cubeId: string;
		newPosition: { x: number; y: number; z: number };
	}>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CUBE_SIZE = 0.5;
const MAX_STABLE_HEIGHT = 8;
const STABILITY_PER_SUPPORT = 0.15; // each adjacent support cube adds stability
const BASE_STABILITY = 0.5; // single column base stability
const TOPPLE_THRESHOLD = 0.3; // below this, stack topples

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const cubes = new Map<string, CubeData>();
const stacks = new Map<string, StackData>();
let nextStackId = 0;
let randomFn: () => number = Math.random;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distance2D(
	a: { x: number; z: number },
	b: { x: number; z: number },
): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a cube in the physics model.
 */
export function registerCube(
	id: string,
	materialType: string,
	position: { x: number; y: number; z: number },
): void {
	cubes.set(id, { id, materialType, position: { ...position } });
}

/**
 * Remove a cube from the model.
 */
export function removeCube(id: string): void {
	const cube = cubes.get(id);
	if (cube?.stackId) {
		removeFromStack(cube.stackId, id);
	}
	cubes.delete(id);
}

/**
 * Get a cube's data.
 */
export function getCube(id: string): CubeData | null {
	const cube = cubes.get(id);
	return cube ? { ...cube } : null;
}

/**
 * Get total cube count.
 */
export function getCubeCount(): number {
	return cubes.size;
}

/**
 * Place a cube on the ground, creating a new stack or adding to existing.
 */
export function placeCube(
	cubeId: string,
	x: number,
	z: number,
): string | null {
	const cube = cubes.get(cubeId);
	if (!cube) return null;

	// Check if there's an existing stack at this position
	let targetStack: StackData | null = null;
	for (const stack of stacks.values()) {
		if (
			!stack.toppled &&
			distance2D(stack.basePosition, { x, z }) < CUBE_SIZE
		) {
			targetStack = stack;
			break;
		}
	}

	if (targetStack) {
		// Add to existing stack
		const layer = targetStack.height;
		cube.position = {
			x: targetStack.basePosition.x,
			y: layer * CUBE_SIZE,
			z: targetStack.basePosition.z,
		};
		cube.stackId = targetStack.id;
		cube.stackLayer = layer;
		targetStack.cubes.push(cubeId);
		targetStack.height = layer + 1;
		targetStack.stability = calculateStackStability(targetStack);
		return targetStack.id;
	}

	// Create new stack
	const stackId = `stack_${nextStackId++}`;
	cube.position = { x, y: 0, z };
	cube.stackId = stackId;
	cube.stackLayer = 0;

	stacks.set(stackId, {
		id: stackId,
		cubes: [cubeId],
		basePosition: { x, z },
		height: 1,
		stability: 1.0,
		toppled: false,
	});

	return stackId;
}

/**
 * Calculate stack stability.
 * Taller stacks are less stable. Adjacent stacks add support.
 */
export function calculateStackStability(stack: StackData): number {
	if (stack.height <= 1) return 1.0;

	// Height penalty
	const heightFactor = Math.max(
		0,
		1 - (stack.height - 1) / MAX_STABLE_HEIGHT,
	);

	// Support from adjacent stacks
	let supportBonus = 0;
	for (const other of stacks.values()) {
		if (other.id === stack.id || other.toppled) continue;
		const dist = distance2D(stack.basePosition, other.basePosition);
		if (dist <= CUBE_SIZE * 1.5) {
			supportBonus += STABILITY_PER_SUPPORT;
		}
	}

	const stability = Math.min(
		1,
		BASE_STABILITY * heightFactor + supportBonus,
	);
	return Math.round(stability * 100) / 100;
}

/**
 * Check if a stack should topple, and compute scatter positions if so.
 */
export function checkTopple(stackId: string): ToppleResult | null {
	const stack = stacks.get(stackId);
	if (!stack || stack.toppled) return null;

	stack.stability = calculateStackStability(stack);

	if (stack.stability >= TOPPLE_THRESHOLD) return null;

	// Topple!
	stack.toppled = true;

	const scattered: ToppleResult["scatteredCubes"] = [];
	for (const cubeId of stack.cubes) {
		const cube = cubes.get(cubeId);
		if (!cube) continue;

		const angle = randomFn() * Math.PI * 2;
		const distance = (randomFn() * 0.5 + 0.5) * stack.height * CUBE_SIZE;

		const newPos = {
			x: stack.basePosition.x + Math.cos(angle) * distance,
			y: 0,
			z: stack.basePosition.z + Math.sin(angle) * distance,
		};

		cube.position = newPos;
		cube.stackId = undefined;
		cube.stackLayer = undefined;

		scattered.push({ cubeId, newPosition: { ...newPos } });
	}

	stack.cubes = [];
	stack.height = 0;

	return { stackId, scatteredCubes: scattered };
}

/**
 * Get stack data.
 */
export function getStack(stackId: string): StackData | null {
	const stack = stacks.get(stackId);
	return stack ? { ...stack, cubes: [...stack.cubes] } : null;
}

/**
 * Get all stacks.
 */
export function getAllStacks(): StackData[] {
	return Array.from(stacks.values()).map((s) => ({
		...s,
		cubes: [...s.cubes],
	}));
}

/**
 * Get stacks near a position.
 */
export function getStacksNear(
	x: number,
	z: number,
	radius: number,
): StackData[] {
	return getAllStacks().filter(
		(s) => distance2D(s.basePosition, { x, z }) <= radius,
	);
}

/**
 * Get total cube value for a faction's stockpile.
 */
export function getStockpileValue(stackIds: string[]): number {
	let total = 0;
	for (const id of stackIds) {
		const stack = stacks.get(id);
		if (stack && !stack.toppled) {
			total += stack.cubes.length;
		}
	}
	return total;
}

function removeFromStack(stackId: string, cubeId: string): void {
	const stack = stacks.get(stackId);
	if (!stack) return;

	const idx = stack.cubes.indexOf(cubeId);
	if (idx !== -1) {
		stack.cubes.splice(idx, 1);
		stack.height = stack.cubes.length;

		// Renumber layers
		for (let i = 0; i < stack.cubes.length; i++) {
			const cube = cubes.get(stack.cubes[i]);
			if (cube) cube.stackLayer = i;
		}

		if (stack.cubes.length === 0) {
			stacks.delete(stackId);
		} else {
			stack.stability = calculateStackStability(stack);
		}
	}
}

/**
 * Set random function for testing.
 */
export function setRandomFn(fn: () => number): void {
	randomFn = fn;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetCubePhysics(): void {
	cubes.clear();
	stacks.clear();
	nextStackId = 0;
	randomFn = Math.random;
}
