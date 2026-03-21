import type { World } from "koota";
import { UnitMove, UnitPos, UnitStats } from "../traits";
import { effectiveScanRange, revealFog } from "./fogRevealSystem";
import { fireTutorialTooltip } from "./tutorialTooltips";

const MOVE_SPEED = 4.0; // tiles per second

export function movementSystem(world: World, deltaSeconds: number): void {
	for (const entity of world.query(UnitMove, UnitStats)) {
		const move = entity.get(UnitMove);
		const stats = entity.get(UnitStats);
		if (!move || !stats) continue;
		const newProgress = Math.min(
			1.0,
			move.progress + deltaSeconds * MOVE_SPEED,
		);
		entity.set(UnitMove, { ...move, progress: newProgress });

		if (newProgress >= 1.0) {
			entity.set(UnitPos, { tileX: move.toX, tileZ: move.toZ });
			entity.set(UnitStats, {
				...stats,
				mp: Math.max(0, stats.mp - move.mpCost),
				movesUsed: stats.movesUsed + 1,
			});
			entity.remove(UnitMove);

			// Reveal fog around new position — storm interference clears as sensors scan
			const scanRange = effectiveScanRange(
				world,
				move.toX,
				move.toZ,
				stats.scanRange,
			);
			revealFog(world, move.toX, move.toZ, scanRange);

			fireTutorialTooltip("first_move");
		}
	}
}
