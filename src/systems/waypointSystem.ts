/**
 * Waypoint system — manages world-space waypoints and objective markers.
 *
 * Paper playtesting found that players have no navigation aids. When the
 * tutorial says "go to the ore deposit" the player has no idea where it is.
 * This system tracks waypoints, computes distance + bearing relative to the
 * player each tick, handles expiration, and provides queries for the HUD
 * compass and minimap.
 *
 * Bearing convention:
 *   0       = directly ahead
 *   +PI/2   = to the right
 *   -PI/2   = to the left
 *   +-PI    = directly behind
 *
 * Distance is 2D XZ (ignoring Y) for compass/HUD display.
 *
 * No config dependency — pure TypeScript logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WaypointType = "objective" | "poi" | "danger" | "custom";

export interface Waypoint {
	id: string;
	position: { x: number; y: number; z: number };
	label: string;
	type: WaypointType;
	color: string;
	icon: string;
	visible: boolean;
	distanceToPlayer: number;
	bearing: number;
	priority: number;
	expiresAt: number | null;
	createdBy: string;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const waypoints: Map<string, Waypoint> = new Map();
let nextId = 1;

/** Track the current objective so clearObjective() can find it. */
let currentObjectiveId: string | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
	return `wp_${nextId++}`;
}

/**
 * 2D XZ distance (ignoring Y) — used for compass/HUD display.
 */
function distXZ(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	const dx = bx - ax;
	const dz = bz - az;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Compute signed bearing from player's forward direction (yaw) to a target.
 *
 * playerYaw: the angle of the player's forward direction, measured as the
 *   standard math-convention angle in the XZ plane (radians).
 *   In Three.js / R3F the camera looks along -Z by default, so yaw=0 means
 *   facing -Z, but the caller can use any convention as long as they pass
 *   atan2(forwardX, forwardZ) or similar.
 *
 * Returns a value in (-PI, PI]:
 *   0       directly ahead
 *   +       to the right
 *   -       to the left
 *   +-PI    directly behind
 */
function computeBearing(
	playerX: number,
	playerZ: number,
	playerYaw: number,
	targetX: number,
	targetZ: number,
): number {
	const dx = targetX - playerX;
	const dz = targetZ - playerZ;

	// Angle from player to target in world space
	const angleToTarget = Math.atan2(dx, dz);

	// Relative bearing: difference between target angle and player facing
	let bearing = angleToTarget - playerYaw;

	// Normalize to (-PI, PI]
	while (bearing > Math.PI) bearing -= 2 * Math.PI;
	while (bearing <= -Math.PI) bearing += 2 * Math.PI;

	return bearing;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add a waypoint to the system.
 * Returns the generated ID string.
 */
export function addWaypoint(wp: Omit<Waypoint, "id">): string {
	const id = generateId();
	const waypoint: Waypoint = { ...wp, id };
	waypoints.set(id, waypoint);
	return id;
}

/**
 * Remove a waypoint by ID.
 * Returns true if the waypoint existed and was removed.
 */
export function removeWaypoint(id: string): boolean {
	if (currentObjectiveId === id) {
		currentObjectiveId = null;
	}
	return waypoints.delete(id);
}

/**
 * Update all waypoints: recalculate distance, bearing, and remove expired.
 * Called once per tick.
 */
export function updateWaypoints(
	playerPos: { x: number; y: number; z: number },
	playerYaw: number,
	currentTime: number,
): void {
	const toRemove: string[] = [];

	for (const wp of waypoints.values()) {
		// Check expiration
		if (wp.expiresAt !== null && currentTime >= wp.expiresAt) {
			toRemove.push(wp.id);
			continue;
		}

		// Update distance (2D XZ)
		wp.distanceToPlayer = distXZ(
			playerPos.x,
			playerPos.z,
			wp.position.x,
			wp.position.z,
		);

		// Update bearing
		wp.bearing = computeBearing(
			playerPos.x,
			playerPos.z,
			playerYaw,
			wp.position.x,
			wp.position.z,
		);
	}

	// Remove expired waypoints
	for (const id of toRemove) {
		if (currentObjectiveId === id) {
			currentObjectiveId = null;
		}
		waypoints.delete(id);
	}
}

/**
 * Get all visible waypoints within maxDistance, sorted by distance (nearest first).
 * If maxDistance is omitted, all visible waypoints are returned.
 */
export function getVisibleWaypoints(maxDistance?: number): Waypoint[] {
	const result: Waypoint[] = [];

	for (const wp of waypoints.values()) {
		if (!wp.visible) continue;
		if (maxDistance !== undefined && wp.distanceToPlayer > maxDistance) continue;
		result.push(wp);
	}

	result.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
	return result;
}

/**
 * Get a single waypoint by ID.
 */
export function getWaypointById(id: string): Waypoint | null {
	return waypoints.get(id) ?? null;
}

/**
 * Get all waypoints of a given type.
 */
export function getWaypointsByType(type: WaypointType): Waypoint[] {
	const result: Waypoint[] = [];
	for (const wp of waypoints.values()) {
		if (wp.type === type) result.push(wp);
	}
	return result;
}

/**
 * Convenience function: create an objective waypoint for tutorial/quest use.
 * Only one objective can exist at a time — calling this replaces the previous one.
 * Returns the new waypoint ID.
 */
export function setObjectiveWaypoint(
	position: { x: number; y: number; z: number },
	label: string,
): string {
	// Clear any existing objective
	if (currentObjectiveId !== null) {
		waypoints.delete(currentObjectiveId);
	}

	const id = addWaypoint({
		position,
		label,
		type: "objective",
		color: "#ffcc00",
		icon: "star",
		visible: true,
		distanceToPlayer: 0,
		bearing: 0,
		priority: 100,
		expiresAt: null,
		createdBy: "objective",
	});

	currentObjectiveId = id;
	return id;
}

/**
 * Remove the current objective waypoint.
 */
export function clearObjective(): void {
	if (currentObjectiveId !== null) {
		waypoints.delete(currentObjectiveId);
		currentObjectiveId = null;
	}
}

/**
 * Get the closest waypoint to a given position, optionally filtered by type.
 * Distance is 2D XZ.
 */
export function getClosestWaypoint(
	playerPos: { x: number; y: number; z: number },
	type?: WaypointType,
): Waypoint | null {
	let closest: Waypoint | null = null;
	let closestDist = Infinity;

	for (const wp of waypoints.values()) {
		if (type !== undefined && wp.type !== type) continue;

		const d = distXZ(playerPos.x, playerPos.z, wp.position.x, wp.position.z);
		if (d < closestDist) {
			closestDist = d;
			closest = wp;
		}
	}

	return closest;
}

/**
 * Get the current objective waypoint, if one exists.
 */
export function getActiveObjective(): Waypoint | null {
	if (currentObjectiveId === null) return null;
	return waypoints.get(currentObjectiveId) ?? null;
}

/**
 * Toggle visibility of a waypoint.
 * Returns the new visibility state, or false if the waypoint doesn't exist.
 */
export function toggleVisibility(id: string): boolean {
	const wp = waypoints.get(id);
	if (!wp) return false;
	wp.visible = !wp.visible;
	return wp.visible;
}

/**
 * Reset all waypoint state. Intended for testing and world reset.
 */
export function reset(): void {
	waypoints.clear();
	nextId = 1;
	currentObjectiveId = null;
}
