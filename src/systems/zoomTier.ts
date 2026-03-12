import zoomConfig from "../config/zoomTiers.json";
import { SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";

/**
 * Zoom Tier System
 *
 * Determines the active zoom tier based on camera height, and exposes
 * the current tier + LOD parameters for renderers and UI to consume.
 *
 * Zoom tiers snap to predefined levels (tactical/default/strategic/world)
 * with smooth transitions between them (300ms lerp).
 *
 * The tier is computed from how many structural cells are visible across the
 * viewport width at the current camera height.
 *
 * This is a PURE system — no rendering, no Three.js, no React.
 */

// --- Types ---

export type ZoomTierName = "tactical" | "default" | "strategic" | "world";

export interface ZoomTierState {
	/** Active tier name */
	tier: ZoomTierName;
	/** Continuous blend factor between tiers [0, 1] for smooth transitions */
	transitionProgress: number;
	/** Whether we're transitioning between tiers */
	transitioning: boolean;
	/** Previous tier (for transition) */
	previousTier: ZoomTierName;
	/** Network line opacity for current tier */
	networkLineOpacity: number;
	/** Whether resource markers should be visible */
	resourceMarkersVisible: boolean;
	/** Structure detail level */
	structureDetail: "full" | "silhouette" | "icon" | "dot";
	/** Unit detail level */
	unitDetail: "full" | "icon" | "badge" | "hidden";
	/** Current camera height */
	cameraHeight: number;
	/** Structural cells across viewport at current camera height */
	cellsAcross: number;
}

// --- Module state ---

let currentTier: ZoomTierName = "default";
let previousTier: ZoomTierName = "default";
let transitionProgress = 1.0; // 1.0 = transition complete
let cameraHeight = 20;
let viewportWidth = 375; // Default phone width in px

// --- Tier boundary computation ---

/**
 * Compute how many structural cells are visible across the viewport
 * at a given camera height, assuming perspective projection with fov=45.
 */
function computeCellsAcross(height: number, fov: number = 45): number {
	// Width of visible area at ground plane = 2 * height * tan(fov/2) * aspect
	// For simplicity, approximate with a standard aspect ratio
	const halfFovRad = ((fov / 2) * Math.PI) / 180;
	const visibleWidth = 2 * height * Math.tan(halfFovRad);
	const hexWidth = SECTOR_LATTICE_SIZE * 2;
	return visibleWidth / hexWidth;
}

/**
 * Determine which tier a given cellsAcross count maps to.
 */
function tierForCellsAcross(cells: number): ZoomTierName {
	const tiers = zoomConfig.tiers;

	// Find the tier whose cell span is closest
	if (cells <= (tiers.tactical.cellsAcross + tiers.default.cellsAcross) / 2) {
		return "tactical";
	}
	if (cells <= (tiers.default.cellsAcross + tiers.strategic.cellsAcross) / 2) {
		return "default";
	}
	if (cells <= (tiers.strategic.cellsAcross + tiers.world.cellsAcross) / 2) {
		return "strategic";
	}
	return "world";
}

/**
 * Get the target camera height for a given zoom tier.
 * Inverse of computeTilesAcross.
 */
export function getTargetHeightForTier(
	tier: ZoomTierName,
	fov: number = 45,
): number {
	const cellsAcross =
		zoomConfig.tiers[tier].cellsAcross;
	const hexWidth = SECTOR_LATTICE_SIZE * 2;
	const visibleWidth = cellsAcross * hexWidth;
	const halfFovRad = ((fov / 2) * Math.PI) / 180;
	return visibleWidth / (2 * Math.tan(halfFovRad));
}

// --- Lerp helper ---

function lerpValue(a: number, b: number, t: number): number {
	return a + (b - a) * Math.min(1, Math.max(0, t));
}

// --- Public API ---

let zoomTierState: ZoomTierState = buildState();

function getTierConfig(
	tier: ZoomTierName,
): (typeof zoomConfig.tiers)[ZoomTierName] {
	return zoomConfig.tiers[tier];
}

function buildState(): ZoomTierState {
	const tierConfig = getTierConfig(currentTier);
	const prevConfig = getTierConfig(previousTier);
	const t = transitionProgress;

	return {
		tier: currentTier,
		transitionProgress,
		transitioning: t < 1.0,
		previousTier,
		networkLineOpacity: lerpValue(
			prevConfig.networkLineOpacity,
			tierConfig.networkLineOpacity,
			t,
		),
		resourceMarkersVisible: tierConfig.resourceMarkersVisible,
		structureDetail: tierConfig.structureDetail as ZoomTierState["structureDetail"],
		unitDetail: tierConfig.unitDetail as ZoomTierState["unitDetail"],
		cameraHeight,
		cellsAcross: computeCellsAcross(cameraHeight),
	};
}

/**
 * Get the current zoom tier state. Updated when camera height changes.
 */
export function getZoomTierState(): ZoomTierState {
	return zoomTierState;
}

/**
 * Get the current zoom tier name.
 */
export function getCurrentZoomTier(): ZoomTierName {
	return currentTier;
}

/**
 * Get the next tier in the double-tap cycle.
 */
export function getNextCycleTier(): ZoomTierName {
	const order = zoomConfig.doubleTapCycleOrder as ZoomTierName[];
	const idx = order.indexOf(currentTier);
	return order[(idx + 1) % order.length];
}

/**
 * Set viewport width (for cell-span computation on phone vs tablet).
 */
export function setViewportWidth(width: number) {
	viewportWidth = width;
}

/**
 * Reset zoom tier state.
 */
export function resetZoomTier() {
	currentTier = "default";
	previousTier = "default";
	transitionProgress = 1.0;
	cameraHeight = 20;
	zoomTierState = buildState();
}

/**
 * Update zoom tier from camera height. Called by the camera system each frame.
 * Returns the target tier — the camera can lerp toward the target height
 * for snap-to behavior.
 */
export function updateZoomTier(
	newCameraHeight: number,
	deltaTime: number,
): ZoomTierName {
	cameraHeight = newCameraHeight;
	const cellsAcross = computeCellsAcross(cameraHeight);
	const newTier = tierForCellsAcross(cellsAcross);

	if (newTier !== currentTier) {
		previousTier = currentTier;
		currentTier = newTier;
		transitionProgress = 0;
	}

	// Advance transition
	if (transitionProgress < 1.0) {
		transitionProgress += deltaTime / zoomConfig.transitionDuration;
		if (transitionProgress >= 1.0) {
			transitionProgress = 1.0;
		}
	}

	zoomTierState = buildState();
	return currentTier;
}
