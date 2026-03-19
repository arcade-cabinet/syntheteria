import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config/movementDefs";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits/unit";

/** Support — repair, buff, utility. Companion-bot.glb */
export const SUPPORT_DEFAULTS = {
	stats: {
		hp: 7,
		maxHp: 7,
		ap: 2,
		maxAp: 2,
		mp: 2,
		maxMp: 2,
		scanRange: 4,
		attack: 1,
		defense: 0,
		attackRange: 1,
		weightClass: "medium" as const,
		robotClass: "support" as const,
		...MOVEMENT_PROFILES.support,
	},
	visual: { modelId: "support", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnSupport(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...SUPPORT_DEFAULTS.stats }),
		UnitVisual({ ...SUPPORT_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
