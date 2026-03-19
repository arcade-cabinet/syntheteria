/**
 * @package ui
 *
 * React components — Globe (the ONE Canvas), landing screens, game HUD, and overlays.
 */

// --- Error boundary ---
export {
	FatalErrorBoundary,
	FatalErrorGate,
	pushFatalError,
	useFatalErrors,
} from "./FatalErrorModal";
export type { GlobePhase, GlobeProps } from "./Globe";
// --- Globe (persistent R3F Canvas) ---
export { Globe } from "./Globe";
export type { AlertCategory, GameAlert } from "./game/AlertBar";
// --- Alerts ---
export { pushAlert } from "./game/AlertBar";

// --- HUD types ---
export type { CurrentResearch, ProductionQueueItem } from "./game/HUD";
