/**
 * BaseAgent — autonomous settlement agent with local event bus and work queues.
 *
 * Each settlement (starting base + outposts) gets a BaseAgent instance.
 * Every tick, the BaseAgent scans local state (nearby deposits, threats,
 * build orders, furnace status) and populates its work queue with tasks.
 * Bots "phone home" to their nearest Base and claim tasks from the queue.
 *
 * Architecture (Colonization model):
 *   Home Planet Patron (strategic priorities, occasional)
 *     └── BaseAgent (operational, per-settlement, continuous)
 *          ├── Harvest tasks (for nearby ore deposits)
 *          ├── Transport tasks (cubes to furnace, products to stockpile)
 *          ├── Build tasks (walls, machines, outposts)
 *          ├── Defense tasks (intercept threats)
 *          ├── Patrol tasks (always present as fallback — NO BOT EVER IDLES)
 *          └── Bots subscribe to events, claim tasks from work queue
 *
 * The BaseAgent has its own local event bus (separate from the global eventBus)
 * so multiple bases operate independently without event leakage.
 */

import type { Vec3 } from "../../ecs/types.ts";
import { BaseWorkQueue, TaskCategory, TaskPriority } from "./BaseWorkQueue.ts";

// ---------------------------------------------------------------------------
// Base event types
// ---------------------------------------------------------------------------

export const BaseEventType = {
	HARVEST_NEEDED: "harvest_needed",
	TRANSPORT_NEEDED: "transport_needed",
	BUILD_QUEUED: "build_queued",
	DEFENSE_ALERT: "defense_alert",
	FURNACE_READY: "furnace_ready",
	PATROL_ROUTE: "patrol_route",
	CUBE_REQUEST: "cube_request",
} as const;
export type BaseEventType = (typeof BaseEventType)[keyof typeof BaseEventType];

export interface BaseEvent {
	type: BaseEventType;
	baseId: string;
	tick: number;
	data?: Record<string, unknown>;
}

type BaseEventCallback = (event: BaseEvent) => void;

// ---------------------------------------------------------------------------
// Local state snapshot — provided by the system layer each tick
// ---------------------------------------------------------------------------

export interface NearbyDeposit {
	depositId: string;
	position: Vec3;
	oreType: string;
	remainingYield: number;
}

export interface NearbyThreat {
	entityId: string;
	position: Vec3;
	threatLevel: number;
}

export interface BuildOrder {
	buildingType: string;
	position: Vec3;
}

/**
 * Snapshot of the local world state around a Base.
 * Provided by the system layer each tick.
 */
export interface BaseLocalState {
	baseId: string;
	factionId: string;
	position: Vec3;
	cubeStockpile: number;
	nearbyDeposits: NearbyDeposit[];
	nearbyThreats: NearbyThreat[];
	idleBotIds: string[];
	assignedBotIds: string[];
	pendingBuildOrders: BuildOrder[];
	furnaceReady: boolean;
	patrolRadius: number;
}

// ---------------------------------------------------------------------------
// BaseAgent
// ---------------------------------------------------------------------------

/** Counter for unique task IDs */
let taskIdCounter = 0;

function nextTaskId(prefix: string): string {
	return `${prefix}_${++taskIdCounter}`;
}

export class BaseAgent {
	readonly baseId: string;
	readonly factionId: string;
	readonly position: Vec3;

	/** Work queue — bots claim tasks from here */
	readonly workQueue: BaseWorkQueue;

	/** Local event bus listeners */
	private listeners: Map<BaseEventType, BaseEventCallback[]> = new Map();

	/** Internal tick counter */
	private tickCount = 0;

	constructor(baseId: string, factionId: string, position: Vec3) {
		this.baseId = baseId;
		this.factionId = factionId;
		this.position = { ...position };
		this.workQueue = new BaseWorkQueue();
	}

	// -----------------------------------------------------------------------
	// Local event bus
	// -----------------------------------------------------------------------

	/**
	 * Subscribe to a local base event.
	 * @returns Unsubscribe function
	 */
	on(eventType: BaseEventType, callback: BaseEventCallback): () => void {
		let bucket = this.listeners.get(eventType);
		if (!bucket) {
			bucket = [];
			this.listeners.set(eventType, bucket);
		}
		bucket.push(callback);

		return () => {
			const b = this.listeners.get(eventType);
			if (b) {
				const idx = b.indexOf(callback);
				if (idx !== -1) b.splice(idx, 1);
			}
		};
	}

	/** Emit a local event to all subscribed listeners */
	private emit(event: BaseEvent): void {
		const bucket = this.listeners.get(event.type);
		if (!bucket) return;
		for (const cb of [...bucket]) {
			cb(event);
		}
	}

	// -----------------------------------------------------------------------
	// Tick — scan state, populate work queue, emit events
	// -----------------------------------------------------------------------

	/**
	 * Main update. Called once per game tick.
	 * Scans the local state snapshot and populates the work queue.
	 */
	tick(state: BaseLocalState): void {
		this.tickCount++;

		// Advance work queue expiry timer
		this.workQueue.tick(1);

		// Clear old pending tasks (they'll be regenerated from current state)
		this.clearPendingTasks();

		// Scan state and generate tasks + events
		this.scanDeposits(state);
		this.scanThreats(state);
		this.scanBuildOrders(state);
		this.scanFurnace(state);

		// GUARANTEED FALLBACK: always add patrol tasks so no bot ever idles
		this.addPatrolTasks(state);
	}

	// -----------------------------------------------------------------------
	// State scanners — generate tasks and emit events
	// -----------------------------------------------------------------------

	private scanDeposits(state: BaseLocalState): void {
		for (const deposit of state.nearbyDeposits) {
			if (deposit.remainingYield <= 0) continue;

			this.workQueue.add({
				id: nextTaskId("harvest"),
				category: TaskCategory.HARVEST,
				priority: TaskPriority.NORMAL,
				targetId: deposit.depositId,
				position: deposit.position,
				data: { oreType: deposit.oreType },
			});

			this.emit({
				type: BaseEventType.HARVEST_NEEDED,
				baseId: this.baseId,
				tick: this.tickCount,
				data: { depositId: deposit.depositId, oreType: deposit.oreType },
			});
		}
	}

	private scanThreats(state: BaseLocalState): void {
		for (const threat of state.nearbyThreats) {
			// Defense tasks are urgent
			this.workQueue.add({
				id: nextTaskId("defense"),
				category: TaskCategory.DEFENSE,
				priority: TaskPriority.URGENT,
				targetId: threat.entityId,
				position: threat.position,
				data: { threatLevel: threat.threatLevel },
			});

			this.emit({
				type: BaseEventType.DEFENSE_ALERT,
				baseId: this.baseId,
				tick: this.tickCount,
				data: { entityId: threat.entityId, threatLevel: threat.threatLevel },
			});
		}
	}

	private scanBuildOrders(state: BaseLocalState): void {
		for (const order of state.pendingBuildOrders) {
			this.workQueue.add({
				id: nextTaskId("build"),
				category: TaskCategory.BUILD,
				priority: TaskPriority.HIGH,
				position: order.position,
				data: { buildingType: order.buildingType },
			});

			this.emit({
				type: BaseEventType.BUILD_QUEUED,
				baseId: this.baseId,
				tick: this.tickCount,
				data: { buildingType: order.buildingType },
			});
		}
	}

	private scanFurnace(state: BaseLocalState): void {
		if (state.furnaceReady && state.cubeStockpile > 0) {
			this.workQueue.add({
				id: nextTaskId("transport"),
				category: TaskCategory.TRANSPORT,
				priority: TaskPriority.NORMAL,
				position: state.position,
				data: { cubeCount: state.cubeStockpile },
			});

			this.emit({
				type: BaseEventType.TRANSPORT_NEEDED,
				baseId: this.baseId,
				tick: this.tickCount,
			});
		}
	}

	private addPatrolTasks(state: BaseLocalState): void {
		// Always add patrol tasks as guaranteed fallback work
		const patrolAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

		for (let i = 0; i < patrolAngles.length; i++) {
			const angle = patrolAngles[i];
			const patrolPos: Vec3 = {
				x: state.position.x + Math.cos(angle) * state.patrolRadius * 0.7,
				y: state.position.y,
				z: state.position.z + Math.sin(angle) * state.patrolRadius * 0.7,
			};

			this.workQueue.add({
				id: nextTaskId("patrol"),
				category: TaskCategory.PATROL,
				priority: TaskPriority.LOW,
				position: patrolPos,
				data: { patrolRadius: state.patrolRadius },
			});
		}

		this.emit({
			type: BaseEventType.PATROL_ROUTE,
			baseId: this.baseId,
			tick: this.tickCount,
		});
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/**
	 * Clear only pending (unclaimed) tasks.
	 * Claimed tasks remain — the bot is still working on them.
	 */
	private clearPendingTasks(): void {
		this.workQueue.clearPending();
	}

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	/** Clear all state — work queue, listeners, counters */
	reset(): void {
		this.workQueue.clear();
		this.listeners.clear();
		this.tickCount = 0;
	}
}

/** Reset the global task ID counter (for testing) */
export function resetTaskIdCounter(): void {
	taskIdCounter = 0;
}
