/**
 * @package app
 *
 * App shell — session lifecycle, debug bridge, and HUD data readers.
 */

// --- Session lifecycle ---
export { createNewGame, loadGame, saveGame } from "./session";

// --- Debug bridge ---
export { installDebugBridge } from "./debug";
export type { DebugBridge, DebugBridgeContext } from "./debug";

// --- HUD data readers ---
export { readPlayerAp, getProductionQueue, getCurrentResearchForHUD } from "./hudData";

// --- Types ---
export type { Phase, GameSession } from "./types";
