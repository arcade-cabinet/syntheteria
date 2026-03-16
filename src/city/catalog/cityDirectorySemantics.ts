import { buildCityDirectorySummaries } from "./cityUnderstanding";

export interface CityDirectorySemanticDefinition {
	directory: "." | "Details" | "Walls";
	label: string;
	role: string;
	primaryUse: string[];
	defaultPassabilityExpectation:
		| "mixed"
		| "impassable"
		| "support"
		| "passable";
}

export const CITY_DIRECTORY_SEMANTICS: CityDirectorySemanticDefinition[] = [
	{
		directory: ".",
		label: "Structural Root",
		role: "Primary structural pieces, portals, vertical connectors, props, and optional floor accents.",
		primaryUse: [
			"core structural placement",
			"substation composition",
			"roof and prop support",
		],
		defaultPassabilityExpectation: "mixed",
	},
	{
		directory: "Details",
		label: "Detail Overlays",
		role: "Fine-grain overlays, surface dressing, signage, vents, pipes, and local readability accents.",
		primaryUse: [
			"surface detail",
			"zone differentiation",
			"composite refinement",
		],
		defaultPassabilityExpectation: "support",
	},
	{
		directory: "Walls",
		label: "Edge Structures",
		role: "Barrier, portal, and window modules that define enclosed rooms, corridors, and transitions.",
		primaryUse: ["room sealing", "door transitions", "edge readability"],
		defaultPassabilityExpectation: "impassable",
	},
];

export function getCityDirectorySemantics(directory: string) {
	return (
		CITY_DIRECTORY_SEMANTICS.find((entry) => entry.directory === directory) ??
		null
	);
}

export function validateCityDirectoryCoverage() {
	const summaries = buildCityDirectorySummaries();
	return summaries.every((summary) =>
		getCityDirectorySemantics(summary.directory),
	);
}
