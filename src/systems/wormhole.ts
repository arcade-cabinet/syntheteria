/**
 * Wormhole Endgame System — The ultimate victory structure.
 *
 * The wormhole is a multi-turn construction project requiring massive
 * EL Crystal (uranics) investment. It takes 10+ turns to build and
 * represents the Wormhole victory condition.
 *
 * Prerequisites:
 *   - wormhole_stabilization tech completed
 *   - Sufficient resources per construction stage
 *
 * Visual stages:
 *   0: foundation (flat energy ring)
 *   1-3: growing portal frame
 *   4-7: swirling energy vortex forming
 *   8-9: stabilization phase (portal pulsing)
 *   10: complete — victory triggered
 */

import type { EconomyFactionId } from "./factionEconomy";
import { spendFactionResource } from "./factionEconomy";
import { hasTech } from "./techTree";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STAGES = 10;

/** Resources required per construction stage */
const STAGE_COSTS: Record<string, number>[] = [
	{ uranics: 5, heavy_metals: 8 },
	{ uranics: 5, heavy_metals: 8, microchips: 3 },
	{ uranics: 8, heavy_metals: 6, microchips: 5 },
	{ uranics: 8, rare_components: 3, microchips: 5 },
	{ uranics: 10, rare_components: 5, microchips: 8 },
	{ uranics: 10, rare_components: 5, heavy_metals: 10 },
	{ uranics: 12, rare_components: 8, microchips: 10 },
	{ uranics: 15, rare_components: 8, heavy_metals: 12 },
	{ uranics: 15, rare_components: 10, microchips: 12 },
	{ uranics: 20, rare_components: 15, microchips: 15, heavy_metals: 15 },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WormholeState {
	/** Which faction is building */
	builder: EconomyFactionId | null;
	/** World position */
	worldX: number;
	worldZ: number;
	/** Current construction stage (0 to TOTAL_STAGES) */
	stage: number;
	/** Whether construction is complete */
	complete: boolean;
	/** Turn construction started */
	startTurn: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

let wormholeState: WormholeState | null = null;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeWormhole(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getWormholeState(): WormholeState | null {
	return wormholeState;
}

export function getTotalStages(): number {
	return TOTAL_STAGES;
}

/**
 * Check if a faction can begin wormhole construction.
 */
export function canStartWormhole(factionId: EconomyFactionId): boolean {
	// Already building
	if (wormholeState !== null) return false;

	// Must have wormhole_stabilization tech
	return hasTech(factionId, "wormhole_stabilization");
}

/**
 * Begin wormhole construction at a world position.
 */
export function startWormholeConstruction(
	factionId: EconomyFactionId,
	worldX: number,
	worldZ: number,
	turnNumber: number,
): boolean {
	if (!canStartWormhole(factionId)) return false;

	wormholeState = {
		builder: factionId,
		worldX,
		worldZ,
		stage: 0,
		complete: false,
		startTurn: turnNumber,
	};
	notify();
	return true;
}

/**
 * Get the cost for the next construction stage.
 */
export function getNextStageCost(): Record<string, number> | null {
	if (!wormholeState || wormholeState.complete) return null;
	if (wormholeState.stage >= TOTAL_STAGES) return null;
	return STAGE_COSTS[wormholeState.stage];
}

/**
 * Advance wormhole construction by one stage.
 * Automatically spends resources from the builder's pool.
 * Returns true if the stage was completed.
 */
export function advanceWormholeStage(): boolean {
	if (!wormholeState || wormholeState.complete) return false;
	if (wormholeState.stage >= TOTAL_STAGES) return false;

	const cost = STAGE_COSTS[wormholeState.stage];
	const builder = wormholeState.builder;
	if (!builder) return false;

	// Spend resources
	for (const [type, amount] of Object.entries(cost)) {
		if (
			!spendFactionResource(
				builder,
				type as Parameters<typeof spendFactionResource>[1],
				amount,
			)
		) {
			return false;
		}
	}

	wormholeState.stage++;

	if (wormholeState.stage >= TOTAL_STAGES) {
		wormholeState.complete = true;
	}

	notify();
	return true;
}

/**
 * Get construction progress as fraction 0..1.
 */
export function getWormholeProgress(): number {
	if (!wormholeState) return 0;
	return wormholeState.stage / TOTAL_STAGES;
}

/**
 * Get the visual phase for rendering:
 * "foundation" | "frame" | "vortex" | "stabilization" | "complete"
 */
export type WormholeVisualPhase =
	| "foundation"
	| "frame"
	| "vortex"
	| "stabilization"
	| "complete";

export function getWormholeVisualPhase(): WormholeVisualPhase | null {
	if (!wormholeState) return null;
	const s = wormholeState.stage;
	if (s === 0) return "foundation";
	if (s <= 3) return "frame";
	if (s <= 7) return "vortex";
	if (s <= 9) return "stabilization";
	return "complete";
}

/**
 * Reset wormhole state — call on new game.
 */
export function resetWormhole() {
	wormholeState = null;
	notify();
}
