/**
 * Quick-deposit system -- single key press to deposit a held cube
 * into a nearby furnace, hopper, belt input, or storage bin.
 *
 * Paper playtesting found that the radial menu deposit flow
 * (walk → open radial → select action → drop) adds too much
 * friction to the most repeated action in the core loop.
 * This system provides a proximity-based hotkey shortcut.
 *
 * Targets are generic: any container that accepts cubes can
 * register itself. The system finds the nearest valid target,
 * generates a prompt ("Press F to deposit Iron Cube into Furnace"),
 * and executes the deposit on confirmation.
 *
 * No config dependency -- range defaults to 3.0m and is
 * configurable at runtime via setQuickDepositRange().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 3D vector for positions. */
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A registered deposit target (furnace, hopper, belt input, storage bin). */
export interface QuickDepositTarget {
	/** Unique identifier (e.g. furnace_0, hopper_3) */
	targetId: string;
	/** What kind of container this is */
	targetType: "furnace" | "hopper" | "belt_input" | "storage";
	/** World-space position */
	position: Vec3;
	/** Material types this target accepts, or null for any material */
	acceptsMaterial: string[] | null;
	/** Remaining capacity in the target's hopper/input */
	hopperSpace: number;
	/** Whether the target is powered and accepting input */
	isActive: boolean;
}

/** HUD prompt shown when a quick deposit is available. */
export interface QuickDepositPrompt {
	/** ID of the target to deposit into */
	targetId: string;
	/** Human-readable target type */
	targetType: string;
	/** Full prompt string, e.g. "Press F to deposit Iron Cube into Furnace" */
	prompt: string;
	/** Distance from player to target in meters */
	distance: number;
	/** Hotkey that triggers the deposit */
	hotkey: string;
}

/** Result of executing a quick deposit action. */
export interface QuickDepositResult {
	/** Whether the deposit succeeded */
	success: boolean;
	/** Human-readable result message */
	message: string;
	/** Sound event to play */
	soundEvent: string;
	/** Particle event to trigger, or null */
	particleEvent: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum distance for quick deposit detection. */
const DEFAULT_RANGE = 3.0;

/** Default hotkey shown in prompts. */
const HOTKEY = "F";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** All registered deposit targets keyed by ID. */
const targets = new Map<string, QuickDepositTarget>();

/** Current quick deposit range in meters. */
let depositRange = DEFAULT_RANGE;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Euclidean distance between two Vec3 points. */
function distance(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Format a material string for display: "scrap_iron" → "Scrap Iron". */
function formatMaterial(material: string): string {
	return material
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/** Format a target type for display: "belt_input" → "Belt Input". */
function formatTargetType(targetType: string): string {
	return targetType
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/** Check whether a target accepts a given material type. */
function targetAcceptsMaterial(
	target: QuickDepositTarget,
	material: string,
): boolean {
	if (target.acceptsMaterial === null) {
		return true;
	}
	return target.acceptsMaterial.includes(material);
}

// ---------------------------------------------------------------------------
// Target registration
// ---------------------------------------------------------------------------

/**
 * Register a deposit target so the quick-deposit system can find it.
 *
 * Typically called when a furnace, hopper, belt input, or storage
 * bin is created.
 */
export function registerTarget(target: QuickDepositTarget): void {
	targets.set(target.targetId, {
		targetId: target.targetId,
		targetType: target.targetType,
		position: { ...target.position },
		acceptsMaterial: target.acceptsMaterial
			? [...target.acceptsMaterial]
			: null,
		hopperSpace: target.hopperSpace,
		isActive: target.isActive,
	});
}

/**
 * Remove a deposit target from the registry.
 *
 * Called when a target entity is destroyed.
 */
export function unregisterTarget(id: string): void {
	targets.delete(id);
}

/**
 * Update mutable properties of a registered target.
 *
 * Typical use: update hopperSpace when cubes are added/removed,
 * or toggle isActive when power state changes.
 */
export function updateTargetState(
	id: string,
	updates: Partial<
		Pick<
			QuickDepositTarget,
			"hopperSpace" | "isActive" | "acceptsMaterial" | "position"
		>
	>,
): void {
	const target = targets.get(id);
	if (!target) {
		return;
	}

	if (updates.hopperSpace !== undefined) {
		target.hopperSpace = updates.hopperSpace;
	}
	if (updates.isActive !== undefined) {
		target.isActive = updates.isActive;
	}
	if (updates.acceptsMaterial !== undefined) {
		target.acceptsMaterial = updates.acceptsMaterial
			? [...updates.acceptsMaterial]
			: null;
	}
	if (updates.position !== undefined) {
		target.position = { ...updates.position };
	}
}

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

/**
 * Get all registered targets within a given range of a position.
 *
 * Returns targets sorted by distance (nearest first).
 */
export function getTargetsInRange(
	playerPos: Vec3,
	range: number,
): QuickDepositTarget[] {
	const results: Array<{ target: QuickDepositTarget; dist: number }> = [];

	for (const target of targets.values()) {
		const dist = distance(playerPos, target.position);
		if (dist <= range) {
			results.push({ target, dist });
		}
	}

	results.sort((a, b) => a.dist - b.dist);
	return results.map((r) => r.target);
}

/**
 * Get the nearest registered target to a position, or null if none.
 *
 * No range filter -- returns the closest regardless of distance.
 */
export function getNearestTarget(playerPos: Vec3): QuickDepositTarget | null {
	let nearest: QuickDepositTarget | null = null;
	let nearestDist = Infinity;

	for (const target of targets.values()) {
		const dist = distance(playerPos, target.position);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = target;
		}
	}

	return nearest;
}

// ---------------------------------------------------------------------------
// Quick deposit check
// ---------------------------------------------------------------------------

/**
 * Check whether a quick deposit is available given the current state.
 *
 * Returns a QuickDepositPrompt if all conditions are met:
 * 1. Player is holding a cube (heldCubeId is not null)
 * 2. There is a registered target within depositRange
 * 3. The target has remaining hopper space
 * 4. The target accepts this material type
 * 5. The target is active (powered)
 *
 * If multiple targets qualify, the nearest one is chosen.
 *
 * @param playerPos - current player world position
 * @param heldCubeId - ID of held cube, or null if empty-handed
 * @param heldMaterial - material type of held cube, or null
 * @returns prompt to display, or null if no deposit available
 */
export function checkQuickDeposit(
	playerPos: Vec3,
	heldCubeId: string | null,
	heldMaterial: string | null,
): QuickDepositPrompt | null {
	// Must be holding a cube
	if (heldCubeId === null || heldMaterial === null) {
		return null;
	}

	// Find the nearest valid target
	const inRange = getTargetsInRange(playerPos, depositRange);

	for (const target of inRange) {
		// Must be active (powered)
		if (!target.isActive) {
			continue;
		}

		// Must have space
		if (target.hopperSpace <= 0) {
			continue;
		}

		// Must accept this material
		if (!targetAcceptsMaterial(target, heldMaterial)) {
			continue;
		}

		const dist = distance(playerPos, target.position);
		const materialName = formatMaterial(heldMaterial);
		const typeName = formatTargetType(target.targetType);

		return {
			targetId: target.targetId,
			targetType: target.targetType,
			prompt: `Press ${HOTKEY} to deposit ${materialName} Cube into ${typeName}`,
			distance: dist,
			hotkey: HOTKEY,
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// Quick deposit execution
// ---------------------------------------------------------------------------

/**
 * Execute a quick deposit action.
 *
 * Validates the target still exists and is in a valid state, then
 * decrements hopperSpace. The caller is responsible for actually
 * removing the cube from the grabber system and adding the material
 * to the target's hopper queue (this system only manages the
 * quick-deposit UX layer).
 *
 * @param targetId - ID of the target to deposit into
 * @param cubeId - ID of the cube being deposited
 * @param cubeMaterial - material type of the cube
 * @returns result with success/failure, message, and event names
 */
export function executeQuickDeposit(
	targetId: string,
	cubeId: string,
	cubeMaterial: string,
): QuickDepositResult {
	const target = targets.get(targetId);

	if (!target) {
		return {
			success: false,
			message: "Target not found",
			soundEvent: "error_buzz",
			particleEvent: null,
		};
	}

	if (!target.isActive) {
		return {
			success: false,
			message: `${formatTargetType(target.targetType)} is unpowered`,
			soundEvent: "error_buzz",
			particleEvent: null,
		};
	}

	if (target.hopperSpace <= 0) {
		return {
			success: false,
			message: `${formatTargetType(target.targetType)} hopper is full`,
			soundEvent: "error_buzz",
			particleEvent: null,
		};
	}

	if (!targetAcceptsMaterial(target, cubeMaterial)) {
		return {
			success: false,
			message: `${formatTargetType(target.targetType)} does not accept ${formatMaterial(cubeMaterial)}`,
			soundEvent: "error_buzz",
			particleEvent: null,
		};
	}

	// --- Deposit succeeds ---
	target.hopperSpace -= 1;

	const typeName = formatTargetType(target.targetType);
	const materialName = formatMaterial(cubeMaterial);

	return {
		success: true,
		message: `Deposited ${materialName} Cube into ${typeName}`,
		soundEvent: `${target.targetType}_deposit`,
		particleEvent: `${target.targetType}_intake`,
	};
}

// ---------------------------------------------------------------------------
// Range configuration
// ---------------------------------------------------------------------------

/**
 * Set the quick deposit detection range in meters.
 */
export function setQuickDepositRange(range: number): void {
	depositRange = range;
}

/**
 * Get the current quick deposit detection range in meters.
 */
export function getQuickDepositRange(): number {
	return depositRange;
}

// ---------------------------------------------------------------------------
// Test reset
// ---------------------------------------------------------------------------

/**
 * Reset all quick-deposit state -- for testing.
 */
export function reset(): void {
	targets.clear();
	depositRange = DEFAULT_RANGE;
}
