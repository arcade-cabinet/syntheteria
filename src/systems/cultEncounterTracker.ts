/**
 * @module cultEncounterTracker
 *
 * Tracks which cult encounter events have fired (one-time triggers).
 * Systems call `fireCultEncounter` — it checks the encounter definition,
 * verifies the epoch requirement, and fires toast + turn event once.
 */

import type { World } from "koota";
import { computeEpoch, getCultEncounter } from "../config";
import type { CultEncounterTrigger } from "../config/cultEncounterDefs";
import { Board, CultStructure } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { pushToast } from "./toastNotifications";

const firedEncounters = new Set<CultEncounterTrigger>();

/**
 * Attempt to fire a cult encounter. Returns true if it fired (first time),
 * false if already fired or epoch requirement not met.
 */
export function fireCultEncounter(
	world: World,
	trigger: CultEncounterTrigger,
): boolean {
	if (firedEncounters.has(trigger)) return false;

	const encounter = getCultEncounter(trigger);
	if (!encounter) return false;

	const currentTurn = readCurrentTurn(world);
	const epoch = computeEpoch(1, currentTurn);
	if (epoch.number < encounter.minEpoch) return false;

	firedEncounters.add(trigger);
	pushToast("combat", encounter.title, encounter.toastMessage, 6000);
	pushTurnEvent(`[CULT] ${encounter.title}: ${encounter.description}`);
	return true;
}

/** Check if all cult structures are destroyed → fire "all_cults_destroyed". */
export function checkAllCultsDestroyed(world: World): void {
	let hasAliveCultStructure = false;
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (s && s.hp > 0) {
			hasAliveCultStructure = true;
			break;
		}
	}
	if (!hasAliveCultStructure) {
		fireCultEncounter(world, "all_cults_destroyed");
	}
}

export function hasFiredEncounter(trigger: CultEncounterTrigger): boolean {
	return firedEncounters.has(trigger);
}

export function _resetCultEncounters(): void {
	firedEncounters.clear();
}

function readCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}
