/**
 * YukaManager — singleton that owns the Yuka EntityManager and NavMesh.
 *
 * All Yuka Vehicles (bot steering entities) are registered here.
 * The manager is ticked once per frame from <YukaSystem />.
 *
 * The NavMesh is built at world initialization and stored here so all
 * systems (pathfinding, bot automation, etc.) can access it globally.
 *
 * Unlike Yuka's built-in Time helper, we receive delta from R3F's useFrame
 * so Yuka stays in lock-step with Three.js rendering. This avoids the drift
 * that would occur if Yuka ran its own independent clock.
 */

import type { NavMesh } from "yuka";
import { EntityManager } from "yuka";

class YukaManagerImpl {
	entityManager = new EntityManager();

	/**
	 * The global Yuka NavMesh for the current game world.
	 * Set by calling setNavMesh() after world initialization.
	 * Used by PathfindingSystem for path queries.
	 */
	navMesh: NavMesh | null = null;

	/**
	 * Advance all Yuka entities by the given delta (in seconds).
	 * Called from <YukaSystem /> inside useFrame.
	 */
	update(delta: number): void {
		this.entityManager.update(delta);
	}

	/**
	 * Set the global NavMesh. Called after buildNavMesh() during
	 * world initialization or when obstacles change.
	 */
	setNavMesh(mesh: NavMesh): void {
		this.navMesh = mesh;
	}

	/**
	 * Remove all entities and reset state — call on game restart.
	 */
	clear(): void {
		this.entityManager.clear();
		this.navMesh = null;
	}
}

export const YukaManager = new YukaManagerImpl();
