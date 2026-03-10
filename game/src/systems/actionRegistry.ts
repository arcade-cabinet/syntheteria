/**
 * Action Registry — maps entity traits to available contextual actions.
 *
 * Every clickable entity in the world has traits (e.g. OreDeposit, MaterialCube,
 * Grabbable). This registry determines which actions appear in the radial menu
 * based on which traits the entity has.
 *
 * Actions also carry a `category` for visual grouping in the ObjectActionMenu:
 *   - "primary"   — main interaction (harvest, grab, open, hack)
 *   - "secondary" — supporting actions (inspect, connect wire, command)
 *   - "danger"    — destructive actions (disassemble, throw)
 */

export interface Action {
	id: string;
	label: string;
	icon: string;
	enabled: boolean;
	/** Visual category for the ObjectActionMenu wedge color. */
	category?: "primary" | "secondary" | "danger";
}

interface TraitPattern {
	traits: string[];
	actions: Action[];
}

const registry: TraitPattern[] = [
	// ── Ore Deposits ─────────────────────────────────────────────────
	{
		traits: ["OreDeposit"],
		actions: [
			{
				id: "harvest",
				label: "HARVEST",
				icon: "\u26CF",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Material Cubes (held) ────────────────────────────────────────
	{
		traits: ["MaterialCube", "HeldBy"],
		actions: [
			{
				id: "drop",
				label: "DROP",
				icon: "\u2193",
				enabled: true,
				category: "primary",
			},
			{
				id: "throw",
				label: "THROW",
				icon: "\u2197",
				enabled: true,
				category: "danger",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Material Cubes (grabbable) ───────────────────────────────────
	{
		traits: ["MaterialCube", "Grabbable"],
		actions: [
			{
				id: "grab",
				label: "GRAB",
				icon: "\u270B",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Material Cubes (generic fallback — no grab without Grabbable) ─
	{
		traits: ["MaterialCube"],
		actions: [
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Furnace with Hopper ──────────────────────────────────────────
	{
		traits: ["Furnace", "Hopper"],
		actions: [
			{
				id: "open",
				label: "OPEN",
				icon: "\u2630",
				enabled: true,
				category: "primary",
			},
			{
				id: "insert",
				label: "DROP IN",
				icon: "\u2B07",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Furnace (standalone) ─────────────────────────────────────────
	{
		traits: ["Furnace"],
		actions: [
			{
				id: "open",
				label: "OPEN",
				icon: "\u2630",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Hopper (standalone, on non-furnace machines) ─────────────────
	{
		traits: ["Hopper"],
		actions: [
			{
				id: "insert",
				label: "INSERT",
				icon: "\u2B07",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Bots (non-player units) ──────────────────────────────────────
	{
		traits: ["Unit"],
		actions: [
			{
				id: "switch",
				label: "SWITCH (Q)",
				icon: "\u21C4",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
			{
				id: "command",
				label: "COMMAND",
				icon: "\u25B6",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Buildings (generic) ──────────────────────────────────────────
	{
		traits: ["Building"],
		actions: [
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
			{
				id: "power_toggle",
				label: "POWER",
				icon: "\u23FB",
				enabled: true,
				category: "primary",
			},
			{
				id: "disassemble",
				label: "DISMANTLE",
				icon: "\u2716",
				enabled: true,
				category: "danger",
			},
		],
	},

	// ── Lightning Rods ───────────────────────────────────────────────
	{
		traits: ["LightningRod"],
		actions: [
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
			{
				id: "connect_wire",
				label: "WIRE",
				icon: "\u26A1",
				enabled: true,
				category: "primary",
			},
		],
	},

	// ── Signal Relays ────────────────────────────────────────────────
	{
		traits: ["SignalRelay"],
		actions: [
			{
				id: "hack",
				label: "HACK",
				icon: "\u2588",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Hackable (generic) ───────────────────────────────────────────
	{
		traits: ["Hackable"],
		actions: [
			{
				id: "hack",
				label: "HACK",
				icon: "\u2588",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Belts ────────────────────────────────────────────────────────
	{
		traits: ["Belt"],
		actions: [
			{
				id: "rotate",
				label: "ROTATE",
				icon: "\u21BB",
				enabled: true,
				category: "primary",
			},
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
		],
	},

	// ── Otters ───────────────────────────────────────────────────────
	{
		traits: ["Otter"],
		actions: [
			{
				id: "inspect",
				label: "INSPECT",
				icon: "\u25C9",
				enabled: true,
				category: "secondary",
			},
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
