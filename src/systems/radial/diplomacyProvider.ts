/**
 * Radial provider: Diplomacy.
 *
 * Diplomatic actions (declare war, propose alliance) for non-player units.
 * Self-registers via registerRadialProvider().
 */

import type { World } from "koota";
import { playSfx } from "../../audio/sfx";
import { getRelation } from "../../factions/relations";
import {
	declareWar,
	getDiplomacyPersonality,
	proposeAlliance,
} from "../../systems/diplomacySystem";
import { clearHighlights } from "../../systems/highlightSystem";
import { Board } from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import { getWorldRef } from "./providerState";

function readTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

// --- DIPLOMACY provider ---

registerRadialProvider({
	id: "diplomacy",
	category: {
		id: "diplomacy",
		label: "Diplomacy",
		icon: "\uD83E\uDD1D",
		tone: "neutral",
		priority: 8,
	},
	getActions: (ctx: RadialOpenContext) => {
		// Only show on non-player units
		if (ctx.selectionType !== "unit") return [];
		if (!ctx.targetFaction || ctx.targetFaction === "player") return [];

		const worldRef = getWorldRef();
		if (!worldRef) return [];

		const world = worldRef;
		const targetFaction = ctx.targetFaction;

		const relation = getRelation(world, "player", targetFaction);
		const personality = getDiplomacyPersonality(targetFaction);
		const turn = readTurn(world);

		const actions: Array<{
			id: string;
			label: string;
			icon: string;
			tone: string;
			enabled: boolean;
			disabledReason?: string;
			onExecute: () => void;
		}> = [];

		if (relation !== "hostile") {
			// Can declare war if not already hostile
			actions.push({
				id: "declare_war",
				label: "Declare War",
				icon: "\u2694",
				tone: "hostile",
				enabled: true,
				onExecute: () => {
					declareWar(world, "player", targetFaction, turn);
					playSfx("attack_hit");
					clearHighlights(world);
				},
			});
		}

		if (relation === "neutral") {
			// Can propose alliance if neutral
			const canAlly = personality?.acceptsAlliance ?? false;
			actions.push({
				id: "propose_alliance",
				label: "Propose Alliance",
				icon: "\uD83E\uDD1D",
				tone: "neutral",
				enabled: canAlly,
				disabledReason: canAlly ? undefined : "This faction refuses alliances",
				onExecute: () => {
					const accepted = proposeAlliance(
						world,
						"player",
						targetFaction,
						turn,
					);
					if (accepted) {
						playSfx("build_complete");
					}
					clearHighlights(world);
				},
			});
		}

		return actions;
	},
});
