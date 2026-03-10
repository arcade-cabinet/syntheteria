/**
 * Action Registry — maps entity traits to available contextual actions.
 *
 * Every clickable entity in the world has traits (e.g. OreDeposit, MaterialCube,
 * Grabbable). This registry determines which actions appear in the radial menu
 * based on which traits the entity has.
 */

export interface Action {
	id: string;
	label: string;
	icon: string;
	enabled: boolean;
}

interface TraitPattern {
	traits: string[];
	actions: Action[];
}

const registry: TraitPattern[] = [
	{
		traits: ["OreDeposit"],
		actions: [
			{ id: "harvest", label: "Harvest", icon: "pickaxe", enabled: true },
		],
	},
	{
		traits: ["MaterialCube", "HeldBy"],
		actions: [
			{ id: "drop", label: "Drop", icon: "arrow-down", enabled: true },
			{ id: "throw", label: "Throw", icon: "arrow-up-right", enabled: true },
		],
	},
	{
		traits: ["MaterialCube", "Grabbable"],
		actions: [
			{ id: "grab", label: "Grab", icon: "hand", enabled: true },
		],
	},
	{
		traits: ["Hopper"],
		actions: [
			{ id: "insert", label: "Insert", icon: "inbox", enabled: true },
		],
	},
	{
		traits: ["Furnace"],
		actions: [
			{ id: "open", label: "Open", icon: "flame", enabled: true },
		],
	},
	{
		traits: ["Belt"],
		actions: [
			{ id: "rotate", label: "Rotate", icon: "rotate-cw", enabled: true },
		],
	},
	{
		traits: ["LightningRod"],
		actions: [
			{ id: "inspect", label: "Inspect", icon: "zap", enabled: true },
		],
	},
	{
		traits: ["Hackable"],
		actions: [
			{ id: "hack", label: "Hack", icon: "terminal", enabled: true },
		],
	},
];

/**
 * Return all actions available for an entity with the given traits.
 *
 * A pattern matches when *all* of its required traits are present in the
 * entity's trait set. More-specific patterns (more required traits) are
 * checked first so that, e.g., `['MaterialCube', 'HeldBy']` matches the
 * drop/throw pattern before the grab pattern.
 */
export function getActionsForEntity(traits: string[]): Action[] {
	const traitSet = new Set(traits);
	const actions: Action[] = [];
	const matchedIds = new Set<string>();

	// Sort patterns by specificity — more traits = higher priority
	const sorted = [...registry].sort(
		(a, b) => b.traits.length - a.traits.length,
	);

	for (const pattern of sorted) {
		if (pattern.traits.every((t) => traitSet.has(t))) {
			for (const action of pattern.actions) {
				if (!matchedIds.has(action.id)) {
					matchedIds.add(action.id);
					actions.push(action);
				}
			}
		}
	}

	return actions;
}
