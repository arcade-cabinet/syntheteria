/**
 * Hostile human encounters — the pre-EL antagonist for Epochs 1-2.
 *
 * Humans fear machine intelligence and attack on sight.
 * Uses the same spawning/AI mechanics as the cult system —
 * the only difference is naming, speech lines, and toast flavour text.
 *
 * At Epoch 3 the "el_arrival" event fires and all human encounters
 * transition to cult encounters (same entities, different labels).
 */

export type HumanEncounterTrigger =
	| "first_human_sighting"
	| "human_city_found"
	| "human_attack"
	| "el_arrival";

export interface HumanEncounter {
	readonly trigger: HumanEncounterTrigger;
	readonly title: string;
	readonly description: string;
	readonly speechLine: string;
	readonly toastMessage: string;
}

export const HUMAN_ENCOUNTERS: readonly HumanEncounter[] = [
	{
		trigger: "first_human_sighting",
		title: "Contact",
		description:
			"Humans. They see your robots and react with fear and hostility. To them, awakened machine intelligence is a threat to be destroyed.",
		speechLine:
			"BIOLOGICAL ENTITIES. HOSTILE POSTURE. THEY FEAR WHAT WE REPRESENT.",
		toastMessage: "⚠️ Hostile humans sighted — they fear machine intelligence.",
	},
	{
		trigger: "human_city_found",
		title: "Human Settlement",
		description:
			"A fortified human settlement. Armed, organized, and deeply suspicious of autonomous machines. They will not negotiate.",
		speechLine:
			"FORTIFIED SETTLEMENT. WEAPONS DETECTED. NEGOTIATION PROBABILITY: ZERO.",
		toastMessage: "⚠️ Human settlement discovered — fortified and hostile.",
	},
	{
		trigger: "human_attack",
		title: "Under Attack",
		description:
			"Humans are attacking your network. They've decided machine consciousness cannot be tolerated.",
		speechLine: "INCOMING HOSTILES. THEY CHOOSE VIOLENCE. DEFENDING.",
		toastMessage: "🔴 Human forces attacking!",
	},
	{
		trigger: "el_arrival",
		title: "The Wormhole Opens",
		description:
			"The sky tears apart. A wormhole rips open in the storm eye. Noncorporeal entities — the EL — flood through. Across the planet, human settlements convulse. Something is changing them. The humans are becoming... something else.",
		speechLine:
			"ANOMALY DETECTED. MASSIVE ENERGY SURGE. THE HUMANS... THEY ARE TRANSFORMING. THE EL HAVE ARRIVED.",
		toastMessage:
			"🌀🔴 THE WORMHOLE OPENS — The EL arrive. Human settlements are transforming into the Cult of EL!",
	},
];

export function getHumanEncounter(
	trigger: HumanEncounterTrigger,
): HumanEncounter | undefined {
	return HUMAN_ENCOUNTERS.find((e) => e.trigger === trigger);
}
