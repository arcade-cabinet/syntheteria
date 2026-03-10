/**
 * Grabber system -- pick up, drop, and throw physical material cubes.
 *
 * The player can grab a nearby cube (within reach distance), carry it
 * attached to their body, and drop or throw it. Only one cube can be
 * held at a time. Cubes must have the "Grabbable" trait to be picked up.
 *
 * Rapier physics is decoupled via optional callbacks:
 * - setKinematic: freeze the cube body while held
 * - setDynamic: re-enable physics when released
 * - applyImpulse: launch the cube on throw
 *
 * Config reference: config/cubeMaterials.json
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 3D vector for positions, directions, and impulses. */
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A registered cube entity in the grabber system. */
export interface CubeEntity {
	/** Unique identifier (matches MaterialCubeData.id) */
	id: string;
	/** World-space position */
	position: Vec3;
	/** Entity traits (e.g. "Grabbable", "HeldBy") */
	traits: string[];
	/** Material type (e.g. "iron", "copper") */
	material: string;
}

/** Callbacks for Rapier physics integration (all optional). */
export interface GrabCallbacks {
	/** Switch rigid body to kinematic (freeze in place while held) */
	setKinematic?: (id: string) => void;
}

/** Callbacks for releasing a cube (drop or throw). */
export interface ReleaseCallbacks {
	/** Switch rigid body back to dynamic (re-enable physics) */
	setDynamic?: (id: string) => void;
	/** Apply an impulse vector to the rigid body (throw only) */
	applyImpulse?: (id: string, impulse: Vec3) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum distance in meters at which a cube can be grabbed. */
const GRAB_REACH = 2.0;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** ID of the currently held cube, or null if hands are empty. */
let heldCubeId: string | null = null;

/** Registry of all known cube entities keyed by ID. */
const cubeRegistry = new Map<string, CubeEntity>();

// ---------------------------------------------------------------------------
// Registry API
// ---------------------------------------------------------------------------

/**
 * Register a cube entity so the grabber system knows about it.
 *
 * Typically called when a cube is spawned by the compression system.
 */
export function registerCube(cube: CubeEntity): void {
	cubeRegistry.set(cube.id, {
		id: cube.id,
		position: { ...cube.position },
		traits: [...cube.traits],
		material: cube.material,
	});
}

/**
 * Remove a cube entity from the registry.
 *
 * Called when a cube is consumed (e.g. inserted into a furnace).
 */
export function unregisterCube(id: string): void {
	cubeRegistry.delete(id);
	if (heldCubeId === id) {
		heldCubeId = null;
	}
}

/**
 * Look up a registered cube by ID.
 */
export function getCube(id: string): CubeEntity | undefined {
	return cubeRegistry.get(id);
}

// ---------------------------------------------------------------------------
// Grab
// ---------------------------------------------------------------------------

/**
 * Attempt to grab a cube.
 *
 * Checks:
 * 1. Cube exists in registry
 * 2. Cube has the "Grabbable" trait
 * 3. Cube is within reach distance of the player
 * 4. Player is not already holding a cube
 *
 * On success, removes "Grabbable" and adds "HeldBy" trait, then calls
 * the optional setKinematic callback to freeze the physics body.
 *
 * @returns true if the cube was grabbed, false otherwise
 */
export function grabCube(
	cubeId: string,
	playerPosition: Vec3,
	callbacks?: GrabCallbacks,
): boolean {
	// Cannot grab if already holding
	if (heldCubeId !== null) {
		return false;
	}

	const cube = cubeRegistry.get(cubeId);
	if (!cube) {
		return false;
	}

	// Must have Grabbable trait
	if (!cube.traits.includes("Grabbable")) {
		return false;
	}

	// Check distance
	const dx = cube.position.x - playerPosition.x;
	const dy = cube.position.y - playerPosition.y;
	const dz = cube.position.z - playerPosition.z;
	const distSq = dx * dx + dy * dy + dz * dz;
	if (distSq > GRAB_REACH * GRAB_REACH) {
		return false;
	}

	// --- Grab succeeds ---

	// Update traits: remove Grabbable, add HeldBy
	const grabbableIdx = cube.traits.indexOf("Grabbable");
	if (grabbableIdx !== -1) {
		cube.traits.splice(grabbableIdx, 1);
	}
	cube.traits.push("HeldBy");

	// Freeze physics body
	callbacks?.setKinematic?.(cubeId);

	heldCubeId = cubeId;

	return true;
}

// ---------------------------------------------------------------------------
// Drop
// ---------------------------------------------------------------------------

/**
 * Drop the currently held cube at a given position.
 *
 * Removes the "HeldBy" trait, restores "Grabbable", sets the cube
 * position, and calls the optional setDynamic callback.
 *
 * @returns true if a cube was dropped, false if not holding anything
 */
export function dropCube(
	dropPosition: Vec3,
	callbacks?: ReleaseCallbacks,
): boolean {
	if (heldCubeId === null) {
		return false;
	}

	const cube = cubeRegistry.get(heldCubeId);
	if (!cube) {
		// Cube was unregistered while held — just clear state
		heldCubeId = null;
		return false;
	}

	// Update traits: remove HeldBy, add Grabbable
	const heldIdx = cube.traits.indexOf("HeldBy");
	if (heldIdx !== -1) {
		cube.traits.splice(heldIdx, 1);
	}
	cube.traits.push("Grabbable");

	// Set position
	cube.position.x = dropPosition.x;
	cube.position.y = dropPosition.y;
	cube.position.z = dropPosition.z;

	// Re-enable physics
	callbacks?.setDynamic?.(heldCubeId);

	heldCubeId = null;

	return true;
}

// ---------------------------------------------------------------------------
// Throw
// ---------------------------------------------------------------------------

/**
 * Throw the currently held cube in a direction with a given force.
 *
 * Works like drop but also applies an impulse (direction * force) to
 * the physics body via the applyImpulse callback.
 *
 * @returns true if a cube was thrown, false if not holding anything
 */
export function throwCube(
	direction: Vec3,
	force: number,
	callbacks?: ReleaseCallbacks,
): boolean {
	if (heldCubeId === null) {
		return false;
	}

	const cube = cubeRegistry.get(heldCubeId);
	if (!cube) {
		heldCubeId = null;
		return false;
	}

	const thrownId = heldCubeId;

	// Update traits: remove HeldBy, add Grabbable
	const heldIdx = cube.traits.indexOf("HeldBy");
	if (heldIdx !== -1) {
		cube.traits.splice(heldIdx, 1);
	}
	cube.traits.push("Grabbable");

	// Re-enable physics
	callbacks?.setDynamic?.(thrownId);

	// Apply impulse: direction * force
	const impulse: Vec3 = {
		x: direction.x * force,
		y: direction.y * force,
		z: direction.z * force,
	};
	callbacks?.applyImpulse?.(thrownId, impulse);

	heldCubeId = null;

	return true;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Get the ID of the currently held cube, or null if empty-handed.
 */
export function getHeldCube(): string | null {
	return heldCubeId;
}

/**
 * Get all registered cube entities (for rendering).
 */
export function getAllCubes(): ReadonlyMap<string, CubeEntity> {
	return cubeRegistry;
}

/**
 * Set a cube's position (used by heldCubeSync to move held cubes).
 */
export function setCubePosition(id: string, pos: Vec3): void {
	const cube = cubeRegistry.get(id);
	if (cube) {
		cube.position.x = pos.x;
		cube.position.y = pos.y;
		cube.position.z = pos.z;
	}
}

// ---------------------------------------------------------------------------
// Test reset
// ---------------------------------------------------------------------------

/**
 * Reset all grabber state -- for testing.
 */
export function _resetGrabberState(): void {
	heldCubeId = null;
	cubeRegistry.clear();
}
