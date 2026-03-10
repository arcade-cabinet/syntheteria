/**
 * Harvest unifier — single API that delegates to the correct harvesting
 * backend depending on whether the entity is player-controlled or AI.
 *
 * Paper playtesting found two harvest systems:
 *   - harvesting.ts: FPS player, range-checked, delta-based
 *   - harvestCompress.ts: ECS entities (AI bots), tick-based, multi-entity
 *
 * These are complementary, not conflicting. This unifier exposes a single
 * API surface so callers don't need to know which backend runs underneath.
 *
 * No config dependency — delegates entirely.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedHarvestResult {
	powderGained: number;
	depositRemaining: number;
	stopped: boolean;
	materialType: string;
	entityId: string;
}

export interface HarvestRequest {
	entityId: string;
	depositId: string;
	isPlayerControlled: boolean;
	position: { x: number; y: number; z: number };
	depositPosition: { x: number; y: number; z: number };
	harvestRange?: number;
	powderCapacity?: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Tracks which backend each entity uses. */
const entityBackends = new Map<string, "player" | "ecs">();

/** Pending results from last update cycle. */
const pendingResults: UnifiedHarvestResult[] = [];

/** Registered delegates — set by init so we avoid circular imports. */
let playerDelegate: PlayerHarvestDelegate | null = null;
let ecsDelegate: EcsHarvestDelegate | null = null;

// ---------------------------------------------------------------------------
// Delegate interfaces
// ---------------------------------------------------------------------------

export interface PlayerHarvestDelegate {
	start(
		depositId: string,
		playerPosition: { x: number; y: number; z: number },
		getDepositPosition: () => { x: number; y: number; z: number },
		harvestRange: number,
	): boolean;
	update(
		delta: number,
		playerPosition: { x: number; y: number; z: number },
		harvestRange: number,
	): { powderGained: number; depositRemaining: number; stopped: boolean };
	stop(): void;
	getState(): { depositId: string; isActive: boolean } | null;
}

export interface EcsHarvestDelegate {
	start(entityId: string, depositId: string, capacity?: number): boolean;
	stop(entityId: string): void;
	getState(entityId: string): { depositId: string; materialType: string; powderCollected: number } | null;
}

// ---------------------------------------------------------------------------
// Public API — Initialization
// ---------------------------------------------------------------------------

/**
 * Register harvest delegates. Call once during game initialization.
 * This avoids circular imports — callers wire the delegates from outside.
 */
export function initHarvestUnifier(
	player: PlayerHarvestDelegate,
	ecs: EcsHarvestDelegate,
): void {
	playerDelegate = player;
	ecsDelegate = ecs;
}

// ---------------------------------------------------------------------------
// Public API — Unified harvest operations
// ---------------------------------------------------------------------------

/**
 * Start harvesting a deposit. Automatically routes to the correct backend
 * based on whether the entity is player-controlled.
 *
 * @returns true if harvesting started
 */
export function startUnifiedHarvest(request: HarvestRequest): boolean {
	const range = request.harvestRange ?? 3.0;

	if (request.isPlayerControlled) {
		if (!playerDelegate) return false;
		const depPos = { ...request.depositPosition };
		const started = playerDelegate.start(
			request.depositId,
			request.position,
			() => depPos,
			range,
		);
		if (started) {
			entityBackends.set(request.entityId, "player");
		}
		return started;
	}

	if (!ecsDelegate) return false;
	const started = ecsDelegate.start(
		request.entityId,
		request.depositId,
		request.powderCapacity,
	);
	if (started) {
		entityBackends.set(request.entityId, "ecs");
	}
	return started;
}

/**
 * Stop harvesting for an entity.
 */
export function stopUnifiedHarvest(entityId: string): void {
	const backend = entityBackends.get(entityId);
	if (!backend) return;

	if (backend === "player" && playerDelegate) {
		playerDelegate.stop();
	} else if (backend === "ecs" && ecsDelegate) {
		ecsDelegate.stop(entityId);
	}

	entityBackends.delete(entityId);
}

/**
 * Check if an entity is currently harvesting.
 */
export function isHarvesting(entityId: string): boolean {
	const backend = entityBackends.get(entityId);
	if (!backend) return false;

	if (backend === "player" && playerDelegate) {
		const state = playerDelegate.getState();
		return state !== null && state.isActive;
	}
	if (backend === "ecs" && ecsDelegate) {
		return ecsDelegate.getState(entityId) !== null;
	}
	return false;
}

/**
 * Get which backend an entity is using, or null if not harvesting.
 */
export function getBackend(entityId: string): "player" | "ecs" | null {
	return entityBackends.get(entityId) ?? null;
}

/**
 * Get all entity IDs currently harvesting.
 */
export function getActiveHarvesters(): string[] {
	return Array.from(entityBackends.keys());
}

/**
 * Drain any pending harvest results from the last update cycle.
 */
export function drainResults(): UnifiedHarvestResult[] {
	const results = [...pendingResults];
	pendingResults.length = 0;
	return results;
}

/**
 * Push a result manually (used by the game loop bridge when either
 * backend produces output).
 */
export function pushResult(result: UnifiedHarvestResult): void {
	pendingResults.push(result);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all unifier state. For testing and new game init.
 */
export function reset(): void {
	entityBackends.clear();
	pendingResults.length = 0;
	playerDelegate = null;
	ecsDelegate = null;
}
