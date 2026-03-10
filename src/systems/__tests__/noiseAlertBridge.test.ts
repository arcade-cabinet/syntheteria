import {
	processAlerts,
	getOrdersForEntity,
	getOrdersForFaction,
	markOrderActive,
	markOrderCompleted,
	getFactionAlertHistory,
	getFactionAlertLevel,
	getAllFactionAlerts,
	getPendingOrderCount,
	reset,
} from "../noiseAlertBridge";
import type { InvestigationOrder } from "../noiseAlertBridge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNoise(overrides: Record<string, unknown> = {}) {
	return {
		id: "noise_1",
		sourceId: "player",
		position: { x: 0, y: 0, z: 0 },
		noiseLevel: 0.5,
		noiseRadius: 30,
		type: "harvesting",
		...overrides,
	};
}

function makeListener(overrides: Record<string, unknown> = {}) {
	return {
		entityId: "enemy_1",
		position: { x: 10, y: 0, z: 0 },
		hearingRange: 50,
		faction: "volt_collective",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("noiseAlertBridge", () => {
	beforeEach(() => {
		reset();
	});

	// -----------------------------------------------------------------------
	// processAlerts — basic alert generation
	// -----------------------------------------------------------------------

	describe("processAlerts", () => {
		it("generates investigation order when listener hears noise above threshold", () => {
			const result = processAlerts(
				[makeNoise()],
				[makeListener()],
				0,
			);
			expect(result.newOrders).toHaveLength(1);
			expect(result.newOrders[0].entityId).toBe("enemy_1");
			expect(result.newOrders[0].faction).toBe("volt_collective");
			expect(result.newOrders[0].status).toBe("pending");
			expect(result.newOrders[0].noiseLevel).toBeGreaterThan(0);
		});

		it("does not alert entity about its own noise", () => {
			const result = processAlerts(
				[makeNoise({ sourceId: "enemy_1" })],
				[makeListener({ entityId: "enemy_1" })],
				0,
			);
			expect(result.newOrders).toHaveLength(0);
		});

		it("does not alert when listener is out of range", () => {
			const result = processAlerts(
				[makeNoise({ noiseRadius: 5 })],
				[makeListener({ position: { x: 100, y: 0, z: 0 } })],
				0,
			);
			expect(result.newOrders).toHaveLength(0);
		});

		it("does not alert when noise level is below threshold after falloff", () => {
			// Very weak noise, listener at edge of range
			const result = processAlerts(
				[makeNoise({ noiseLevel: 0.1, noiseRadius: 10 })],
				[makeListener({ position: { x: 9, y: 0, z: 0 }, hearingRange: 10 })],
				0,
			);
			// At distance 9 from radius 10: ratio=0.9, perceived=0.1*(1-0.81)=0.019
			// Below threshold 0.15
			expect(result.newOrders).toHaveLength(0);
		});

		it("handles multiple listeners for same noise", () => {
			const result = processAlerts(
				[makeNoise()],
				[
					makeListener({ entityId: "e1", position: { x: 5, y: 0, z: 0 } }),
					makeListener({ entityId: "e2", position: { x: 8, y: 0, z: 0 } }),
				],
				0,
			);
			expect(result.newOrders).toHaveLength(2);
			const ids = result.newOrders.map((o) => o.entityId).sort();
			expect(ids).toEqual(["e1", "e2"]);
		});

		it("handles multiple noise events for same listener", () => {
			const result = processAlerts(
				[
					makeNoise({ id: "n1", position: { x: 0, y: 0, z: 0 } }),
					makeNoise({ id: "n2", position: { x: 20, y: 0, z: 0 } }),
				],
				[makeListener({ position: { x: 10, y: 0, z: 0 } })],
				0,
			);
			// Both noises should generate orders since they're at different positions
			expect(result.newOrders).toHaveLength(2);
		});

		it("deduplicates orders for same entity at nearby positions", () => {
			// First call creates an order
			processAlerts(
				[makeNoise({ id: "n1", position: { x: 0, y: 0, z: 0 } })],
				[makeListener()],
				0,
			);
			// Second call with noise at very similar position should not create duplicate
			const result = processAlerts(
				[makeNoise({ id: "n2", position: { x: 1, y: 0, z: 0 } })],
				[makeListener()],
				1,
			);
			expect(result.newOrders).toHaveLength(0);
		});

		it("priority scales with noise level", () => {
			const result = processAlerts(
				[makeNoise({ noiseLevel: 1.0, noiseRadius: 100 })],
				[makeListener({ position: { x: 1, y: 0, z: 0 } })],
				0,
			);
			expect(result.newOrders[0].priority).toBeGreaterThan(5);
		});
	});

	// -----------------------------------------------------------------------
	// Order expiry
	// -----------------------------------------------------------------------

	describe("order expiry", () => {
		it("expires orders after 30 seconds", () => {
			processAlerts([makeNoise()], [makeListener()], 0);
			expect(getPendingOrderCount()).toBe(1);

			// Process at t=31 with no new noise
			const result = processAlerts([], [], 31);
			expect(result.expiredOrders).toBe(1);
			expect(getPendingOrderCount()).toBe(0);
		});

		it("does not expire active orders", () => {
			processAlerts([makeNoise()], [makeListener()], 0);
			const orders = getOrdersForEntity("enemy_1");
			markOrderActive(orders[0].orderId);

			// Process at t=31
			const result = processAlerts([], [], 31);
			expect(result.expiredOrders).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Faction alert levels
	// -----------------------------------------------------------------------

	describe("faction alert levels", () => {
		it("starts at calm", () => {
			expect(getFactionAlertLevel("volt_collective")).toBe("calm");
		});

		it("escalates to suspicious after 2 alerts", () => {
			processAlerts(
				[makeNoise({ id: "n1" })],
				[makeListener({ entityId: "e1", position: { x: 5, y: 0, z: 0 } })],
				0,
			);
			processAlerts(
				[makeNoise({ id: "n2", position: { x: 20, y: 0, z: 20 } })],
				[makeListener({ entityId: "e1", position: { x: 22, y: 0, z: 20 } })],
				1,
			);
			expect(getFactionAlertLevel("volt_collective")).toBe("suspicious");
		});

		it("escalates to alert after 5 alerts", () => {
			for (let i = 0; i < 5; i++) {
				processAlerts(
					[makeNoise({ id: `n${i}`, position: { x: i * 20, y: 0, z: 0 } })],
					[makeListener({ entityId: `e${i}`, position: { x: i * 20 + 2, y: 0, z: 0 } })],
					i,
				);
			}
			expect(getFactionAlertLevel("volt_collective")).toBe("alert");
		});

		it("escalates to hostile after 10 alerts", () => {
			for (let i = 0; i < 10; i++) {
				processAlerts(
					[makeNoise({ id: `n${i}`, position: { x: i * 20, y: 0, z: 0 } })],
					[makeListener({ entityId: `e${i}`, position: { x: i * 20 + 2, y: 0, z: 0 } })],
					i,
				);
			}
			expect(getFactionAlertLevel("volt_collective")).toBe("hostile");
		});

		it("reports alert level changes in result", () => {
			const r1 = processAlerts(
				[makeNoise({ id: "n1" })],
				[makeListener({ entityId: "e1", position: { x: 5, y: 0, z: 0 } })],
				0,
			);
			// First alert: calm → calm (need 2 for suspicious)
			expect(r1.factionAlertChanges).toHaveLength(0);

			const r2 = processAlerts(
				[makeNoise({ id: "n2", position: { x: 20, y: 0, z: 20 } })],
				[makeListener({ entityId: "e2", position: { x: 22, y: 0, z: 20 } })],
				1,
			);
			// Second alert: calm → suspicious
			expect(r2.factionAlertChanges).toHaveLength(1);
			expect(r2.factionAlertChanges[0].previousLevel).toBe("calm");
			expect(r2.factionAlertChanges[0].newLevel).toBe("suspicious");
		});

		it("tracks alert history per faction independently", () => {
			processAlerts(
				[makeNoise()],
				[
					makeListener({ entityId: "e1", faction: "volt_collective", position: { x: 5, y: 0, z: 0 } }),
					makeListener({ entityId: "e2", faction: "iron_creed", position: { x: 8, y: 0, z: 0 } }),
				],
				0,
			);
			const vcHistory = getFactionAlertHistory("volt_collective");
			const icHistory = getFactionAlertHistory("iron_creed");
			expect(vcHistory).not.toBeNull();
			expect(icHistory).not.toBeNull();
			expect(vcHistory!.totalAlerts).toBe(1);
			expect(icHistory!.totalAlerts).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Alert decay
	// -----------------------------------------------------------------------

	describe("alert decay", () => {
		it("decays recent alerts after decay interval", () => {
			// Create 3 alerts to reach suspicious
			for (let i = 0; i < 3; i++) {
				processAlerts(
					[makeNoise({ id: `n${i}`, position: { x: i * 20, y: 0, z: 0 } })],
					[makeListener({ entityId: `e${i}`, position: { x: i * 20 + 2, y: 0, z: 0 } })],
					i,
				);
			}
			expect(getFactionAlertLevel("volt_collective")).toBe("suspicious");

			// Run 60 empty ticks to trigger decay (1 per second interval)
			for (let t = 3; t < 63; t++) {
				processAlerts([], [], t);
			}

			const history = getFactionAlertHistory("volt_collective");
			expect(history!.recentAlerts).toBeLessThan(3);
		});
	});

	// -----------------------------------------------------------------------
	// Order management
	// -----------------------------------------------------------------------

	describe("order management", () => {
		it("getOrdersForEntity returns only matching entity orders", () => {
			processAlerts(
				[makeNoise()],
				[
					makeListener({ entityId: "e1", position: { x: 5, y: 0, z: 0 } }),
					makeListener({ entityId: "e2", position: { x: 8, y: 0, z: 0 } }),
				],
				0,
			);
			const orders = getOrdersForEntity("e1");
			expect(orders).toHaveLength(1);
			expect(orders[0].entityId).toBe("e1");
		});

		it("getOrdersForFaction returns orders sorted by priority", () => {
			processAlerts(
				[
					makeNoise({ id: "n1", noiseLevel: 0.3 }),
					makeNoise({ id: "n2", noiseLevel: 0.9, position: { x: 20, y: 0, z: 0 } }),
				],
				[makeListener({ entityId: "e1", position: { x: 10, y: 0, z: 0 } })],
				0,
			);
			const orders = getOrdersForFaction("volt_collective");
			if (orders.length >= 2) {
				expect(orders[0].priority).toBeGreaterThanOrEqual(orders[1].priority);
			}
		});

		it("markOrderActive transitions order status", () => {
			processAlerts([makeNoise()], [makeListener()], 0);
			const orders = getOrdersForEntity("enemy_1");
			expect(orders[0].status).toBe("pending");

			const result = markOrderActive(orders[0].orderId);
			expect(result).toBe(true);

			// Active orders don't appear in pending queries
			const pendingOrders = getOrdersForEntity("enemy_1");
			expect(pendingOrders).toHaveLength(0);
		});

		it("markOrderCompleted removes order", () => {
			processAlerts([makeNoise()], [makeListener()], 0);
			const orders = getOrdersForEntity("enemy_1");
			const completed = markOrderCompleted(orders[0].orderId);
			expect(completed).toBe(true);
			expect(getPendingOrderCount()).toBe(0);
		});

		it("markOrderActive returns false for nonexistent order", () => {
			expect(markOrderActive("nonexistent")).toBe(false);
		});

		it("markOrderCompleted returns false for nonexistent order", () => {
			expect(markOrderCompleted("nonexistent")).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// getAllFactionAlerts
	// -----------------------------------------------------------------------

	describe("getAllFactionAlerts", () => {
		it("returns all faction histories", () => {
			processAlerts(
				[makeNoise()],
				[
					makeListener({ entityId: "e1", faction: "vc", position: { x: 5, y: 0, z: 0 } }),
					makeListener({ entityId: "e2", faction: "ic", position: { x: 8, y: 0, z: 0 } }),
				],
				0,
			);
			const all = getAllFactionAlerts();
			expect(all).toHaveLength(2);
			const factions = all.map((a) => a.factionId).sort();
			expect(factions).toEqual(["ic", "vc"]);
		});

		it("returns empty array when no alerts processed", () => {
			expect(getAllFactionAlerts()).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe("edge cases", () => {
		it("handles empty noise events", () => {
			const result = processAlerts([], [makeListener()], 0);
			expect(result.newOrders).toHaveLength(0);
			expect(result.expiredOrders).toBe(0);
		});

		it("handles empty listeners", () => {
			const result = processAlerts([makeNoise()], [], 0);
			expect(result.newOrders).toHaveLength(0);
		});

		it("handles both empty", () => {
			const result = processAlerts([], [], 0);
			expect(result.newOrders).toHaveLength(0);
			expect(result.factionAlertChanges).toHaveLength(0);
		});

		it("respects listener hearing range as cap", () => {
			// Noise radius is huge, but listener hearing range is small
			const result = processAlerts(
				[makeNoise({ noiseRadius: 1000 })],
				[makeListener({ hearingRange: 5, position: { x: 10, y: 0, z: 0 } })],
				0,
			);
			// Distance 10 > hearingRange 5
			expect(result.newOrders).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	describe("reset", () => {
		it("clears all state", () => {
			processAlerts([makeNoise()], [makeListener()], 0);
			expect(getPendingOrderCount()).toBe(1);
			expect(getAllFactionAlerts()).toHaveLength(1);

			reset();

			expect(getPendingOrderCount()).toBe(0);
			expect(getAllFactionAlerts()).toEqual([]);
			expect(getFactionAlertLevel("volt_collective")).toBe("calm");
		});
	});
});
