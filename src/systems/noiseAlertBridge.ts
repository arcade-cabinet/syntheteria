/**
 * Noise-to-AI alerting bridge — connects noise propagation to AI behavior.
 *
 * Paper playtesting found that noiseAttraction generates noise events and
 * lists attracted enemies, but nothing converts those alerts into AI actions.
 * This bridge polls noise events each tick, checks which AI listeners are
 * alerted, and queues investigation orders for the AI command system.
 *
 * Alert flow:
 *   noiseAttraction.emitNoise() → noiseAlertBridge.processAlerts()
 *     → generates InvestigationOrder for each alerted AI entity
 *     → tracks alert history per faction (for aggression escalation)
 *     → emits alert events for HUD minimap blips
 *
 * Integration points:
 *   - noiseAttraction: getActiveNoiseEvents(), getListenersInRange()
 *   - aiPeacePeriod: forcePhase() if player detected during peace
 *   - botCommand: investigation orders queued for AI units
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** An investigation order generated when an AI entity hears noise. */
export interface InvestigationOrder {
	orderId: string;
	entityId: string;
	faction: string;
	targetPosition: Vec3;
	noiseLevel: number;
	noiseType: string;
	sourceEntityId: string;
	issuedAt: number;
	priority: number;
	status: "pending" | "active" | "completed" | "expired";
}

/** Alert history entry for tracking faction alertness. */
export interface FactionAlertHistory {
	factionId: string;
	totalAlerts: number;
	recentAlerts: number;
	alertDecayTimer: number;
	alertLevel: "calm" | "suspicious" | "alert" | "hostile";
	lastAlertTime: number;
	investigationsLaunched: number;
}

/** Result of processing alerts for one tick. */
export interface AlertProcessingResult {
	newOrders: InvestigationOrder[];
	factionAlertChanges: Array<{
		factionId: string;
		previousLevel: string;
		newLevel: string;
	}>;
	expiredOrders: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum noise level to generate an investigation order. */
const ALERT_THRESHOLD = 0.15;

/** How long an order stays valid before expiring (seconds). */
const ORDER_EXPIRY = 30;

/** Recent alerts decay by 1 every N seconds. */
const ALERT_DECAY_INTERVAL = 60;

/** Alert level thresholds based on recent alerts count. */
const ALERT_LEVEL_THRESHOLDS = {
	suspicious: 2,
	alert: 5,
	hostile: 10,
};

/** Priority scaling: higher noise = higher priority order. */
const PRIORITY_SCALE = 10;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const pendingOrders = new Map<string, InvestigationOrder>();
const factionAlerts = new Map<string, FactionAlertHistory>();
let nextOrderId = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distance3d(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeAlertLevel(recentAlerts: number): FactionAlertHistory["alertLevel"] {
	if (recentAlerts >= ALERT_LEVEL_THRESHOLDS.hostile) return "hostile";
	if (recentAlerts >= ALERT_LEVEL_THRESHOLDS.alert) return "alert";
	if (recentAlerts >= ALERT_LEVEL_THRESHOLDS.suspicious) return "suspicious";
	return "calm";
}

function getOrCreateFactionAlert(factionId: string): FactionAlertHistory {
	let history = factionAlerts.get(factionId);
	if (!history) {
		history = {
			factionId,
			totalAlerts: 0,
			recentAlerts: 0,
			alertDecayTimer: 0,
			alertLevel: "calm",
			lastAlertTime: -Infinity,
			investigationsLaunched: 0,
		};
		factionAlerts.set(factionId, history);
	}
	return history;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process noise alerts for one tick.
 *
 * Takes active noise events and listener positions (from noiseAttraction),
 * determines which listeners are alerted, generates investigation orders,
 * and updates faction alert levels.
 *
 * @param noiseEvents - Active noise events from noiseAttraction
 * @param listeners - AI listeners with positions and hearing ranges
 * @param currentTime - Current game time in seconds
 * @returns Processing results with new orders and alert level changes
 */
export function processAlerts(
	noiseEvents: Array<{
		id: string;
		sourceId: string;
		position: Vec3;
		noiseLevel: number;
		noiseRadius: number;
		type: string;
	}>,
	listeners: Array<{
		entityId: string;
		position: Vec3;
		hearingRange: number;
		faction: string;
	}>,
	currentTime: number,
): AlertProcessingResult {
	const newOrders: InvestigationOrder[] = [];
	const factionChanges: AlertProcessingResult["factionAlertChanges"] = [];

	// For each noise event, check which listeners are in range and above threshold
	for (const noise of noiseEvents) {
		for (const listener of listeners) {
			// Don't alert entities about their own noise
			if (listener.entityId === noise.sourceId) continue;

			const dist = distance3d(noise.position, listener.position);
			const effectiveRange = Math.min(noise.noiseRadius, listener.hearingRange);

			if (dist > effectiveRange) continue;

			// Calculate perceived noise level with distance falloff
			const ratio = dist / effectiveRange;
			const perceivedLevel = noise.noiseLevel * (1 - ratio * ratio);

			if (perceivedLevel < ALERT_THRESHOLD) continue;

			// Check if this entity already has a pending order for a nearby position
			const hasSimilarOrder = Array.from(pendingOrders.values()).some(
				(o) =>
					o.entityId === listener.entityId &&
					o.status === "pending" &&
					distance3d(o.targetPosition, noise.position) < 5,
			);
			if (hasSimilarOrder) continue;

			// Generate investigation order
			const orderId = `alert_${nextOrderId++}`;
			const order: InvestigationOrder = {
				orderId,
				entityId: listener.entityId,
				faction: listener.faction,
				targetPosition: { ...noise.position },
				noiseLevel: perceivedLevel,
				noiseType: noise.type,
				sourceEntityId: noise.sourceId,
				issuedAt: currentTime,
				priority: Math.round(perceivedLevel * PRIORITY_SCALE),
				status: "pending",
			};

			pendingOrders.set(orderId, order);
			newOrders.push(order);

			// Update faction alert history
			const history = getOrCreateFactionAlert(listener.faction);
			const previousLevel = history.alertLevel;
			history.totalAlerts++;
			history.recentAlerts++;
			history.lastAlertTime = currentTime;
			history.investigationsLaunched++;
			history.alertLevel = computeAlertLevel(history.recentAlerts);

			if (history.alertLevel !== previousLevel) {
				factionChanges.push({
					factionId: listener.faction,
					previousLevel,
					newLevel: history.alertLevel,
				});
			}
		}
	}

	// Expire old orders
	let expiredCount = 0;
	for (const [id, order] of pendingOrders) {
		if (
			order.status === "pending" &&
			currentTime - order.issuedAt > ORDER_EXPIRY
		) {
			order.status = "expired";
			pendingOrders.delete(id);
			expiredCount++;
		}
	}

	// Decay recent alerts
	for (const history of factionAlerts.values()) {
		history.alertDecayTimer += 1; // Assumes 1-second ticks; adjust if needed
		if (history.alertDecayTimer >= ALERT_DECAY_INTERVAL) {
			const previousLevel = history.alertLevel;
			history.recentAlerts = Math.max(0, history.recentAlerts - 1);
			history.alertDecayTimer = 0;
			history.alertLevel = computeAlertLevel(history.recentAlerts);

			if (history.alertLevel !== previousLevel) {
				factionChanges.push({
					factionId: history.factionId,
					previousLevel,
					newLevel: history.alertLevel,
				});
			}
		}
	}

	return { newOrders, factionAlertChanges: factionChanges, expiredOrders: expiredCount };
}

/**
 * Get all pending investigation orders for a specific entity.
 */
export function getOrdersForEntity(entityId: string): InvestigationOrder[] {
	return Array.from(pendingOrders.values()).filter(
		(o) => o.entityId === entityId && o.status === "pending",
	);
}

/**
 * Get all pending orders for a faction, sorted by priority (highest first).
 */
export function getOrdersForFaction(faction: string): InvestigationOrder[] {
	return Array.from(pendingOrders.values())
		.filter((o) => o.faction === faction && o.status === "pending")
		.sort((a, b) => b.priority - a.priority);
}

/**
 * Mark an order as actively being investigated.
 */
export function markOrderActive(orderId: string): boolean {
	const order = pendingOrders.get(orderId);
	if (!order || order.status !== "pending") return false;
	order.status = "active";
	return true;
}

/**
 * Mark an order as completed (investigation finished).
 */
export function markOrderCompleted(orderId: string): boolean {
	const order = pendingOrders.get(orderId);
	if (!order) return false;
	order.status = "completed";
	pendingOrders.delete(orderId);
	return true;
}

/**
 * Get the alert history for a specific faction.
 */
export function getFactionAlertHistory(factionId: string): FactionAlertHistory | null {
	const history = factionAlerts.get(factionId);
	return history ? { ...history } : null;
}

/**
 * Get the current alert level for a faction.
 */
export function getFactionAlertLevel(factionId: string): FactionAlertHistory["alertLevel"] {
	const history = factionAlerts.get(factionId);
	return history ? history.alertLevel : "calm";
}

/**
 * Get all faction alert histories.
 */
export function getAllFactionAlerts(): FactionAlertHistory[] {
	return Array.from(factionAlerts.values()).map((h) => ({ ...h }));
}

/**
 * Get total pending order count across all factions.
 */
export function getPendingOrderCount(): number {
	return Array.from(pendingOrders.values()).filter(
		(o) => o.status === "pending",
	).length;
}

/**
 * Reset all state. For testing.
 */
export function reset(): void {
	pendingOrders.clear();
	factionAlerts.clear();
	nextOrderId = 0;
}
