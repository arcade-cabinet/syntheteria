/**
 * Shared design tokens for the Syntheteria UI.
 *
 * TWO PALETTES, ONE LANGUAGE:
 *
 * 1. MENU palette (amber/chrome) — title, pregame, pause, loading
 *    Industrial control panel aesthetic: warm amber accent, cool chrome text
 *
 * 2. HUD palette (faction-colored) — in-game bezel, FPSHUD, overlays
 *    Machine-vision aesthetic: default green, overridden by faction color
 *
 * Both share the same typography, spacing rhythm, and component patterns.
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT_MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Menu palette — amber/chrome industrial (title, pregame, pause, loading)
// ---------------------------------------------------------------------------

export const menu = {
	/** Primary amber accent */
	accent: "#e8a020",
	/** Dim amber for labels, secondary text */
	accentDim: "rgba(232,160,32,0.45)",
	/** Muted amber for borders, backgrounds */
	accentMuted: "rgba(232,160,32,0.22)",
	/** Very faint amber for hover backgrounds */
	accentFaint: "rgba(232,160,32,0.08)",
	/** Chrome/silver for secondary text */
	chrome: "#b8c4cc",
	/** Chrome dim for labels */
	chromeDim: "rgba(184,196,204,0.5)",
	/** Inset panel background */
	bgInset: "rgba(14,16,20,0.88)",
	/** Screen background */
	bgScreen: "#05070a",
	/** Error/warning */
	error: "#ff4444",
	/** Error dim */
	errorDim: "#ff6644",
} as const;

// ---------------------------------------------------------------------------
// HUD palette — faction-colored machine vision (in-game)
// ---------------------------------------------------------------------------

/** Default HUD green (Reclaimer faction). Override with faction color. */
export const hud = {
	/** Primary accent (default faction green) */
	accent: "#00ffaa",
	/** Bright variant */
	accentBright: "#00ff88",
	/** Dim for labels */
	accentDim: "#00ffaa66",
	/** Muted for borders */
	accentMuted: "#00ffaa22",
	/** Very faint for backgrounds */
	accentFaint: "rgba(0,255,170,0.05)",
	/** Background */
	bg: "rgba(4, 8, 6, 0.95)",
	/** Error/damage indicator */
	error: "#ff4444",
	/** Warning */
	warning: "#ffaa00",
} as const;

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Min touch target size (WCAG 2.5.5) */
export const MIN_TOUCH_TARGET = 44;
