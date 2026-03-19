/**
 * @package ui
 *
 * React components — Globe (the ONE Canvas), landing screens, game HUD, and overlays.
 */

// --- Globe (persistent R3F Canvas) ---
export { Globe } from "./Globe";
export type { GlobePhase, GlobeProps } from "./Globe";

// --- Error boundary ---
export {
	pushFatalError,
	FatalErrorBoundary,
	useFatalErrors,
	FatalErrorGate,
} from "./FatalErrorModal";
