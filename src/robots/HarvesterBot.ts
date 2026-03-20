import type { World } from "koota";
import { MOVEMENT_PROFILES } from "../config";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits";

/** Worker — builds bases, harvests resources. MobileStorageBot.glb */
export const WORKER_DEFAULTS = {
	stats: {
		hp: 8,
		maxHp: 8,
		ap: 2,
		maxAp: 2,
		mp: 1,
		maxMp: 1,
		scanRange: 3,
		attack: 0,
		defense: 0,
		attackRange: 0,
		weightClass: "heavy" as const,
		robotClass: "worker" as const,
		...MOVEMENT_PROFILES.worker,
	},
	visual: { modelId: "worker", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnWorker(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	return world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...WORKER_DEFAULTS.stats }),
		UnitVisual({ ...WORKER_DEFAULTS.visual }),
		UnitFaction({ factionId }),
	);
}
