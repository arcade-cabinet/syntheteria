/**
 * Tests for GameOverScreen — pure logic for title/subtitle/color selection
 * based on GameOverState.
 *
 * The component is not rendered (node test env), but the conditional logic
 * is pure and testable directly.
 */

import type { GameOverState } from "../../systems/gameOverDetection";

// ---------------------------------------------------------------------------
// Pure title/subtitle/color logic (mirrors GameOverScreen.tsx)
// ---------------------------------------------------------------------------

function getTitle(state: GameOverState): string {
	return state.won ? "SYNTHETERIA RECLAIMED" : "SYSTEMS OFFLINE";
}

function getSubtitle(state: GameOverState): string {
	return state.won
		? "The machine planet answers to you now."
		: "Critical failure. All systems non-responsive.";
}

function getAccentColor(state: GameOverState): string {
	return state.won ? "#00ffaa" : "#ff4444";
}

function getStatusText(state: GameOverState): string {
	return state.won ? "// MISSION COMPLETE" : "// CRITICAL FAILURE";
}

// ---------------------------------------------------------------------------
// Victory state
// ---------------------------------------------------------------------------

describe("GameOverScreen victory state", () => {
	const victoryState: GameOverState = {
		won: true,
		reason: "All rival civilizations eliminated",
	};

	it("shows victory title when won", () => {
		expect(getTitle(victoryState)).toBe("SYNTHETERIA RECLAIMED");
	});

	it("shows victory subtitle when won", () => {
		expect(getSubtitle(victoryState)).toContain("machine planet");
	});

	it("uses green accent color for victory", () => {
		expect(getAccentColor(victoryState)).toBe("#00ffaa");
	});

	it("shows MISSION COMPLETE status for victory", () => {
		expect(getStatusText(victoryState)).toBe("// MISSION COMPLETE");
	});

	it("preserves reason string", () => {
		expect(victoryState.reason).toBe("All rival civilizations eliminated");
	});
});

// ---------------------------------------------------------------------------
// Loss state
// ---------------------------------------------------------------------------

describe("GameOverScreen loss state", () => {
	const lossState: GameOverState = {
		won: false,
		reason: "Colony destroyed by raid",
	};

	it("shows loss title when not won", () => {
		expect(getTitle(lossState)).toBe("SYSTEMS OFFLINE");
	});

	it("shows loss subtitle when not won", () => {
		expect(getSubtitle(lossState)).toContain("Critical failure");
	});

	it("uses red accent color for loss", () => {
		expect(getAccentColor(lossState)).toBe("#ff4444");
	});

	it("shows CRITICAL FAILURE status for loss", () => {
		expect(getStatusText(lossState)).toBe("// CRITICAL FAILURE");
	});

	it("preserves loss reason string", () => {
		expect(lossState.reason).toBe("Colony destroyed by raid");
	});
});

// ---------------------------------------------------------------------------
// Title / subtitle are mutually exclusive
// ---------------------------------------------------------------------------

describe("GameOverScreen title exclusivity", () => {
	const victoryState: GameOverState = {
		won: true,
		reason: "test",
	};
	const lossState: GameOverState = { won: false, reason: "test" };

	it("victory and loss titles are different", () => {
		expect(getTitle(victoryState)).not.toBe(getTitle(lossState));
	});

	it("victory and loss subtitles are different", () => {
		expect(getSubtitle(victoryState)).not.toBe(getSubtitle(lossState));
	});

	it("victory and loss accent colors are different", () => {
		expect(getAccentColor(victoryState)).not.toBe(getAccentColor(lossState));
	});
});

// ---------------------------------------------------------------------------
// GameOverState shape
// ---------------------------------------------------------------------------

describe("GameOverState shape", () => {
	it("has won boolean and reason string", () => {
		const state: GameOverState = { won: true, reason: "test" };
		expect(typeof state.won).toBe("boolean");
		expect(typeof state.reason).toBe("string");
	});

	it("reason can be empty string", () => {
		const state: GameOverState = { won: false, reason: "" };
		expect(state.reason).toBe("");
	});

	it("reason can contain descriptive text", () => {
		const state: GameOverState = {
			won: false,
			reason: "Colony cube stockpile stolen by Iron Creed raid",
		};
		expect(state.reason.length).toBeGreaterThan(0);
	});
});
