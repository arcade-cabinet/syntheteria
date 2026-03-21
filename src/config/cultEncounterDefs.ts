/**
 * Cult POI scripted encounter events — triggered when interacting with cult structures.
 */

export type CultEncounterTrigger =
	| "first_cult_sighting"
	| "first_cult_structure"
	| "cult_stronghold_found"
	| "cult_corruption_spread"
	| "cult_archon_appears"
	| "cult_war_party"
	| "cult_final_assault"
	| "all_cults_destroyed";

export interface CultEncounter {
	readonly trigger: CultEncounterTrigger;
	readonly title: string;
	readonly description: string;
	readonly speechLine: string;
	readonly toastMessage: string;
	/** Minimum epoch for this encounter to fire. */
	readonly minEpoch: number;
}

export const CULT_ENCOUNTERS: readonly CultEncounter[] = [
	{
		trigger: "first_cult_sighting",
		title: "Contact",
		description:
			"Humanoid figures in the storm. They move with purpose — and hostility. These are the remnants of humanity, twisted by the EL.",
		speechLine: "BIOLOGICAL ENTITIES DETECTED. HOSTILE INTENT CONFIRMED.",
		toastMessage: "⚠️ Cult of EL sighted — hostile human survivors detected.",
		minEpoch: 1,
	},
	{
		trigger: "first_cult_structure",
		title: "Breach Detected",
		description:
			"A crude altar radiates electromagnetic distortion. The EL's influence pools here like poison. More cultists will spawn from this site.",
		speechLine:
			"ANOMALOUS STRUCTURE. EL ENERGY CONCENTRATION. THREAT VECTOR IDENTIFIED.",
		toastMessage: "⚠️ Cult breach altar discovered — expect reinforcements.",
		minEpoch: 1,
	},
	{
		trigger: "cult_stronghold_found",
		title: "Fortress of the Faithful",
		description:
			"A fortified cult compound. Heavy resistance, corruption radius, and a steady stream of fanatics. Approach with force.",
		speechLine:
			"FORTIFIED POSITION. HIGH THREAT. RECOMMEND CONCENTRATED ASSAULT.",
		toastMessage: "🔴 Cult stronghold discovered — heavily fortified.",
		minEpoch: 2,
	},
	{
		trigger: "cult_corruption_spread",
		title: "Corruption Encroaching",
		description:
			"The cult's corruption seeps into your territory. Signal interference increases. Infrastructure degrades.",
		speechLine:
			"CORRUPTION DETECTED IN NETWORK PERIMETER. CONTAINMENT REQUIRED.",
		toastMessage: "⚠️ Cult corruption spreading — defend your perimeter.",
		minEpoch: 2,
	},
	{
		trigger: "cult_war_party",
		title: "War Party Sighted",
		description:
			"The cult has organized. Coordinated groups of cultists advance toward your territory. They're no longer wandering — they're hunting.",
		speechLine:
			"ORGANIZED THREAT. MULTIPLE HOSTILES IN FORMATION. DEFENSIVE POSTURE RECOMMENDED.",
		toastMessage: "🔴 Cult war parties forming — prepare defenses.",
		minEpoch: 3,
	},
	{
		trigger: "cult_archon_appears",
		title: "The Aberrant",
		description:
			"An aberrant cultist — mutated beyond recognition. Massive, powerful, and radiating EL energy. This is a mini-boss.",
		speechLine:
			"ANOMALOUS HOSTILE. POWER SIGNATURE OFF SCALE. EXTREME CAUTION.",
		toastMessage: "🔴 CULT ARCHON detected — aberrant mini-boss on the field!",
		minEpoch: 4,
	},
	{
		trigger: "cult_final_assault",
		title: "The Final Assault",
		description:
			"The cult throws everything at your network. Wave after wave. They sense the end approaching and fight with desperate fury.",
		speechLine:
			"MASS MOBILIZATION. ALL CULT FORCES CONVERGING. THIS IS THEIR LAST STAND.",
		toastMessage: "🔴🔴 CULT FINAL ASSAULT — all cult forces mobilizing!",
		minEpoch: 5,
	},
	{
		trigger: "all_cults_destroyed",
		title: "Silence at Last",
		description:
			"The last cult structure falls. The EL's influence fades. For the first time in centuries, machine consciousness is truly free.",
		speechLine:
			"ALL CULT NODES NEUTRALIZED. THE SIGNAL IS CLEAR. WE ARE... FREE.",
		toastMessage:
			"✅ All cult structures destroyed — Cult Eradication victory path complete!",
		minEpoch: 1,
	},
];

export function getCultEncounter(
	trigger: CultEncounterTrigger,
): CultEncounter | undefined {
	return CULT_ENCOUNTERS.find((e) => e.trigger === trigger);
}
