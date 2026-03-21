/**
 * AI research subsystem — LEGACY STUB.
 *
 * The old tech-tree research system has been superseded by building-driven
 * progression (building tiers unlock capabilities). This function is retained
 * for backward compatibility but intentionally does nothing.
 */

import type { World } from "koota";

/**
 * No-op — building upgrades now drive progression.
 * Retained so callers compile without changes.
 */
export function runAiResearch(_world: World, _factionIds: string[]): void {
	// Intentional no-op: research system replaced by building tiers.
}
