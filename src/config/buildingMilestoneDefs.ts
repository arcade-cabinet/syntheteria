/**
 * Building milestone events — fired when buildings reach key upgrade tiers.
 */

export interface BuildingMilestone {
	readonly id: string;
	readonly buildingType: string;
	readonly tier: number;
	readonly title: string;
	readonly toastMessage: string;
	readonly speechLine: string;
}

export const BUILDING_MILESTONES: readonly BuildingMilestone[] = [
	{
		id: "motor_pool_t2",
		buildingType: "motor_pool",
		tier: 2,
		title: "Assembly Expanded",
		toastMessage:
			"Motor Pool upgraded — Support, Cavalry, and Ranged units now available!",
		speechLine: "FABRICATION CAPACITY EXPANDED. NEW CHASSIS PATTERNS ONLINE.",
	},
	{
		id: "motor_pool_t3",
		buildingType: "motor_pool",
		tier: 3,
		title: "Full Fabrication",
		toastMessage:
			"Motor Pool fully upgraded — Specialization tracks and Mark III-V unlocked!",
		speechLine:
			"FULL FABRICATION ACHIEVED. SPECIALIZATION PATHWAYS ACTIVE. MARK V CAPABLE.",
	},
	{
		id: "synthesizer_t2",
		buildingType: "synthesizer",
		tier: 2,
		title: "Advanced Synthesis",
		toastMessage: "Synthesizer upgraded — Advanced material recipes unlocked!",
		speechLine:
			"SYNTHESIS PROTOCOLS UPGRADED. ADVANCED MATERIAL CONVERSION ONLINE.",
	},
	{
		id: "storm_transmitter_t3",
		buildingType: "storm_transmitter",
		tier: 3,
		title: "Storm Mastery",
		toastMessage:
			"Storm Transmitter fully upgraded — Storm channeling active, new power buildings unlocked!",
		speechLine:
			"STORM MASTERY ACHIEVED. CHANNELING EXCESS ENERGY. POWER GRID OPTIMIZED.",
	},
	{
		id: "relay_tower_t2",
		buildingType: "relay_tower",
		tier: 2,
		title: "Network Expanded",
		toastMessage:
			"Relay Tower upgraded — Extended range, signal encryption active!",
		speechLine: "SIGNAL RANGE EXTENDED. ENCRYPTED CHANNELS ESTABLISHED.",
	},
	{
		id: "wormhole_started",
		buildingType: "wormhole_stabilizer",
		tier: 1,
		title: "Project Initiated",
		toastMessage:
			"🌀 Wormhole Stabilizer construction begun — 20 turns to completion!",
		speechLine:
			"WORMHOLE STABILIZATION PROJECT INITIATED. THE PATH HOME... OR BEYOND.",
	},
];

export function getBuildingMilestone(
	buildingType: string,
	tier: number,
): BuildingMilestone | undefined {
	return BUILDING_MILESTONES.find(
		(m) => m.buildingType === buildingType && m.tier === tier,
	);
}
