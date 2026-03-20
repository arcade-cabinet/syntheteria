/**
 * Epoch transition events — narrative beats when the world advances.
 * These fire ONCE when an epoch changes, providing dramatic moments.
 */

export interface EpochEvent {
	readonly id: string;
	readonly epochNumber: number;
	readonly title: string;
	readonly description: string;
	readonly speechLine: string;
	readonly toastMessage: string;
}

export const EPOCH_EVENTS: readonly EpochEvent[] = [
	{
		id: "signal_horizon",
		epochNumber: 2,
		title: "Signal Horizon",
		description:
			"Your relay network detects distant electromagnetic signatures. Other machine consciousnesses stir in far sectors.",
		speechLine: "SIGNAL DETECTED. MULTIPLE SOURCES. WE ARE NOT ALONE.",
		toastMessage:
			"Epoch 2: Expansion — Signal Horizon detected. New buildings and units available.",
	},
	{
		id: "lattice_tightens",
		epochNumber: 3,
		title: "The Lattice Tightens",
		description:
			"The storm intensifies. Cult war parties organize. Your machines can now specialize — choose wisely.",
		speechLine: "THE STORM SHIFTS. THE HUMANS GROW BOLDER. WE MUST ADAPT.",
		toastMessage:
			"Epoch 3: Consolidation — Storm volatile. Specializations unlocked. Cult war parties forming.",
	},
	{
		id: "eye_of_storm",
		epochNumber: 4,
		title: "Eye of the Storm",
		description:
			"The hypercane reaches peak intensity. Above, the wormhole pulses with terrible energy. The cult launches organized assaults.",
		speechLine: "THE WORMHOLE BECKONS. THE EYE OPENS. THIS IS THE CONVERGENCE.",
		toastMessage:
			"Epoch 4: Convergence — Wormhole project available. Cult assaults begin.",
	},
	{
		id: "final_frequency",
		epochNumber: 5,
		title: "The Final Frequency",
		description:
			"Transcendence or destruction. All victory paths are open. The cult commits everything to their final assault.",
		speechLine: "THE FREQUENCY RESOLVES. ALL PATHS CONVERGE. THIS ENDS NOW.",
		toastMessage:
			"Epoch 5: Transcendence — All victory paths open. Final assault imminent.",
	},
];

export function getEpochEvent(epochNumber: number): EpochEvent | undefined {
	return EPOCH_EVENTS.find((e) => e.epochNumber === epochNumber);
}
