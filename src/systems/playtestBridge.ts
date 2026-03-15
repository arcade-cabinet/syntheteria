/**
 * Playtest Bridge — exposes game internals on `window` for Playwright E2E tests.
 *
 * When imported, registers read-only accessor functions that the
 * ai-playtest-100turns.spec.ts harness calls via page.evaluate().
 *
 * These globals are harmless in production — they only expose read-only state
 * and are never called unless the test harness is running.
 */

import {
	executePlayerAutoTurn,
	initializeFactionGovernors,
	registerFactionTurnHandler,
	setAutoPlayMode,
} from "../ai/governor/factionGovernors";
import { saveAllStateSync } from "../db/saveAllState";
import { getSnapshot } from "../ecs/gameState";
import { getCampaignStats } from "./campaignStats";
import { getCompletedTurnLogs } from "./turnEventLog";
import { endPlayerTurn, getTurnState } from "./turnSystem";
import { getVictoryResult } from "./victorySystem";

declare global {
	interface Window {
		__syntheteria_playtestMode?: boolean;
		__syntheteria_getTurnNumber?: () => number;
		__syntheteria_getGameSnapshot?: () => Record<string, unknown>;
		__syntheteria_getTurnEventLog?: () => unknown[];
		__syntheteria_getVictoryResult?: () => unknown | null;
		__syntheteria_getCampaignStats?: () => unknown;
		__syntheteria_enableAutoPlay?: (() => void) | null;
		__syntheteria_autoPlayOneTurn?: () => void;
		__syntheteria_endTurn?: () => void;
		__syntheteria_saveGame?: () => void;
	}
}

function registerBridge() {
	if (typeof window === "undefined") {
		return;
	}

	window.__syntheteria_getTurnNumber = () => {
		return getTurnState().turnNumber;
	};

	window.__syntheteria_getGameSnapshot = () => {
		const snap = getSnapshot();
		const turnState = getTurnState();
		return {
			turnNumber: turnState.turnNumber,
			timestamp: Date.now(),
			resources: {
				scrapMetal: snap.resources.scrapMetal,
				eWaste: snap.resources.eWaste,
				intactComponents: snap.resources.intactComponents,
				ferrousScrap: snap.resources.ferrousScrap ?? 0,
				alloyStock: snap.resources.alloyStock ?? 0,
				polymerSalvage: snap.resources.polymerSalvage ?? 0,
				conductorWire: snap.resources.conductorWire ?? 0,
				electrolyte: snap.resources.electrolyte ?? 0,
				siliconWafer: snap.resources.siliconWafer ?? 0,
				stormCharge: snap.resources.stormCharge ?? 0,
				elCrystal: snap.resources.elCrystal ?? 0,
			},
			unitCount: snap.unitCount,
			enemyCount: snap.enemyCount,
			stormIntensity: snap.power.stormIntensity,
			activeScene: snap.activeScene,
		};
	};

	window.__syntheteria_getTurnEventLog = () => {
		return getCompletedTurnLogs() as unknown[];
	};

	window.__syntheteria_getVictoryResult = () => {
		return getVictoryResult();
	};

	window.__syntheteria_getCampaignStats = () => {
		return getCampaignStats();
	};

	window.__syntheteria_endTurn = () => {
		endPlayerTurn();
	};

	window.__syntheteria_enableAutoPlay = () => {
		initializeFactionGovernors();
		registerFactionTurnHandler();
		setAutoPlayMode(true);
	};

	/**
	 * Execute one full auto-play turn:
	 * 1. Player governor makes decisions
	 * 2. endPlayerTurn() triggers rival AI factions + environment phase + new turn
	 */
	window.__syntheteria_autoPlayOneTurn = () => {
		const turnNumber = getTurnState().turnNumber;
		executePlayerAutoTurn(turnNumber);
		endPlayerTurn();
	};

	window.__syntheteria_saveGame = () => {
		saveAllStateSync();
	};
}

registerBridge();
