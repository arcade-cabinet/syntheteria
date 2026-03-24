/**
 * Fragment merge system: detects when units from different fragments
 * are close enough to merge, then combines their fog data.
 */

import type { Entity } from "koota";
import { deleteFragment, FOG_RES, getFragment } from "../ecs/terrain";
import { Fragment, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";

const MERGE_DISTANCE = 6; // world units

export interface MergeEvent {
	absorbedId: string;
	survivorId: string;
}

export function fragmentMergeSystem(): MergeEvent[] {
	const events: MergeEvent[] = [];
	const unitList = Array.from(world.query(Position, Unit, Fragment));

	for (let i = 0; i < unitList.length; i++) {
		for (let j = i + 1; j < unitList.length; j++) {
			const a = unitList[i];
			const b = unitList[j];

			const aFrag = a.get(Fragment)!;
			const bFrag = b.get(Fragment)!;

			if (aFrag.fragmentId === bFrag.fragmentId) continue;

			const aPos = a.get(Position)!;
			const bPos = b.get(Position)!;
			const dx = aPos.x - bPos.x;
			const dz = aPos.z - bPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= MERGE_DISTANCE) {
				const event = mergeFragments(a, b);
				if (event) events.push(event);
			}
		}
	}

	return events;
}

function mergeFragments(unitA: Entity, unitB: Entity): MergeEvent | null {
	const fragAId = unitA.get(Fragment)?.fragmentId;
	const fragBId = unitB.get(Fragment)?.fragmentId;
	const fragA = getFragment(fragAId);
	const fragB = getFragment(fragBId);
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

	// Merge fog data -- keep the higher detail level at each cell
	for (let i = 0; i < FOG_RES * FOG_RES; i++) {
		if (absorbed.fog[i] > survivor.fog[i]) {
			survivor.fog[i] = absorbed.fog[i];
		}
	}

	// Update all entities belonging to the absorbed fragment
	for (const entity of world.query(Fragment)) {
		if (entity.get(Fragment)?.fragmentId === absorbed.id) {
			entity.set(Fragment, { fragmentId: survivor.id });
		}
	}

	survivor.mergedWith.add(absorbed.id);
	deleteFragment(absorbed.id);

	return { absorbedId: absorbed.id, survivorId: survivor.id };
}
