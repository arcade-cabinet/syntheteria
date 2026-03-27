/**
 * Victory/Defeat condition system.
 *
 * Checks win/loss conditions each simulation tick:
 *
 * Defeat: All player units destroyed -> game over.
 * Victory: Cult leader entity destroyed -> player wins, triggers wormhole ending.
 *
 * The system sets a terminal game state flag that the UI reads
 * to show the appropriate end-game overlay. Victory also triggers
 * the VICTORY_SEQUENCE narrative and SFX.
 */

import { playSfx } from "../audio";
import { Faction, Unit } from "../ecs/traits";
import { world } from "../ecs/world";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GameOutcome = "playing" | "victory" | "defeat";

// ─── State ──────────────────────────────────────────────────────────────────

let outcome: GameOutcome = "playing";
/** Number of ticks the game has been in terminal state (for delayed overlay). */
let terminalTicks = 0;
/** Grace period before declaring defeat — lets combat events finish. */
const DEFEAT_GRACE_TICKS = 3;

// ─── Public API ─────────────────────────────────────────────────────────────

/** Get the current game outcome. */
export function getGameOutcome(): GameOutcome {
	return outcome;
}

/** Reset the victory/defeat state (for new game). */
export function resetOutcome(): void {
	outcome = "playing";
	terminalTicks = 0;
}

/**
 * Record that a cult leader was destroyed.
 * Called from combat system when the cult_leader entity dies.
 * Triggers the victory SFX and sets the game outcome.
 */
export function recordCultLeaderKill(): void {
	if (outcome === "playing") {
		outcome = "victory";
		playSfx("victory");
	}
}

// ─── System tick ────────────────────────────────────────────────────────────

/**
 * Victory/defeat system. Called once per simulation tick.
 *
 * Checks:
 * 1. Defeat: Are any player units still alive?
 *    If not after grace period -> defeat.
 * 2. Victory: Handled via recordCultLeaderKill() called from combat
 *    when the cult_leader entity is destroyed.
 */
export function victoryDefeatSystem(): void {
	// Once resolved, don't change
	if (outcome !== "playing") return;

	// Check for defeat: no player units remain
	let hasPlayerUnits = false;

	for (const entity of world.query(Unit, Faction)) {
		const faction = entity.get(Faction)!.value;
		if (faction === "player") {
			hasPlayerUnits = true;
			break;
		}
	}

	// Defeat: no player units after grace period
	if (!hasPlayerUnits) {
		terminalTicks++;
		if (terminalTicks >= DEFEAT_GRACE_TICKS) {
			outcome = "defeat";
			playSfx("defeat");
		}
	} else {
		// Reset grace period if player has units again (e.g., fabrication)
		terminalTicks = 0;
	}
}
