/**
 * @package app
 *
 * App shell — React root, session lifecycle, debug bridge, HUD data, keyboard shortcuts.
 */

// --- App root ---
export { App } from "./App";
// --- UI components ---
export { CommandBar } from "./CommandBar";
export type { DebugBridge, DebugBridgeContext } from "./debug";
// --- Debug bridge ---
export { installDebugBridge } from "./debug";
export type { HmrState } from "./hmrState";

// --- HMR ---
export { hmrState } from "./hmrState";
// --- HUD data readers ---
export {
	getCurrentResearchForHUD,
	getProductionQueue,
	readPlayerAp,
} from "./hudData";
// --- Session lifecycle ---
export { createNewGame, loadGame, saveGame } from "./session";
// --- Types ---
export type { GameSession, Phase } from "./types";
// --- Keyboard ---
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
