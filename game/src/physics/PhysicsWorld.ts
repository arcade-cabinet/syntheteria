/**
 * Rapier physics world for Syntheteria.
 *
 * Provides:
 * - Ground plane collider (from terrain heightfield)
 * - Building colliders (static AABB boxes)
 * - Unit rigid bodies (kinematic for player, dynamic for physics objects)
 * - Conveyor belt item physics (future)
 * - Projectile physics (future)
 *
 * Uses @dimforge/rapier3d-compat (WASM, cross-platform compatible).
 */

import RAPIER from "@dimforge/rapier3d-compat";

let world: RAPIER.World | null = null;
let initialized = false;

/**
 * Initialize the Rapier physics engine.
 * Must be called once at startup — loads WASM.
 */
export async function initPhysics(): Promise<void> {
	if (initialized) return;

	await RAPIER.init();

	// Create world with gravity
	const gravity = { x: 0, y: -9.81, z: 0 };
	world = new RAPIER.World(gravity);

	initialized = true;
}

/**
 * Get the physics world instance.
 */
export function getPhysicsWorld(): RAPIER.World | null {
	return world;
}

/**
 * Add a static box collider (for buildings).
 */
export function addStaticBox(
	x: number,
	y: number,
	z: number,
	halfW: number,
	halfH: number,
	halfD: number,
): RAPIER.Collider | null {
	if (!world) return null;

	const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
	const body = world.createRigidBody(bodyDesc);

	const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfD);
	return world.createCollider(colliderDesc, body);
}

/**
 * Add a kinematic body (for player bot).
 */
export function addKinematicBody(
	x: number,
	y: number,
	z: number,
): RAPIER.RigidBody | null {
	if (!world) return null;

	const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
		x,
		y,
		z,
	);
	return world.createRigidBody(bodyDesc);
}

/**
 * Add a dynamic body (for physics objects like dropped items, conveyor items).
 */
export function addDynamicBody(
	x: number,
	y: number,
	z: number,
	mass: number = 1,
): RAPIER.RigidBody | null {
	if (!world) return null;

	const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
		.setTranslation(x, y, z)
		.setAdditionalMass(mass);
	return world.createRigidBody(bodyDesc);
}

/**
 * Add a ground plane collider.
 */
export function addGroundPlane(y: number = 0): RAPIER.Collider | null {
	if (!world) return null;

	const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, y, 0);
	const body = world.createRigidBody(bodyDesc);

	// Large flat box as ground
	const colliderDesc = RAPIER.ColliderDesc.cuboid(200, 0.1, 200);
	return world.createCollider(colliderDesc, body);
}

/**
 * Step the physics simulation.
 * Call once per frame with the frame delta time.
 */
export function stepPhysics(): void {
	if (!world) return;
	world.step();
}

/**
 * Cast a ray from a position in a direction.
 * Returns the hit point and normal if something was hit.
 */
export function castRay(
	originX: number,
	originY: number,
	originZ: number,
	dirX: number,
	dirY: number,
	dirZ: number,
	maxDist: number,
): {
	point: { x: number; y: number; z: number };
	normal: { x: number; y: number; z: number };
} | null {
	if (!world) return null;

	const ray = new RAPIER.Ray(
		{ x: originX, y: originY, z: originZ },
		{ x: dirX, y: dirY, z: dirZ },
	);

	const hit = world.castRay(ray, maxDist, true);
	if (!hit) return null;

	const hitPoint = ray.pointAt(hit.timeOfImpact);
	// Get the normal at the hit point
	const hitNormal = hit.collider.castRayAndGetNormal(ray, maxDist, true);
	const normal = hitNormal ? hitNormal.normal : { x: 0, y: 1, z: 0 };

	return {
		point: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
		normal: { x: normal.x, y: normal.y, z: normal.z },
	};
}

/**
 * Clean up physics resources.
 */
export function disposePhysics(): void {
	world?.free();
	world = null;
	initialized = false;
}

export function isPhysicsInitialized(): boolean {
	return initialized;
}
