import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits";

/** Scout — fast recon, high AP and scan range, fragile. ReconBot.glb */
export const SCOUT_DEFAULTS = {
	stats: {
		hp: 5,
		maxHp: 5,
		ap: 2,
		maxAp: 2,
		mp: 6,
		maxMp: 6,
		scanRange: 8,
		attack: 1,
		defense: 0,
		attackRange: 1,
		weightClass: "light" as const,
		robotClass: "scout" as const,
		...MOVEMENT_PROFILES.scout,
	},
	visual: { modelId: "scout", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnScout(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...SCOUT_DEFAULTS.stats }),
		UnitVisual({ ...SCOUT_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
