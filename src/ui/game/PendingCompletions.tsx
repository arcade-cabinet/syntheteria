/**
 * PendingCompletions — HUD indicator showing what completes next turn.
 *
 * Positioned above the HUD bar. Shows fabrication, synthesis, and research
 * items that complete in 1 turn. This is the "stay for one more turn" hook.
 *
 * Diegetic vocabulary: "NEXT CYCLE" not "next turn".
 */

import type { World } from "koota";
import { TECH_BY_ID } from "../../config/techTreeDefs";
import { FabricationJob } from "../../ecs/systems/fabricationSystem";
import { getResearchState } from "../../ecs/systems/researchSystem";
import {
	FUSION_RECIPES,
	SynthesisQueue,
} from "../../ecs/systems/synthesisSystem";
import { Building } from "../../ecs/traits/building";

export interface PendingItem {
	label: string;
	type: "fabrication" | "synthesis" | "research";
}

/**
 * Gather items that complete next turn for the player faction.
 */
export function collectPendingItems(world: World): PendingItem[] {
	const items: PendingItem[] = [];

	for (const e of world.query(FabricationJob)) {
		const job = e.get(FabricationJob);
		if (!job || job.factionId !== "player") continue;
		if (job.turnsRemaining === 1) {
			items.push({
				label: job.robotClass.replace(/_/g, " "),
				type: "fabrication",
			});
		}
	}

	for (const e of world.query(Building, SynthesisQueue)) {
		const b = e.get(Building);
		const sq = e.get(SynthesisQueue);
		if (!b || !sq || b.factionId !== "player") continue;
		if (sq.ticksRemaining === 1) {
			const recipe = FUSION_RECIPES.find((r) => r.id === sq.recipeId);
			items.push({
				label: recipe?.label ?? sq.recipeId,
				type: "synthesis",
			});
		}
	}

	const state = getResearchState(world, "player");
	if (state?.currentTechId) {
		const tech = TECH_BY_ID.get(state.currentTechId);
		if (tech) {
			const turnsLeft = Math.max(
				0,
				tech.turnsToResearch - state.progressPoints,
			);
			if (turnsLeft === 1) {
				items.push({ label: tech.name, type: "research" });
			}
		}
	}

	return items;
}

const TYPE_COLORS: Record<PendingItem["type"], string> = {
	fabrication: "#7ee7cb",
	synthesis: "#8be6ff",
	research: "#b088d8",
};

const TYPE_ICONS: Record<PendingItem["type"], string> = {
	fabrication: "FAB",
	synthesis: "SYN",
	research: "RES",
};

export function PendingCompletions({ items }: { items: PendingItem[] }) {
	if (items.length === 0) return null;

	return (
		<div
			data-testid="pending-completions"
			style={{
				position: "absolute",
				bottom: 52,
				left: 20,
				display: "flex",
				gap: 10,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				pointerEvents: "none",
			}}
		>
			<span
				style={{
					fontSize: 8,
					letterSpacing: 2,
					color: "rgba(246, 197, 106, 0.6)",
					textTransform: "uppercase",
					alignSelf: "center",
				}}
			>
				NEXT CYCLE:
			</span>
			{items.map((item, i) => {
				const color = TYPE_COLORS[item.type];
				return (
					<span
						key={`${item.type}-${i}`}
						style={{
							fontSize: 10,
							color,
							opacity: 0.8,
						}}
					>
						<span style={{ fontSize: 8, opacity: 0.6, marginRight: 2 }}>
							{TYPE_ICONS[item.type]}
						</span>
						{item.label}
					</span>
				);
			})}
		</div>
	);
}
