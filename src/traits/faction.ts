import { trait } from "koota";

export const Faction = trait({
	id: "",
	displayName: "",
	color: 0xffffff,
	persona: "otter" as "otter" | "fox" | "raven" | "lynx" | "bear",
	isPlayer: false,
	aggression: 0,
});

export const FactionRelation = trait({
	factionA: "",
	factionB: "",
	relation: "neutral" as "ally" | "neutral" | "hostile",
	/** Granular standing value (-100 to +100). Drives the 3-state relation. */
	standing: 0,
});
