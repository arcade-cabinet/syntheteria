export type GoalLayer = "reactive" | "deliberative" | "strategic";

export interface GoalFact {
	key: string;
	value: unknown;
}

export interface GoalContract {
	id: string;
	layer: GoalLayer;
	description: string;
	requiredFacts: string[];
	successFacts: string[];
}

export const GOAL_CONTRACTS: GoalContract[] = [
	{
		id: "service-logistics-route",
		layer: "deliberative",
		description: "Move cargo from a world source to a logistics hub.",
		requiredFacts: ["route.available", "cargo.capacity", "source.known"],
		successFacts: ["destination.inventory.increased"],
	},
	{
		id: "pursue-hostile-target",
		layer: "reactive",
		description: "Close distance to a hostile target for attack or pressure.",
		requiredFacts: ["target.visible", "path.available"],
		successFacts: ["target.in.range"],
	},
];
