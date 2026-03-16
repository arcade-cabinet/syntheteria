/**
 * Faction activity feed — records AI faction actions for display and analysis.
 *
 * Provides a simple event log: {turn, faction, action, position}.
 * UI components consume this via getFactionActivityFeed().
 */

export type FactionActionType =
	| "build"
	| "expand"
	| "harvest"
	| "scout"
	| "combat";

export interface FactionActivityEvent {
	turn: number;
	faction: string;
	action: FactionActionType;
	position: { x: number; z: number };
	detail?: string;
}

const MAX_FEED_SIZE = 200;

let feed: FactionActivityEvent[] = [];

/**
 * Record a faction activity event.
 */
export function recordFactionActivity(event: FactionActivityEvent): void {
	feed.push(event);
	if (feed.length > MAX_FEED_SIZE) {
		feed = feed.slice(feed.length - MAX_FEED_SIZE);
	}
}

/**
 * Get the full faction activity feed (most recent last).
 */
export function getFactionActivityFeed(): readonly FactionActivityEvent[] {
	return feed;
}

/**
 * Get the last N events from the feed.
 */
export function getRecentFactionActivity(
	count: number,
): readonly FactionActivityEvent[] {
	return feed.slice(-count);
}

/**
 * Get events for a specific faction.
 */
export function getFactionActivity(
	faction: string,
): readonly FactionActivityEvent[] {
	return feed.filter((e) => e.faction === faction);
}

/**
 * Reset the feed — call on new game initialization.
 */
export function resetFactionActivityFeed(): void {
	feed = [];
}
