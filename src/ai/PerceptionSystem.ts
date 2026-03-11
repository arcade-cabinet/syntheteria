/**
 * PerceptionSystem — cone-of-sight vision checks for bot AI.
 *
 * Wraps Yuka's Vision class with game-specific logic:
 *   - FOV varies by unit type (scout: wide, heavy: narrow)
 *   - Vision range scales with config (camera component adds bonus)
 *   - Line-of-sight is blocked by city buildings and placed cubes
 *   - Integrates with the obstacle data from NavMeshBuilder
 *
 * Usage:
 * ```ts
 * initPerceptionObstacles();                       // call once at world init
 * const visible = getVisibleEntities('bot-1', allEntities, currentTime);
 * const canSeeTarget = canSee('bot-1', 'target-1', allEntities);
 * ```
 *
 * This module is a pure logic system — no React / R3F dependencies.
 * The BotBrainSystem calls these functions each frame to build perception.
 */

import { GameEntity, Vision, Vector3 as YukaVector3 } from "yuka";

import { config } from "../../config/index.ts";
import type { CityBuilding } from "../ecs/cityLayout.ts";
import { getCityBuildings } from "../ecs/cityLayout.ts";
import type { Entity, Vec3 } from "../ecs/types.ts";

// ---------------------------------------------------------------------------
// Config — pulled from config/enemies.json perception section
// ---------------------------------------------------------------------------

const perceptionConfig = config.enemies.perception;

/** Default field of view in degrees. */
const DEFAULT_FOV_DEG = perceptionConfig.defaultFOV;

/** Scout FOV in degrees (wider awareness). */
const SCOUT_FOV_DEG = perceptionConfig.scoutFOV;

/** Heavy unit FOV in degrees (narrow, focused). */
const HEAVY_FOV_DEG = perceptionConfig.heavyFOV;

/** Default vision range in world units. */
const DEFAULT_RANGE = perceptionConfig.defaultRange;

/** Extra range granted by a functional camera component. */
const CAMERA_RANGE_BONUS = perceptionConfig.cameraRangeBonus;

// ---------------------------------------------------------------------------
// Helper: degrees to radians
// ---------------------------------------------------------------------------

function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Obstacle cache for line-of-sight
// ---------------------------------------------------------------------------

/**
 * Lightweight Yuka GameEntity used as a vision obstacle.
 * Yuka's Vision.visible() tests a ray against each obstacle's bounding radius.
 * We represent each building/cube as a sphere centered at its position with
 * a bounding radius derived from its half-extents.
 */
const obstacleEntities: GameEntity[] = [];

/**
 * Initialize (or refresh) the obstacle list for vision checks.
 * Call once at world initialization and again when buildings/cubes change.
 */
export function initPerceptionObstacles(): void {
	obstacleEntities.length = 0;

	const cityBuildings: CityBuilding[] = getCityBuildings();

	for (const b of cityBuildings) {
		const obstacle = new GameEntity();
		obstacle.position.set(b.x, b.height / 2, b.z);
		// Bounding radius: use the larger of the two half-extents so
		// the sphere conservatively covers the building footprint.
		obstacle.boundingRadius = Math.max(b.halfW, b.halfD);
		obstacleEntities.push(obstacle);
	}
}

/**
 * Add a dynamic obstacle (placed cube or building) to the vision obstacle list.
 * Call when the player places a new structure.
 */
export function addPerceptionObstacle(
	x: number,
	z: number,
	halfW: number,
	halfD: number,
	height: number,
): void {
	const obstacle = new GameEntity();
	obstacle.position.set(x, height / 2, z);
	obstacle.boundingRadius = Math.max(halfW, halfD);
	obstacleEntities.push(obstacle);
}

/**
 * Get the current list of Yuka obstacle entities (for debug / external use).
 */
export function getPerceptionObstacles(): readonly GameEntity[] {
	return obstacleEntities;
}

// ---------------------------------------------------------------------------
// Per-bot Vision instance cache
// ---------------------------------------------------------------------------

/**
 * We create and cache a Yuka Vision instance per bot to avoid
 * re-allocating each frame. The vision is reconfigured with the
 * bot's current position, direction, FOV, and range before each query.
 */
const visionCache = new Map<string, Vision>();

/**
 * Get or create a Vision instance for a bot entity.
 * Configures FOV and range based on unit type and component status.
 */
function getVision(entity: Entity): Vision {
	let vision = visionCache.get(entity.id);

	if (!vision) {
		// Create a minimal GameEntity owner for the Vision.
		// We update its position and direction each frame.
		const owner = new GameEntity();
		vision = new Vision(owner);
		visionCache.set(entity.id, vision);
	}

	// Configure FOV based on unit type.
	const fovDeg = getFOVForEntity(entity);
	vision.fieldOfView = degToRad(fovDeg);

	// Configure range — camera component extends it.
	const hasCamera =
		entity.unit?.components.some((c) => c.name === "camera" && c.functional) ??
		false;
	vision.range = DEFAULT_RANGE + (hasCamera ? CAMERA_RANGE_BONUS : 0);

	// Update obstacles reference.
	vision.obstacles = obstacleEntities;

	// Update owner position.
	if (entity.worldPosition && vision.owner) {
		vision.owner.position.set(
			entity.worldPosition.x,
			entity.worldPosition.y,
			entity.worldPosition.z,
		);
	}

	// Set the owner's forward direction.
	// If the entity has navigation and is moving, use the path direction.
	// Otherwise, default forward (positive Z in our coordinate system).
	const dir = getEntityDirection(entity);
	if (vision.owner) {
		vision.owner.rotation.lookAt(
			vision.owner.position,
			new YukaVector3(
				vision.owner.position.x + dir.x,
				vision.owner.position.y + dir.y,
				vision.owner.position.z + dir.z,
			),
			new YukaVector3(0, 1, 0),
		);
	}

	return vision;
}

/**
 * Determine the FOV (degrees) for an entity based on its unit type.
 */
function getFOVForEntity(entity: Entity): number {
	const unitType = entity.unit?.type;

	switch (unitType) {
		case "utility_drone":
			// Drones are scout-like — wide field of view
			return SCOUT_FOV_DEG;
		case "fabrication_unit":
			// Fabrication units are heavy/focused — narrow FOV
			return HEAVY_FOV_DEG;
		case "maintenance_bot":
		default:
			return DEFAULT_FOV_DEG;
	}
}

/**
 * Estimate the forward direction of an entity.
 * Uses navigation path if moving, otherwise defaults to +Z.
 */
function getEntityDirection(entity: Entity): Vec3 {
	if (entity.navigation?.moving && entity.navigation.path.length > 0) {
		const pos = entity.worldPosition!;
		const idx = Math.min(
			entity.navigation.pathIndex,
			entity.navigation.path.length - 1,
		);
		const target = entity.navigation.path[idx];

		const dx = target.x - pos.x;
		const dz = target.z - pos.z;
		const len = Math.sqrt(dx * dx + dz * dz);

		if (len > 0.001) {
			return { x: dx / len, y: 0, z: dz / len };
		}
	}

	// Default forward direction
	return { x: 0, y: 0, z: 1 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether one entity can see another.
 *
 * Uses Yuka's Vision class with cone-of-sight and obstacle occlusion.
 *
 * @param observerId - Entity ID of the observer
 * @param targetId   - Entity ID of the target
 * @param allEntities - All entities in the world (for lookup)
 * @returns True if the observer can see the target
 */
export function canSee(
	observerId: string,
	targetId: string,
	allEntities: ReadonlyArray<Entity>,
): boolean {
	let observer: Entity | undefined;
	let target: Entity | undefined;

	for (const e of allEntities) {
		if (e.id === observerId) observer = e;
		if (e.id === targetId) target = e;
		if (observer && target) break;
	}

	if (!observer?.worldPosition || !target?.worldPosition) return false;

	const vision = getVision(observer);
	const targetPos = new YukaVector3(
		target.worldPosition.x,
		target.worldPosition.y,
		target.worldPosition.z,
	);

	return vision.visible(targetPos) === true;
}

/**
 * Get all entities visible to a given observer.
 *
 * Scans the provided entity list and returns IDs of entities that pass
 * the Vision cone + LOS check.
 *
 * @param observerId  - Entity ID of the observer
 * @param allEntities - All entities to scan
 * @returns Array of entity IDs visible to the observer
 */
export function getVisibleEntities(
	observerId: string,
	allEntities: ReadonlyArray<Entity>,
): string[] {
	let observer: Entity | undefined;

	for (const e of allEntities) {
		if (e.id === observerId) {
			observer = e;
			break;
		}
	}

	if (!observer?.worldPosition) return [];

	const vision = getVision(observer);
	const rangeSq = vision.range * vision.range;
	const result: string[] = [];

	for (const other of allEntities) {
		if (other.id === observerId) continue;
		if (!other.worldPosition) continue;

		// Quick distance pre-check to avoid unnecessary Vision.visible() calls.
		const dx = other.worldPosition.x - observer.worldPosition.x;
		const dz = other.worldPosition.z - observer.worldPosition.z;
		if (dx * dx + dz * dz > rangeSq) continue;

		const targetPos = new YukaVector3(
			other.worldPosition.x,
			other.worldPosition.y,
			other.worldPosition.z,
		);

		if (vision.visible(targetPos)) {
			result.push(other.id);
		}
	}

	return result;
}

/**
 * Clear the vision cache for a specific entity (e.g., on entity removal).
 */
export function clearVisionCache(entityId: string): void {
	visionCache.delete(entityId);
}

/**
 * Clear all cached vision instances (e.g., on game restart).
 */
export function clearAllVisionCaches(): void {
	visionCache.clear();
}
