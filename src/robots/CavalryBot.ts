import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config/movementDefs";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits";

/** Cavalry — fast strike, flanking. Arachnoid.glb */
export const CAVALRY_DEFAULTS = {
	stats: {
		hp: 7,
		maxHp: 7,
		ap: 2,
		maxAp: 2,
		mp: 4,
		maxMp: 4,
		scanRange: 5,
		attack: 3,
		defense: 0,
		attackRange: 1,
		weightClass: "medium" as const,
		robotClass: "cavalry" as const,
		...MOVEMENT_PROFILES.cavalry,
	},
	visual: { modelId: "cavalry", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnCavalry(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CAVALRY_DEFAULTS.stats }),
		UnitVisual({ ...CAVALRY_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
