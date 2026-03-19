/**
 * @package app
 *
 * App shell — React root, session lifecycle, debug bridge, HUD data, keyboard shortcuts.
 */

// --- App root ---
export { App } from "./App";

// --- Session lifecycle ---
export { createNewGame, loadGame, saveGame } from "./session";

// --- Debug bridge ---
export { installDebugBridge } from "./debug";
export type { DebugBridge, DebugBridgeContext } from "./debug";

// --- HUD data readers ---
export { readPlayerAp, getProductionQueue, getCurrentResearchForHUD } from "./hudData";

// --- HMR ---
export { hmrState } from "./hmrState";
export type { HmrState } from "./hmrState";

// --- Keyboard ---
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";

// --- UI components ---
export { CommandBar } from "./CommandBar";

// --- Types ---
export type { Phase, GameSession } from "./types";
