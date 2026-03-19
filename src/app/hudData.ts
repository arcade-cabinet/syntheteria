/**
 * HUD data collectors — read-only queries into ECS for UI display.
 *
 * These functions extract display data from the world without mutation.
 * The app shell calls them each frame/turn to feed the HUD component.
 */

import type { WorldType } from "../create-world";
import { TECH_BY_ID } from "../config/techTreeDefs";
import { PLAYER_MAX_AP } from "../config/gameDefaults";
import { FUSION_RECIPES, SynthesisQueue } from "../systems/synthesisSystem";
import { FabricationJob } from "../systems/fabricationSystem";
import { getResearchState } from "../systems/researchSystem";
import { Building } from "../traits/building";
import { UnitFaction, UnitStats } from "../traits/unit";
import type { CurrentResearch, ProductionQueueItem } from "../ui/game/HUD";

/** Read current AP for the first player unit found. */
export function readPlayerAp(world: WorldType): number {
	for (const entity of world.query(UnitFaction, UnitStats)) {
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (faction?.factionId === "player" && stats) return stats.ap;
	}
	return PLAYER_MAX_AP;
}

/** Collect production queue items (fabrication + synthesis) for the player. */
export function getProductionQueue(world: WorldType): ProductionQueueItem[] {
	const items: ProductionQueueItem[] = [];

	for (const e of world.query(FabricationJob)) {
		const job = e.get(FabricationJob);
		if (!job || job.factionId !== "player") continue;
		items.push({
			building: "Motor Pool",
			product: job.robotClass.replace(/_/g, " "),
			turnsLeft: job.turnsRemaining,
		});
	}

	for (const e of world.query(Building, SynthesisQueue)) {
		const b = e.get(Building);
		const sq = e.get(SynthesisQueue);
		if (!b || !sq || b.factionId !== "player") continue;
		const recipe = FUSION_RECIPES.find((r) => r.id === sq.recipeId);
		items.push({
			building: "Synthesizer",
			product: recipe?.label ?? sq.recipeId,
			turnsLeft: sq.ticksRemaining,
		});
	}

	return items;
}

/** Get current research progress for HUD display. */
export function getCurrentResearchForHUD(world: WorldType): CurrentResearch | null {
	const state = getResearchState(world, "player");
	if (!state || !state.currentTechId) return null;
	const tech = TECH_BY_ID.get(state.currentTechId);
	if (!tech) return null;
	return {
		techName: tech.name,
		progressPoints: state.progressPoints,
		turnsToResearch: tech.turnsToResearch,
		labCount: state.labCount,
	};
}
