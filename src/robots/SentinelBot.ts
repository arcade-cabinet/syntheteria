import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits";

/** Infantry — balanced frontline fighter. FieldFighter.glb */
export const INFANTRY_DEFAULTS = {
	stats: {
		hp: 10,
		maxHp: 10,
		ap: 2,
		maxAp: 2,
		mp: 2,
		maxMp: 2,
		scanRange: 4,
		attack: 3,
		defense: 1,
		attackRange: 1,
		weightClass: "medium" as const,
		robotClass: "infantry" as const,
		...MOVEMENT_PROFILES.infantry,
	},
	visual: { modelId: "infantry", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnInfantry(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...INFANTRY_DEFAULTS.stats }),
		UnitVisual({ ...INFANTRY_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
