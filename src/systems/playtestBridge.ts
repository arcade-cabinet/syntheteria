/**
 * Playtest bridge — exposes game state on window.__syntheteria
 * for Playwright E2E tests and automated playtest tools.
 *
 * Import this module in index.tsx to register the bridge on app startup.
 * The bridge is always available but has no performance cost when not used.
 */

import {
	disableAutoPlay,
	enableAutoPlay,
	type GovernorAction,
	getGovernorLog,
	isAutoPlayEnabled,
} from "../ai/governor/PlaytestGovernor";
import { getSnapshot, setGameSpeed, simulationTick } from "../ecs/gameState";
import { Base, Faction } from "../ecs/traits";
import { world } from "../ecs/world";
import { movementSystem } from "../systems/movement";

// ─── Global type augmentation ───────────────────────────────────────────────

declare global {
	interface Window {
		__syntheteria?: {
			getTickNumber: () => number;
			getSnapshot: () => Record<string, unknown>;
			getPlayerUnitCount: () => number;
			getEnemyCount: () => number;
			getBaseCount: () => number;
			enableAutoPlay: () => void;
			disableAutoPlay: () => void;
			isAutoPlayEnabled: () => boolean;
			getGovernorLog: () => GovernorAction[];
			setGameSpeed: (speed: number) => void;
			/** Force-advance N simulation ticks (for headless E2E where WebGL render loop may not fire) */
			forceTicks: (count: number) => void;
		};
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Count player bases via ECS query. */
function countPlayerBases(): number {
	let count = 0;
	for (const entity of world.query(Base, Faction)) {
		if (entity.get(Faction)?.value === "player") count++;
	}
	return count;
}

// ─── Bridge registration ────────────────────────────────────────────────────

function registerBridge(): void {
	if (typeof window === "undefined") return;

	window.__syntheteria = {
		getTickNumber: () => getSnapshot().tick,

		getSnapshot: () => {
			const snap = getSnapshot();
			return {
				tick: snap.tick,
				gameSpeed: snap.gameSpeed,
				paused: snap.paused,
				unitCount: snap.unitCount,
				enemyCount: snap.enemyCount,
				resources: snap.resources,
				power: snap.power,
				gamePhase: snap.gamePhase,
				humanTemperature: snap.humanTemperature,
			};
		},

		getPlayerUnitCount: () => getSnapshot().unitCount,

		getEnemyCount: () => getSnapshot().enemyCount,

		getBaseCount: () => countPlayerBases(),

		enableAutoPlay,
		disableAutoPlay,
		isAutoPlayEnabled,
		getGovernorLog,
		setGameSpeed,

		forceTicks: (count: number) => {
			for (let i = 0; i < count; i++) {
				movementSystem(0.25, 1); // 250ms delta at 1x speed
				simulationTick();
			}
		},
	};
}

// Register immediately on import
registerBridge();
