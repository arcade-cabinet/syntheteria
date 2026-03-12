import { BOT_SPEECH_LABELS, getBotCommandProfile } from "../bots";
import { Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { getActiveLocationContext } from "./locationContext";
import type { WorldSessionSnapshot } from "./snapshots";
import type { RuntimeState } from "./runtimeState.types";

export interface BriefingBubbleViewModel {
	id: string;
	title: string;
	body: string;
	tone: "signal" | "mint" | "amber" | "crimson";
	anchor: "selected-unit" | "nearby-site" | "active-site";
	screenHint: "top-left" | "top-center" | "top-right";
}

function getSelectedUnitBubble(): BriefingBubbleViewModel | null {
	const selectedUnit = Array.from(units).find((unit) => unit.get(Unit)?.selected);
	if (!selectedUnit) {
		return null;
	}

	const unit = selectedUnit.get(Unit);
	const position = selectedUnit.get(WorldPosition);
	if (!unit || !position) {
		return null;
	}

	const speechLabel = BOT_SPEECH_LABELS[unit.speechProfile];
	const commandProfile = getBotCommandProfile(unit.type);
	return {
		id: `unit:${unit.displayName}`,
		title: speechLabel,
		body: `${unit.displayName} standing by at X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}. ${commandProfile.roleBrief} Priority: ${commandProfile.tutorialPrompt}`,
		tone: "mint",
		anchor: "selected-unit",
		screenHint: "top-left",
	};
}

export function getActiveBriefingBubbles(args: {
	runtime: RuntimeState;
	session: WorldSessionSnapshot | null;
}): BriefingBubbleViewModel[] {
	const { runtime, session } = args;
	const bubbles: BriefingBubbleViewModel[] = [];

	const unitBubble = getSelectedUnitBubble();
	if (unitBubble) {
		bubbles.push(unitBubble);
	}

	const { activeCity, poi, presentation } = getActiveLocationContext({
		activeCityInstanceId: runtime.activeCityInstanceId,
		activeScene: runtime.activeScene,
		nearbyPoi: runtime.nearbyPoi,
		session,
	});

	if (poi) {
		bubbles.push({
			id: `poi:${poi.id}`,
			title: presentation?.badge ?? poi.name,
			body:
				presentation?.summary ??
				(activeCity
					? `${activeCity.name} remains linked to this sector. Use the radial or site brief to inspect or extend local capabilities.`
					: `${poi.name} is within relay range. Survey and reclamation actions are available.`),
			tone: runtime.activeScene === "city" ? "signal" : "amber",
			anchor: runtime.activeScene === "city" ? "active-site" : "nearby-site",
			screenHint: unitBubble ? "top-right" : "top-center",
		});
	}

	return bubbles.slice(0, 2);
}
