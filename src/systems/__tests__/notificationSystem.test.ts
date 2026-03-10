/**
 * Tests for the notification system.
 *
 * Tests cover:
 * - Event bus integration: game events create notifications
 * - Notification types match event severity (danger, success, info, etc.)
 * - Custom notifications via addNotification
 * - getUnreadNotifications / markRead / dismissAll
 * - Auto-dismiss by duration (notificationSystem tick)
 * - Max notifications cap (oldest auto-removed)
 * - reset clears all state and unsubscribes from event bus
 * - Duration 0 means never auto-dismiss
 * - Multiple events create multiple notifications
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	emit,
	reset as resetEventBus,
} from "../eventBus";
import {
	addNotification,
	dismissAll,
	getAllNotifications,
	getMaxNotifications,
	getUnreadNotifications,
	initNotificationSystem,
	markRead,
	notificationSystem,
	reset as resetNotifications,
	setMaxNotifications,
} from "../notificationSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetEventBus();
	resetNotifications();
	initNotificationSystem();
});

// ---------------------------------------------------------------------------
// Event bus integration
// ---------------------------------------------------------------------------

describe("notificationSystem — event bus integration", () => {
	it("creates a notification when combat_kill is emitted", () => {
		emit({
			type: "combat_kill",
			attackerId: "bot_1",
			targetId: "bot_2",
			weaponType: "harvester",
			tick: 100,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("danger");
		expect(notifs[0].title).toBe("Unit Destroyed");
		expect(notifs[0].timestamp).toBe(100);
	});

	it("creates a notification when quest_complete is emitted", () => {
		emit({
			type: "quest_complete",
			questId: "q_intro",
			rewardItems: ["grabber", "conveyor"],
			tick: 200,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("quest");
		expect(notifs[0].message).toContain("q_intro");
		expect(notifs[0].message).toContain("grabber");
	});

	it("creates a notification when resource_gathered is emitted", () => {
		emit({
			type: "resource_gathered",
			resourceType: "iron",
			amount: 25,
			sourceId: "vein_3",
			tick: 50,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("info");
		expect(notifs[0].message).toContain("25");
		expect(notifs[0].message).toContain("iron");
	});

	it("creates a notification when building_placed is emitted", () => {
		emit({
			type: "building_placed",
			buildingType: "furnace",
			buildingId: "f_1",
			position: { x: 10, y: 0, z: 5 },
			tick: 300,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("success");
		expect(notifs[0].title).toBe("Building Placed");
	});

	it("creates a notification when cube_stolen is emitted", () => {
		emit({
			type: "cube_stolen",
			cubeId: "cube_1",
			thiefFactionId: "volt_collective",
			victimFactionId: "player",
			materialType: "copper",
			tick: 400,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("danger");
		expect(notifs[0].message).toContain("volt_collective");
		expect(notifs[0].message).toContain("copper");
	});

	it("creates a notification when storm_strike is emitted", () => {
		emit({
			type: "storm_strike",
			position: { x: 1, y: 2, z: 3 },
			damage: 50,
			tick: 500,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("warning");
		expect(notifs[0].message).toContain("50");
	});

	it("creates a notification when diplomacy_changed is emitted", () => {
		emit({
			type: "diplomacy_changed",
			factionA: "player",
			factionB: "iron_creed",
			previousStance: "neutral",
			newStance: "hostile",
			tick: 600,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("warning");
		expect(notifs[0].message).toContain("neutral");
		expect(notifs[0].message).toContain("hostile");
	});

	it("creates a notification when discovery_found is emitted", () => {
		emit({
			type: "discovery_found",
			discoveryId: "ruin_1",
			discoveryType: "ancient_ruin",
			position: { x: 20, y: 0, z: 30 },
			tick: 700,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("info");
		expect(notifs[0].message).toContain("ancient_ruin");
	});

	it("creates a notification when tech_researched is emitted", () => {
		emit({
			type: "tech_researched",
			techId: "advanced_smelting",
			tier: 2,
			tick: 800,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("success");
		expect(notifs[0].message).toContain("advanced_smelting");
		expect(notifs[0].message).toContain("tier 2");
	});

	it("creates a notification when territory_claimed is emitted", () => {
		emit({
			type: "territory_claimed",
			territoryId: "zone_7",
			factionId: "reclaimers",
			tick: 900,
		});

		const notifs = getAllNotifications();
		expect(notifs).toHaveLength(1);
		expect(notifs[0].type).toBe("success");
		expect(notifs[0].message).toContain("reclaimers");
	});

	it("multiple events create multiple notifications", () => {
		emit({
			type: "combat_kill",
			attackerId: "a",
			targetId: "b",
			weaponType: "laser",
			tick: 1,
		});
		emit({
			type: "resource_gathered",
			resourceType: "iron",
			amount: 5,
			sourceId: "v1",
			tick: 2,
		});
		emit({
			type: "building_placed",
			buildingType: "turret",
			buildingId: "t1",
			position: { x: 0, y: 0, z: 0 },
			tick: 3,
		});

		expect(getAllNotifications()).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Custom notifications
// ---------------------------------------------------------------------------

describe("notificationSystem — addNotification", () => {
	it("adds a custom notification", () => {
		const notif = addNotification("info", "Test Title", "Test message", 100, 200);

		expect(notif.id).toMatch(/^notif_/);
		expect(notif.type).toBe("info");
		expect(notif.title).toBe("Test Title");
		expect(notif.message).toBe("Test message");
		expect(notif.timestamp).toBe(100);
		expect(notif.duration).toBe(200);
		expect(notif.read).toBe(false);
	});

	it("uses default duration of 300 when not specified", () => {
		const notif = addNotification("success", "Title", "Msg", 50);
		expect(notif.duration).toBe(300);
	});

	it("appears in getAllNotifications", () => {
		addNotification("warning", "Alert", "Something happened", 10);
		expect(getAllNotifications()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Read tracking
// ---------------------------------------------------------------------------

describe("notificationSystem — read tracking", () => {
	it("new notifications are unread by default", () => {
		addNotification("info", "T", "M", 1);
		const unread = getUnreadNotifications();
		expect(unread).toHaveLength(1);
		expect(unread[0].read).toBe(false);
	});

	it("markRead marks a notification as read", () => {
		const notif = addNotification("info", "T", "M", 1);
		const result = markRead(notif.id);

		expect(result).toBe(true);
		expect(getUnreadNotifications()).toHaveLength(0);
		expect(getAllNotifications()[0].read).toBe(true);
	});

	it("markRead returns false for non-existent id", () => {
		expect(markRead("nonexistent")).toBe(false);
	});

	it("getUnreadNotifications excludes read notifications", () => {
		const n1 = addNotification("info", "T1", "M1", 1);
		addNotification("info", "T2", "M2", 2);

		markRead(n1.id);

		const unread = getUnreadNotifications();
		expect(unread).toHaveLength(1);
		expect(unread[0].title).toBe("T2");
	});
});

// ---------------------------------------------------------------------------
// dismissAll
// ---------------------------------------------------------------------------

describe("notificationSystem — dismissAll", () => {
	it("removes all notifications", () => {
		addNotification("info", "T1", "M1", 1);
		addNotification("danger", "T2", "M2", 2);
		addNotification("success", "T3", "M3", 3);

		dismissAll();

		expect(getAllNotifications()).toHaveLength(0);
		expect(getUnreadNotifications()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Auto-dismiss
// ---------------------------------------------------------------------------

describe("notificationSystem — auto-dismiss", () => {
	it("removes notifications whose duration has expired", () => {
		addNotification("info", "Short", "Goes away", 100, 50);

		// At tick 149, still alive (149 - 100 = 49 < 50).
		notificationSystem(149);
		expect(getAllNotifications()).toHaveLength(1);

		// At tick 150, expired (150 - 100 = 50, not < 50).
		notificationSystem(150);
		expect(getAllNotifications()).toHaveLength(0);
	});

	it("does not remove notifications with duration 0 (never auto-dismiss)", () => {
		addNotification("info", "Permanent", "Stays forever", 100, 0);

		notificationSystem(10000);
		expect(getAllNotifications()).toHaveLength(1);
	});

	it("only removes expired notifications, keeps others", () => {
		addNotification("info", "Short", "Expires soon", 100, 50);
		addNotification("info", "Long", "Stays longer", 100, 500);

		notificationSystem(200);

		const remaining = getAllNotifications();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].title).toBe("Long");
	});

	it("handles multiple expirations at different ticks", () => {
		addNotification("info", "A", "M", 100, 50);   // expires at 150
		addNotification("info", "B", "M", 120, 50);   // expires at 170
		addNotification("info", "C", "M", 150, 50);   // expires at 200

		notificationSystem(160);
		expect(getAllNotifications()).toHaveLength(2); // A expired, B and C remain

		notificationSystem(175);
		expect(getAllNotifications()).toHaveLength(1); // B expired, C remains

		notificationSystem(200);
		expect(getAllNotifications()).toHaveLength(0); // C expired
	});
});

// ---------------------------------------------------------------------------
// Max notifications cap
// ---------------------------------------------------------------------------

describe("notificationSystem — max notifications", () => {
	it("default max is 50", () => {
		expect(getMaxNotifications()).toBe(50);
	});

	it("trims oldest notifications when cap exceeded", () => {
		setMaxNotifications(3);

		addNotification("info", "N1", "M1", 1);
		addNotification("info", "N2", "M2", 2);
		addNotification("info", "N3", "M3", 3);
		addNotification("info", "N4", "M4", 4);

		const all = getAllNotifications();
		expect(all).toHaveLength(3);
		// Oldest (N1) should have been removed.
		expect(all[0].title).toBe("N2");
		expect(all[2].title).toBe("N4");
	});

	it("setMaxNotifications trims existing notifications", () => {
		for (let i = 0; i < 10; i++) {
			addNotification("info", `N${i}`, `M${i}`, i);
		}

		setMaxNotifications(3);
		expect(getAllNotifications()).toHaveLength(3);
	});

	it("setMaxNotifications enforces minimum of 1", () => {
		setMaxNotifications(0);
		expect(getMaxNotifications()).toBe(1);

		setMaxNotifications(-10);
		expect(getMaxNotifications()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Notification IDs
// ---------------------------------------------------------------------------

describe("notificationSystem — unique IDs", () => {
	it("each notification has a unique ID", () => {
		const n1 = addNotification("info", "T1", "M1", 1);
		const n2 = addNotification("info", "T2", "M2", 2);
		const n3 = addNotification("info", "T3", "M3", 3);

		expect(n1.id).not.toBe(n2.id);
		expect(n2.id).not.toBe(n3.id);
		expect(n1.id).not.toBe(n3.id);
	});

	it("IDs follow notif_N pattern", () => {
		const n = addNotification("info", "T", "M", 1);
		expect(n.id).toMatch(/^notif_\d+$/);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("notificationSystem — reset", () => {
	it("clears all notifications", () => {
		addNotification("info", "T", "M", 1);
		resetNotifications();
		expect(getAllNotifications()).toHaveLength(0);
	});

	it("resets max notifications to 50", () => {
		setMaxNotifications(5);
		resetNotifications();
		expect(getMaxNotifications()).toBe(50);
	});

	it("unsubscribes from event bus so new events do not create notifications", () => {
		resetNotifications();

		emit({
			type: "combat_kill",
			attackerId: "a",
			targetId: "b",
			weaponType: "laser",
			tick: 1,
		});

		expect(getAllNotifications()).toHaveLength(0);
	});

	it("initNotificationSystem re-subscribes after reset", () => {
		resetNotifications();
		initNotificationSystem();

		emit({
			type: "combat_kill",
			attackerId: "a",
			targetId: "b",
			weaponType: "laser",
			tick: 1,
		});

		expect(getAllNotifications()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("notificationSystem — edge cases", () => {
	it("initNotificationSystem is idempotent (no duplicate listeners)", () => {
		initNotificationSystem();
		initNotificationSystem();

		emit({
			type: "combat_kill",
			attackerId: "a",
			targetId: "b",
			weaponType: "laser",
			tick: 1,
		});

		// Should be exactly 1, not 3 (init was called in beforeEach + 2 more).
		expect(getAllNotifications()).toHaveLength(1);
	});

	it("notification message contains event-specific details", () => {
		emit({
			type: "cube_stolen",
			cubeId: "c99",
			thiefFactionId: "signal_choir",
			victimFactionId: "player",
			materialType: "titanium",
			tick: 42,
		});

		const notif = getAllNotifications()[0];
		expect(notif.message).toContain("signal_choir");
		expect(notif.message).toContain("titanium");
		expect(notif.message).toContain("player");
	});
});
