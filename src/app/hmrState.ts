/**
 * HMR state preservation.
 *
 * Keeps game state alive across Vite hot-reloads during development.
 */

import type { Phase, GameSession } from "./types";

export interface HmrState {
	phase: Phase;
	session: GameSession | null;
	turn: number;
	selectedUnitId: number | null;
	isObserverMode: boolean;
	observerSpeed: number;
}

declare global {
	interface Window {
		__hmrGameState?: HmrState;
	}
}

function migratePhase(p: string): Phase {
	if (p === "landing") return "title";
	if (p === "game") return "playing";
	if (p === "title" || p === "setup" || p === "generating" || p === "playing")
		return p as Phase;
	return "title";
}

export const hmrState: HmrState = window.__hmrGameState
	? {
			...window.__hmrGameState,
			phase: migratePhase(window.__hmrGameState.phase),
		}
	: {
			phase: "title",
			session: null,
			turn: 1,
			selectedUnitId: null,
			isObserverMode: false,
			observerSpeed: 1,
		};

window.__hmrGameState = hmrState;
