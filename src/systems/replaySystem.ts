/**
 * Game replay recording system.
 *
 * Records key game events for replay playback and post-game debugging.
 * Events are only captured while recording is active. The replay buffer
 * has a configurable cap (default 10 000 events) — when exceeded, the
 * oldest events are silently discarded.
 *
 * Supports export/import to JSON for file persistence and sharing.
 *
 * No external config dependency — this is infrastructure, not game logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayEvent {
	tick: number;
	eventType: string;
	data: Record<string, unknown>;
	entityId?: string;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Whether the system is currently recording events. */
let recording = false;

/** Recorded event buffer. */
let events: ReplayEvent[] = [];

/** Maximum events to retain before oldest are evicted. */
let maxEvents = 10_000;

// ---------------------------------------------------------------------------
// Recording control
// ---------------------------------------------------------------------------

/**
 * Begin recording replay events.
 * If already recording, this is a no-op.
 */
export function startRecording(): void {
	recording = true;
}

/**
 * Stop recording replay events.
 * Already-recorded events are preserved.
 */
export function stopRecording(): void {
	recording = false;
}

/**
 * Check whether the system is currently recording.
 */
export function isRecording(): boolean {
	return recording;
}

// ---------------------------------------------------------------------------
// Event capture
// ---------------------------------------------------------------------------

/**
 * Record a game event. Ignored when recording is inactive.
 *
 * @param eventType - A short string tag (e.g. "cube_placed", "combat_hit").
 * @param data      - Serialisable payload describing the event.
 * @param tick      - The game tick when this event occurred.
 * @param entityId  - Optional entity ID associated with the event.
 */
export function recordEvent(
	eventType: string,
	data: Record<string, unknown>,
	tick: number,
	entityId?: string,
): void {
	if (!recording) return;

	const entry: ReplayEvent = { tick, eventType, data };
	if (entityId !== undefined) {
		entry.entityId = entityId;
	}

	events.push(entry);

	if (events.length > maxEvents) {
		events = events.slice(events.length - maxEvents);
	}
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all recorded events in chronological order.
 */
export function getReplayData(): ReplayEvent[] {
	return [...events];
}

/**
 * Return all events that occurred at a specific tick.
 */
export function getEventsForTick(tick: number): ReplayEvent[] {
	return events.filter((e) => e.tick === tick);
}

/**
 * Return all events matching a given event type string.
 */
export function getEventsByType(type: string): ReplayEvent[] {
	return events.filter((e) => e.eventType === type);
}

/**
 * Total number of events currently recorded.
 */
export function replayLength(): number {
	return events.length;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/**
 * Export the full replay buffer as a JSON string.
 */
export function exportReplay(): string {
	return JSON.stringify(events);
}

/**
 * Import replay data from a JSON string, replacing any existing buffer.
 * Recording state is not changed.
 *
 * @throws {SyntaxError} If the JSON is malformed.
 * @throws {Error} If the parsed value is not an array.
 */
export function importReplay(json: string): void {
	const parsed: unknown = JSON.parse(json);
	if (!Array.isArray(parsed)) {
		throw new Error("importReplay: expected a JSON array");
	}
	events = parsed as ReplayEvent[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Set the maximum number of events to retain.
 * Trims existing buffer if it exceeds the new limit.
 */
export function setMaxEvents(limit: number): void {
	maxEvents = Math.max(1, limit);
	if (events.length > maxEvents) {
		events = events.slice(events.length - maxEvents);
	}
}

/**
 * Get the current maximum event limit.
 */
export function getMaxEvents(): number {
	return maxEvents;
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all recorded events and stop recording. For test isolation.
 */
export function reset(): void {
	recording = false;
	events = [];
	maxEvents = 10_000;
}
