/**
 * Maintenance bay repair system.
 *
 * Each turn during the environment phase, powered maintenance bays
 * heal friendly units within manhattan distance 2 by +2 HP (capped at maxHp).
 */

import type { World } from "koota";
import { Building, Powered } from "../traits/building";
import { UnitFaction, UnitPos, UnitStats } from "../traits/unit";

const REPAIR_RANGE = 2;
const REPAIR_AMOUNT = 2;

export function runRepairs(world: World): void {
	// Collect powered maintenance bays
	for (const bay of world.query(Building, Powered)) {
		const b = bay.get(Building);
		if (!b || b.buildingType !== "maintenance_bay") continue;

		const bayX = b.tileX;
		const bayZ = b.tileZ;
		const bayFaction = b.factionId;

		// Find friendly units within range
		for (const unit of world.query(UnitPos, UnitStats, UnitFaction)) {
			const faction = unit.get(UnitFaction);
			if (!faction || faction.factionId !== bayFaction) continue;

			const pos = unit.get(UnitPos);
			if (!pos) continue;

			const dist = Math.abs(pos.tileX - bayX) + Math.abs(pos.tileZ - bayZ);
			if (dist > REPAIR_RANGE) continue;

			const stats = unit.get(UnitStats);
			if (!stats || stats.hp >= stats.maxHp) continue;

			unit.set(UnitStats, {
				...stats,
				hp: Math.min(stats.hp + REPAIR_AMOUNT, stats.maxHp),
			});
		}
	}
}
