/**
 * Bot LOD System — level-of-detail management for unit rendering.
 *
 * Determines which visual representation to use for each bot based on
 * its distance from the camera and the current zoom tier.
 *
 * LOD Levels:
 *   - "full"       Close range: full GLTF model, all animations, all effects
 *   - "simplified"  Mid range: simplified geometry (colored capsule), no animations
 *   - "icon"        Far range: flat billboard sprite, faction-colored
 *   - "hidden"      Beyond visibility: not rendered at all
 *
 * The zoom tier system already defines unitDetail levels (full/icon/badge/hidden).
 * This system adds distance-based refinement within those tiers.
 *
 * This is a PURE system — no rendering, no Three.js, no React.
 * Renderers query getLODLevel() to decide which representation to use.
 */

import { getZoomTierState, type ZoomTierState } from "./zoomTier";
import { distanceSquaredToCamera } from "./frustumCulling";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BotLODLevel = "full" | "simplified" | "icon" | "hidden";

// ─── Distance thresholds (squared, to avoid sqrt) ───────────────────────────

/** Distance squared beyond which full → simplified */
const FULL_TO_SIMPLIFIED_SQ = 30 * 30; // 30 world units

/** Distance squared beyond which simplified → icon */
const SIMPLIFIED_TO_ICON_SQ = 60 * 60; // 60 world units

/** Distance squared beyond which icon → hidden */
const ICON_TO_HIDDEN_SQ = 120 * 120; // 120 world units

// ─── Hysteresis band (prevents flickering at boundaries) ────────────────────
const HYSTERESIS_SQ = 3 * 3; // 3 unit band

// ─── Per-entity LOD cache ───────────────────────────────────────────────────

const entityLODCache = new Map<string, BotLODLevel>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Determine the LOD level for a bot at a given world position.
 *
 * Considers both the zoom tier (which may override to a simpler level)
 * and the distance from the camera (for within-tier refinement).
 *
 * @param entityId - Entity identifier for hysteresis caching
 * @param worldX - Bot world X position
 * @param worldZ - Bot world Z position
 * @returns The LOD level to use for rendering
 */
export function getLODLevel(
	entityId: string,
	worldX: number,
	worldZ: number,
): BotLODLevel {
	const zoomState = getZoomTierState();
	const previousLOD = entityLODCache.get(entityId) ?? "full";

	// Zoom tier can force a maximum detail level
	const maxDetail = zoomTierToMaxLOD(zoomState);

	// Distance-based LOD
	const distSq = distanceSquaredToCamera(worldX, worldZ);
	let distanceLOD = computeDistanceLOD(distSq, previousLOD);

	// Use the coarser of zoom-tier and distance LOD
	const finalLOD = coarsest(distanceLOD, maxDetail);

	entityLODCache.set(entityId, finalLOD);
	return finalLOD;
}

/**
 * Get the LOD level for a bot without hysteresis (stateless query).
 */
export function getLODLevelStateless(
	worldX: number,
	worldZ: number,
): BotLODLevel {
	const zoomState = getZoomTierState();
	const maxDetail = zoomTierToMaxLOD(zoomState);
	const distSq = distanceSquaredToCamera(worldX, worldZ);
	const distanceLOD = computeDistanceLOD(distSq, "full");
	return coarsest(distanceLOD, maxDetail);
}

/**
 * Reset LOD cache — call on new game or camera teleport.
 */
export function resetBotLOD(): void {
	entityLODCache.clear();
}

/**
 * Get the current LOD statistics for debugging.
 */
export function getLODStats(): Record<BotLODLevel, number> {
	const stats: Record<BotLODLevel, number> = {
		full: 0,
		simplified: 0,
		icon: 0,
		hidden: 0,
	};
	for (const level of entityLODCache.values()) {
		stats[level]++;
	}
	return stats;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function zoomTierToMaxLOD(state: ZoomTierState): BotLODLevel {
	switch (state.unitDetail) {
		case "full":
			return "full";
		case "icon":
			return "simplified";
		case "badge":
			return "icon";
		case "hidden":
			return "hidden";
		default:
			return "full";
	}
}

function computeDistanceLOD(
	distSq: number,
	previousLOD: BotLODLevel,
): BotLODLevel {
	// Apply hysteresis — use different thresholds depending on direction
	const goingFarther = (threshold: number) =>
		previousLOD === "full" || previousLOD === "simplified"
			? threshold + HYSTERESIS_SQ
			: threshold;
	const goingCloser = (threshold: number) =>
		previousLOD === "hidden" || previousLOD === "icon"
			? threshold - HYSTERESIS_SQ
			: threshold;

	if (distSq > ICON_TO_HIDDEN_SQ + HYSTERESIS_SQ) return "hidden";
	if (distSq > goingFarther(SIMPLIFIED_TO_ICON_SQ)) return "icon";
	if (distSq > goingFarther(FULL_TO_SIMPLIFIED_SQ)) return "simplified";
	return "full";
}

const LOD_ORDER: BotLODLevel[] = ["full", "simplified", "icon", "hidden"];

function coarsest(a: BotLODLevel, b: BotLODLevel): BotLODLevel {
	const ai = LOD_ORDER.indexOf(a);
	const bi = LOD_ORDER.indexOf(b);
	return ai >= bi ? a : b;
}
