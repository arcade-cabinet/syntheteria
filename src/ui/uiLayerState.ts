/**
 * UI layer visibility state machine (US-018).
 *
 * Phases:
 *   "loading"      — Only the loading overlay renders.
 *   "hud-entering" — Loading fades out, HUD fades in.
 *   "hud-visible"  — HUD fully visible; thought/mentor overlays enabled.
 *
 * Transition rules:
 *   loading       -> hud-entering   (when worldReady becomes true)
 *   hud-entering  -> hud-visible    (after fade duration elapses)
 */

export type UILayerPhase = "loading" | "hud-entering" | "hud-visible";

/** Duration in ms for the HUD fade-in transition. */
export const HUD_FADE_DURATION_MS = 600;

export interface UILayerVisibility {
	showLoading: boolean;
	showHud: boolean;
	showThoughtOverlay: boolean;
	showLocationPanel: boolean;
}

/**
 * Pure function: given the current phase and whether a POI is nearby,
 * returns which UI layers should be visible.
 */
export function getLayerVisibility(
	phase: UILayerPhase,
	nearbyPoiName: string | null,
): UILayerVisibility {
	switch (phase) {
		case "loading":
			return {
				showLoading: true,
				showHud: false,
				showThoughtOverlay: false,
				showLocationPanel: false,
			};
		case "hud-entering":
			return {
				showLoading: false,
				showHud: true,
				showThoughtOverlay: false,
				showLocationPanel: false,
			};
		case "hud-visible":
			return {
				showLoading: false,
				showHud: true,
				showThoughtOverlay: true,
				showLocationPanel: nearbyPoiName != null,
			};
	}
}

/**
 * Pure function: compute the next phase given the current phase
 * and whether the world is ready.
 *
 * The hud-entering -> hud-visible transition is time-based and
 * handled by a timer in the React component, not by this function.
 */
export function nextPhase(
	current: UILayerPhase,
	worldReady: boolean,
): UILayerPhase {
	if (current === "loading" && worldReady) {
		return "hud-entering";
	}
	return current;
}
