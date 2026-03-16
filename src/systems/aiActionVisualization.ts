/**
 * AI Action Visualization — shows what rival factions do during their turn.
 *
 * During the AI phase, this system:
 *   1. Collects visible AI actions (harvest, build, move, attack)
 *   2. Queues camera focus requests to briefly show key actions
 *   3. Emits action indicator events for the UI to display
 *
 * If there are too many actions (>3), shows a summary instead of
 * panning to each one.
 */

import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { requestCameraFocus } from "./cameraFocus";
import { subscribeTurnEvents, type TurnEvent } from "./turnPhaseEvents";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIActionIndicator {
	entityId: string;
	faction: string;
	action: "harvest" | "build" | "move" | "attack" | "unknown";
	worldX: number;
	worldZ: number;
	/** When this indicator was created (for auto-removal) */
	createdAt: number;
}

// ─── State ──────────────────────────────────────────────────────────────────

let activeIndicators: AIActionIndicator[] = [];
const indicatorListeners = new Set<() => void>();

function notifyIndicators() {
	for (const listener of indicatorListeners) {
		listener();
	}
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getAIActionIndicators(): AIActionIndicator[] {
	return activeIndicators;
}

export function subscribeAIActionIndicators(listener: () => void): () => void {
	indicatorListeners.add(listener);
	return () => indicatorListeners.delete(listener);
}

/**
 * Gather AI unit positions for a given faction and create indicators.
 * Called when we enter an AI faction's turn phase.
 */
function gatherFactionActions(factionId: string): AIActionIndicator[] {
	const actions: AIActionIndicator[] = [];
	const now = performance.now();

	for (const entity of units) {
		const identity = entity.get(Identity);
		if (!identity) continue;

		// Match faction — map our internal faction IDs to the turn system's faction names
		if (identity.faction !== factionId) continue;

		const wp = entity.get(WorldPosition);
		if (!wp) continue;

		const unit = entity.get(Unit);
		if (!unit) continue;

		// For now, all AI units show as "active" during their phase.
		// When real AI actions are wired, this will show specific actions.
		actions.push({
			entityId: identity.id,
			faction: factionId,
			action: "unknown",
			worldX: wp.x,
			worldZ: wp.z,
			createdAt: now,
		});
	}

	return actions;
}

/**
 * Show AI actions for a faction — pan camera to one visible action
 * and display indicators on all of them.
 */
export function showFactionActions(factionId: string) {
	const actions = gatherFactionActions(factionId);

	if (actions.length === 0) return;

	// Set indicators for UI rendering
	activeIndicators = actions;
	notifyIndicators();

	// Pan camera to first visible action (brief 0.8s transition)
	const target = actions[0];
	if (target) {
		requestCameraFocus(target.worldX, target.worldZ, null, 0.8);
	}
}

/**
 * Clear all active AI action indicators.
 */
export function clearAIActionIndicators() {
	if (activeIndicators.length === 0) return;
	activeIndicators = [];
	notifyIndicators();
}

/**
 * Auto-clear indicators older than a threshold (in ms).
 */
export function cleanupStaleIndicators(maxAgeMs = 3000) {
	const now = performance.now();
	const before = activeIndicators.length;
	activeIndicators = activeIndicators.filter(
		(ind) => now - ind.createdAt < maxAgeMs,
	);
	if (activeIndicators.length !== before) {
		notifyIndicators();
	}
}

// ─── Auto-wire to Turn Events ───────────────────────────────────────────────

let initialized = false;

/**
 * Initialize the AI action visualization system.
 * Call once at startup. Safe to call multiple times.
 */
export function initAIActionVisualization() {
	if (initialized) return;
	initialized = true;

	subscribeTurnEvents((event: TurnEvent) => {
		if (event.type === "phase_change") {
			if (event.toPhase === "ai_faction" && event.activeFaction) {
				showFactionActions(event.activeFaction);
			}

			// Clear indicators when returning to player phase
			if (event.toPhase === "player") {
				clearAIActionIndicators();
			}
		}
	});
}

/**
 * Reset for testing.
 */
export function _resetAIActionVisualization() {
	activeIndicators = [];
	indicatorListeners.clear();
	initialized = false;
}
