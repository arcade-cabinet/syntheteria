import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config/movementDefs";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits/unit";

/** Ranged — standoff fire, tanky, slow. QuadrupedTank.glb */
export const RANGED_DEFAULTS = {
	stats: {
		hp: 12,
		maxHp: 12,
		ap: 2,
		maxAp: 2,
		mp: 1,
		maxMp: 1,
		scanRange: 6,
		attack: 4,
		defense: 2,
		attackRange: 3,
		weightClass: "heavy" as const,
		robotClass: "ranged" as const,
		...MOVEMENT_PROFILES.ranged,
	},
	visual: { modelId: "ranged", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnRanged(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...RANGED_DEFAULTS.stats }),
		UnitVisual({ ...RANGED_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
