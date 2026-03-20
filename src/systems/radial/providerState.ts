/**
 * Shared state and helpers for radial menu action providers.
 *
 * Providers need access to the current World, selected unit, and board
 * to evaluate which actions are available. This module holds those refs
 * and exposes setter functions called by BoardInput.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../../board/types";
import { UnitFaction, UnitPos, UnitStats } from "../../traits";

/** World ref set by BoardInput so providers can query ECS state. */
let _worldRef: World | null = null;
let _selectedUnitId: number | null = null;
let _boardRef: GeneratedBoard | null = null;

export function setBuildProviderWorld(world: World): void {
	_worldRef = world;
}

export function setProviderSelectedUnit(id: number | null): void {
	_selectedUnitId = id;
}

export function setProviderBoard(board: GeneratedBoard): void {
	_boardRef = board;
}

export function getWorldRef(): World | null {
	return _worldRef;
}

export function getSelectedUnitId(): number | null {
	return _selectedUnitId;
}

export function getBoardRef(): GeneratedBoard | null {
	return _boardRef;
}

/** Find the selected player unit and return its entity + stats. */
export function getSelectedPlayerUnit() {
	if (!_worldRef || _selectedUnitId == null) return null;
	for (const e of _worldRef.query(UnitPos, UnitStats, UnitFaction)) {
		if (e.id() === _selectedUnitId) {
			const faction = e.get(UnitFaction);
			if (!faction || faction.factionId !== "player") return null;
			return e;
		}
	}
	return null;
}
