/**
 * Trade route system — automated resource transport between faction outposts.
 *
 * Trade routes are persistent connections between two outposts that
 * automatically transfer cubes at configurable intervals. Routes can be
 * paused, resumed, or disrupted by territorial contestation.
 *
 * Integrates with:
 * - diplomacySystem (stance checks for auto-pause)
 * - territory (contestation checks for route disruption)
 * - economySimulation (import/export recording)
 *
 * All tunables sourced from config/diplomacy.json via the centralized config index.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TradeRouteStatus = "active" | "paused" | "disrupted";

export interface TradeRoute {
	id: string;
	fromFaction: string;
	toFaction: string;
	fromOutpost: string;
	toOutpost: string;
	resourceType: string;
	amountPerTrip: number;
	tripInterval: number;
	status: TradeRouteStatus;
	lastTripTick: number;
	totalTrips: number;
	totalAmountTransferred: number;
	revenue: number;
	createdTick: number;
}

export interface RouteDisruptionCheck {
	fromOutpost: { x: number; z: number };
	toOutpost: { x: number; z: number };
	contestedTerritories: Array<{ ownerId: string }>;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const diplomacyCfg = config.diplomacy;

/**
 * The minimum stance required for trade routes to remain active.
 * Routes auto-pause if the stance between factions drops below this.
 * "friendly" threshold from config.
 */
const FRIENDLY_THRESHOLD = diplomacyCfg.relations.stanceThresholds.friendly;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** All trade routes keyed by route id */
const routes = new Map<string, TradeRoute>();

/** Next route id counter */
let nextRouteId = 0;

/** Pluggable stance resolver — returns opinion score for a faction pair */
let stanceResolver: ((factionA: string, factionB: string) => number) | null =
	null;

/** Pluggable disruption checker — returns true if route path is contested */
let disruptionChecker:
	| ((fromOutpost: string, toOutpost: string, fromFaction: string, toFaction: string) => boolean)
	| null = null;

/** Pluggable transfer handler — called when a trade trip completes */
let transferHandler:
	| ((route: TradeRoute) => boolean)
	| null = null;

// ---------------------------------------------------------------------------
// Integration hooks
// ---------------------------------------------------------------------------

/**
 * Set the function used to resolve diplomatic stance between factions.
 * Should return an opinion score (-100 to 100).
 */
export function setStanceResolver(
	resolver: (factionA: string, factionB: string) => number,
): void {
	stanceResolver = resolver;
}

/**
 * Set the function used to check if a route path is disrupted.
 * Should return true if the route is disrupted (contested/hostile territory).
 */
export function setDisruptionChecker(
	checker: (fromOutpost: string, toOutpost: string, fromFaction: string, toFaction: string) => boolean,
): void {
	disruptionChecker = checker;
}

/**
 * Set the function called when a trade trip transfers resources.
 * Should return true if the transfer succeeded (resources available).
 */
export function setTransferHandler(
	handler: (route: TradeRoute) => boolean,
): void {
	transferHandler = handler;
}

// ---------------------------------------------------------------------------
// Public API — Route management
// ---------------------------------------------------------------------------

/**
 * Create a new trade route between two faction outposts.
 *
 * Returns the route id, or null if a route already exists between the
 * same outposts for the same resource type.
 */
export function createTradeRoute(
	fromFaction: string,
	toFaction: string,
	fromOutpost: string,
	toOutpost: string,
	resourceType: string,
	amountPerTrip: number,
	tripInterval: number,
	currentTick = 0,
): string | null {
	// Prevent duplicate routes between same outposts for same resource
	for (const route of routes.values()) {
		if (
			route.fromOutpost === fromOutpost &&
			route.toOutpost === toOutpost &&
			route.resourceType === resourceType
		) {
			return null;
		}
	}

	const id = `route_${nextRouteId++}`;
	const route: TradeRoute = {
		id,
		fromFaction,
		toFaction,
		fromOutpost,
		toOutpost,
		resourceType,
		amountPerTrip,
		tripInterval,
		status: "active",
		lastTripTick: currentTick,
		totalTrips: 0,
		totalAmountTransferred: 0,
		revenue: 0,
		createdTick: currentTick,
	};
	routes.set(id, route);
	return id;
}

/**
 * Cancel and remove a trade route permanently.
 * Returns true if the route existed and was removed.
 */
export function cancelTradeRoute(routeId: string): boolean {
	return routes.delete(routeId);
}

/**
 * Pause an active trade route.
 * Returns true if the route was active and is now paused.
 */
export function pauseTradeRoute(routeId: string): boolean {
	const route = routes.get(routeId);
	if (!route) return false;
	if (route.status !== "active") return false;
	route.status = "paused";
	return true;
}

/**
 * Resume a paused trade route.
 * Returns true if the route was paused and is now active.
 */
export function resumeTradeRoute(routeId: string): boolean {
	const route = routes.get(routeId);
	if (!route) return false;
	if (route.status !== "paused") return false;
	route.status = "active";
	return true;
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get a trade route by id. Returns a copy or undefined.
 */
export function getTradeRoute(routeId: string): TradeRoute | undefined {
	const route = routes.get(routeId);
	return route ? { ...route } : undefined;
}

/**
 * Get all trade routes. Returns copies to prevent external mutation.
 */
export function getAllTradeRoutes(): TradeRoute[] {
	return Array.from(routes.values()).map((r) => ({ ...r }));
}

/**
 * Get all trade routes involving a specific faction (as sender or receiver).
 */
export function getRoutesByFaction(faction: string): TradeRoute[] {
	const result: TradeRoute[] = [];
	for (const route of routes.values()) {
		if (route.fromFaction === faction || route.toFaction === faction) {
			result.push({ ...route });
		}
	}
	return result;
}

/**
 * Get total revenue across all routes for a faction.
 */
export function getFactionTradeRevenue(faction: string): number {
	let total = 0;
	for (const route of routes.values()) {
		if (route.fromFaction === faction || route.toFaction === faction) {
			total += route.revenue;
		}
	}
	return total;
}

/**
 * Get count of routes by status for a faction.
 */
export function getRouteStatusCounts(
	faction: string,
): Record<TradeRouteStatus, number> {
	const counts: Record<TradeRouteStatus, number> = {
		active: 0,
		paused: 0,
		disrupted: 0,
	};
	for (const route of routes.values()) {
		if (route.fromFaction === faction || route.toFaction === faction) {
			counts[route.status]++;
		}
	}
	return counts;
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Process all active trade routes.
 * Called once per game tick.
 *
 * For each active route:
 * 1. Check diplomatic stance — auto-pause if below friendly threshold
 * 2. Check territorial disruption — set status to disrupted if contested
 * 3. Execute trade trip if interval has elapsed
 */
export function tradeRouteSystem(currentTick: number): void {
	for (const route of routes.values()) {
		// Skip permanently paused routes (user-paused stay paused)
		if (route.status === "paused") continue;

		// 1. Diplomatic stance check
		if (stanceResolver) {
			const opinion = stanceResolver(route.fromFaction, route.toFaction);
			if (opinion < FRIENDLY_THRESHOLD) {
				route.status = "paused";
				continue;
			}
		}

		// 2. Territorial disruption check
		if (disruptionChecker) {
			const isDisrupted = disruptionChecker(
				route.fromOutpost,
				route.toOutpost,
				route.fromFaction,
				route.toFaction,
			);
			if (isDisrupted) {
				route.status = "disrupted";
				continue;
			}
			// If previously disrupted but now clear, reactivate
			if (route.status === "disrupted") {
				route.status = "active";
			}
		}

		// Only process active routes from here
		if (route.status !== "active") continue;

		// 3. Execute trade trip if interval has elapsed
		const ticksSinceLastTrip = currentTick - route.lastTripTick;
		if (ticksSinceLastTrip >= route.tripInterval) {
			let transferred = true;

			// If a transfer handler is set, use it to validate resource availability
			if (transferHandler) {
				transferred = transferHandler(route);
			}

			if (transferred) {
				route.lastTripTick = currentTick;
				route.totalTrips++;
				route.totalAmountTransferred += route.amountPerTrip;

				// Revenue based on trade ratios from diplomacy config
				const ratioKey = `${route.resourceType}_value` as string;
				const resourceValue =
					(diplomacyCfg.tradeRatios as Record<string, number>)[ratioKey] ?? 1;
				route.revenue += route.amountPerTrip * resourceValue;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all trade route state. Primarily for testing.
 */
export function resetTradeRoutes(): void {
	routes.clear();
	nextRouteId = 0;
	stanceResolver = null;
	disruptionChecker = null;
	transferHandler = null;
}
