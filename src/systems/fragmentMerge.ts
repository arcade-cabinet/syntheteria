/**
 * Fragment merge system: detects when units from different fragments
 * are close enough to merge, then combines their fog data.
 */

import { deleteFragment, FOG_RES, getFragment } from "../ecs/terrain";
import type { UnitEntity } from "../ecs/types";
import { units } from "../ecs/world";

const MERGE_DISTANCE = 6; // world units

export interface MergeEvent {
	absorbedId: string;
	survivorId: string;
}

export function fragmentMergeSystem(): MergeEvent[] {
	const events: MergeEvent[] = [];
	const unitList = Array.from(units);

	for (let i = 0; i < unitList.length; i++) {
		for (let j = i + 1; j < unitList.length; j++) {
			const a = unitList[i];
			const b = unitList[j];

			if (a.mapFragment.fragmentId === b.mapFragment.fragmentId) continue;

			const dx = a.worldPosition.x - b.worldPosition.x;
			const dz = a.worldPosition.z - b.worldPosition.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= MERGE_DISTANCE) {
				const event = mergeFragments(a, b);
				if (event) events.push(event);
			}
		}
	}

	return events;
}

function mergeFragments(
	unitA: UnitEntity,
	unitB: UnitEntity,
): MergeEvent | null {
	const fragA = getFragment(unitA.mapFragment.fragmentId);
	const fragB = getFragment(unitB.mapFragment.fragmentId);
	if (!fragA || !fragB) return null;

	// Survivor keeps the larger fog coverage (count revealed cells)
	let countA = 0;
	let countB = 0;
	for (let i = 0; i < FOG_RES * FOG_RES; i++) {
		if (fragA.fog[i] > 0) countA++;
		if (fragB.fog[i] > 0) countB++;
	}

	const [survivor, absorbed] =
		countA >= countB ? [fragA, fragB] : [fragB, fragA];

	// Merge fog data — keep the higher detail level at each cell
	for (let i = 0; i < FOG_RES * FOG_RES; i++) {
		if (absorbed.fog[i] > survivor.fog[i]) {
			survivor.fog[i] = absorbed.fog[i];
		}
	}

	// Update all entities belonging to the absorbed fragment
	for (const entity of units) {
		if (entity.mapFragment.fragmentId === absorbed.id) {
			entity.mapFragment.fragmentId = survivor.id;
		}
	}

	survivor.mergedWith.add(absorbed.id);
	deleteFragment(absorbed.id);

	return { absorbedId: absorbed.id, survivorId: survivor.id };
}
