/**
 * Player-facing notification system.
 *
 * Subscribes to the event bus for significant game events and creates
 * human-readable notifications with auto-dismiss, read tracking, and
 * a capped storage buffer.
 *
 * All notifications are stored in memory. The notificationSystem tick
 * function handles auto-dismiss based on duration and current tick.
 */

import {
	type GameEvent,
	type GameEventType,
	subscribe,
} from "./eventBus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = "info" | "warning" | "danger" | "success" | "quest";

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	timestamp: number; // tick when created
	read: boolean;
	duration: number; // auto-dismiss after N ticks (0 = never)
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let notifications: Notification[] = [];
let nextNotificationId = 0;
let maxNotifications = 50;
const unsubscribers: (() => void)[] = [];

// ---------------------------------------------------------------------------
// Event-to-notification mapping
// ---------------------------------------------------------------------------

interface NotificationTemplate {
	type: NotificationType;
	title: string;
	message: (event: GameEvent) => string;
	duration: number;
}

const EVENT_TEMPLATES: Partial<Record<GameEventType, NotificationTemplate>> = {
	combat_kill: {
		type: "danger",
		title: "Unit Destroyed",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "combat_kill" }>;
			return `Target ${ev.targetId} was destroyed by ${ev.attackerId} using ${ev.weaponType}.`;
		},
		duration: 300,
	},
	quest_complete: {
		type: "quest",
		title: "Quest Complete",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "quest_complete" }>;
			return `Quest ${ev.questId} completed! Rewards: ${ev.rewardItems.join(", ")}.`;
		},
		duration: 600,
	},
	resource_gathered: {
		type: "info",
		title: "Resource Gathered",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "resource_gathered" }>;
			return `Gathered ${ev.amount} ${ev.resourceType} from ${ev.sourceId}.`;
		},
		duration: 150,
	},
	building_placed: {
		type: "success",
		title: "Building Placed",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "building_placed" }>;
			return `${ev.buildingType} placed at (${ev.position.x}, ${ev.position.y}, ${ev.position.z}).`;
		},
		duration: 300,
	},
	tech_researched: {
		type: "success",
		title: "Technology Researched",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "tech_researched" }>;
			return `Researched ${ev.techId} (tier ${ev.tier}).`;
		},
		duration: 600,
	},
	territory_claimed: {
		type: "success",
		title: "Territory Claimed",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "territory_claimed" }>;
			return `Faction ${ev.factionId} claimed territory ${ev.territoryId}.`;
		},
		duration: 300,
	},
	cube_stolen: {
		type: "danger",
		title: "Cube Stolen!",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "cube_stolen" }>;
			return `${ev.materialType} cube stolen by ${ev.thiefFactionId} from ${ev.victimFactionId}!`;
		},
		duration: 450,
	},
	storm_strike: {
		type: "warning",
		title: "Lightning Strike",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "storm_strike" }>;
			return `Lightning struck at (${ev.position.x}, ${ev.position.y}, ${ev.position.z}) dealing ${ev.damage} damage.`;
		},
		duration: 300,
	},
	diplomacy_changed: {
		type: "warning",
		title: "Diplomacy Shift",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "diplomacy_changed" }>;
			return `Relations between ${ev.factionA} and ${ev.factionB} shifted from ${ev.previousStance} to ${ev.newStance}.`;
		},
		duration: 450,
	},
	discovery_found: {
		type: "info",
		title: "Discovery!",
		message: (e) => {
			const ev = e as Extract<GameEvent, { type: "discovery_found" }>;
			return `Found ${ev.discoveryType} (${ev.discoveryId}) at (${ev.position.x}, ${ev.position.y}, ${ev.position.z}).`;
		},
		duration: 300,
	},
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createNotification(
	type: NotificationType,
	title: string,
	message: string,
	timestamp: number,
	duration: number,
): Notification {
	const id = `notif_${nextNotificationId++}`;
	const notif: Notification = {
		id,
		type,
		title,
		message,
		timestamp,
		read: false,
		duration,
	};

	notifications.push(notif);

	// Trim to max.
	if (notifications.length > maxNotifications) {
		notifications = notifications.slice(notifications.length - maxNotifications);
	}

	return notif;
}

function handleGameEvent(event: GameEvent): void {
	const template = EVENT_TEMPLATES[event.type];
	if (!template) return;

	createNotification(
		template.type,
		template.title,
		template.message(event),
		event.tick,
		template.duration,
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the notification system by subscribing to all mapped event types.
 * Safe to call multiple times — previous subscriptions are cleaned up first.
 */
export function initNotificationSystem(): void {
	// Clean up any previous subscriptions.
	for (const unsub of unsubscribers) {
		unsub();
	}
	unsubscribers.length = 0;

	for (const eventType of Object.keys(EVENT_TEMPLATES) as GameEventType[]) {
		const unsub = subscribe(eventType, handleGameEvent);
		unsubscribers.push(unsub);
	}
}

/**
 * Add a custom notification directly (not from event bus).
 */
export function addNotification(
	type: NotificationType,
	title: string,
	message: string,
	timestamp: number,
	duration = 300,
): Notification {
	return createNotification(type, title, message, timestamp, duration);
}

/**
 * Get all notifications (read and unread).
 */
export function getAllNotifications(): Notification[] {
	return [...notifications];
}

/**
 * Get unread notifications only.
 */
export function getUnreadNotifications(): Notification[] {
	return notifications.filter((n) => !n.read);
}

/**
 * Mark a notification as read.
 * Returns true if the notification was found and marked.
 */
export function markRead(id: string): boolean {
	const notif = notifications.find((n) => n.id === id);
	if (!notif) return false;
	notif.read = true;
	return true;
}

/**
 * Dismiss all notifications (removes them entirely).
 */
export function dismissAll(): void {
	notifications = [];
}

/**
 * Set maximum stored notifications.
 */
export function setMaxNotifications(max: number): void {
	maxNotifications = Math.max(1, max);
	if (notifications.length > maxNotifications) {
		notifications = notifications.slice(notifications.length - maxNotifications);
	}
}

/**
 * Get current max notifications setting.
 */
export function getMaxNotifications(): number {
	return maxNotifications;
}

/**
 * Process auto-dismiss: remove notifications whose duration has expired.
 * Called once per simulation tick.
 *
 * @param currentTick - The current game tick.
 */
export function notificationSystem(currentTick: number): void {
	notifications = notifications.filter((n) => {
		if (n.duration <= 0) return true; // duration 0 = never auto-dismiss
		return currentTick - n.timestamp < n.duration;
	});
}

/**
 * Clear all notification state and unsubscribe from the event bus.
 * Primarily for testing.
 */
export function reset(): void {
	for (const unsub of unsubscribers) {
		unsub();
	}
	unsubscribers.length = 0;
	notifications = [];
	nextNotificationId = 0;
	maxNotifications = 50;
}
