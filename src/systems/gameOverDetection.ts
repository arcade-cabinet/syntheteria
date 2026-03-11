/**
 * Game over detection system — checks for victory and loss conditions.
 *
 * Victory: The final quest in the sequence is completed.
 * Loss:    The active player bot has all components non-functional.
 *
 * Runs once per simulation tick. When a condition triggers, it sets the
 * gameOver state via the game state store.
 */

import { playerBots } from "../ecs/koota/compat";
import {
	getQuestSequence,
	isQuestComplete,
} from "./questSystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameOverState {
	won: boolean;
	reason: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let gameOver: GameOverState | null = null;
const listeners: Array<(state: GameOverState) => void> = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current game over state, or null if the game is still in progress.
 */
export function getGameOverState(): GameOverState | null {
	return gameOver;
}

/**
 * Register a callback for when game over is triggered.
 * Returns an unsubscribe function.
 */
export function onGameOver(callback: (state: GameOverState) => void): () => void {
	listeners.push(callback);
	return () => {
		const idx = listeners.indexOf(callback);
		if (idx !== -1) listeners.splice(idx, 1);
	};
}

/**
 * Run game over detection. Call once per simulation tick.
 * Returns the GameOverState if the game just ended, or null.
 */
export function checkGameOver(): GameOverState | null {
	// Already over — don't re-trigger
	if (gameOver !== null) return null;

	// --- Victory check: final quest completed ---
	const sequence = getQuestSequence();
	if (sequence.length > 0) {
		const finalQuestId = sequence[sequence.length - 1].id;
		if (isQuestComplete(finalQuestId)) {
			gameOver = {
				won: true,
				reason: "All quests completed. Syntheteria reclaimed.",
			};
			notifyListeners(gameOver);
			return gameOver;
		}
	}

	// --- Loss check: active player bot has all components non-functional ---
	// Check if ANY player bot still has functional components
	const allPlayerBots = Array.from(playerBots);

	if (allPlayerBots.length === 0) {
		// No player bots left at all — loss
		gameOver = {
			won: false,
			reason: "All bots destroyed. Systems offline.",
		};
		notifyListeners(gameOver);
		return gameOver;
	}

	const anyFunctional = allPlayerBots.some((bot) =>
		bot.unit.components.some((c) => c.functional),
	);

	if (!anyFunctional) {
		gameOver = {
			won: false,
			reason: "All components non-functional. Systems offline.",
		};
		notifyListeners(gameOver);
		return gameOver;
	}

	return null;
}

/**
 * Reset game over state. Used for restart and testing.
 */
export function resetGameOver(): void {
	gameOver = null;
	listeners.length = 0;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function notifyListeners(state: GameOverState): void {
	for (const cb of listeners) {
		cb(state);
	}
}
