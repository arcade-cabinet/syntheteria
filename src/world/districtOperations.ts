import { addResource, spendResource } from "../systems/resources";
import type { CityInstanceState, WorldPoiType } from "./contracts";
import type { DistrictCapabilityId } from "./districtCapabilities";
import { getDistrictCapabilities } from "./districtCapabilities";
import {
	type DistrictStructureId,
	getDistrictStructures,
} from "./districtStructures";
import { getRuntimeState, pushDistrictEvent } from "./runtimeState";

export type DistrictOperationId =
	| "fabricate_components"
	| "stage_salvage"
	| "extend_relay"
	| "capture_lightning"
	| "fortify_substation"
	| "open_transit"
	| "review_archive"
	| "survey_gateway"
	| "contest_incursion";

export interface DistrictOperationViewModel {
	id: DistrictOperationId;
	label: string;
	status: "available" | "latent" | "hostile" | "locked";
	description: string;
	requires: DistrictStructureId[];
}

export interface ExecutedDistrictOperation {
	operation: DistrictOperationViewModel;
	resourceDelta: {
		scrapMetal: number;
		eWaste: number;
		intactComponents: number;
	};
}

const OPERATION_RULES: Array<{
	id: DistrictOperationId;
	label: string;
	description: string;
	requiredCapabilities: DistrictCapabilityId[];
	requiredStructures: DistrictStructureId[];
}> = [
	{
		id: "fabricate_components",
		label: "Fabricate Components",
		description:
			"Activate fabrication throughput and queue recovery-grade component output.",
		requiredCapabilities: ["fabrication"],
		requiredStructures: ["fabrication_block", "substation_core"],
	},
	{
		id: "stage_salvage",
		label: "Stage Salvage",
		description:
			"Stabilize salvage vaults and stage recovered material for district use.",
		requiredCapabilities: ["storage", "salvage"],
		requiredStructures: ["storage_block"],
	},
	{
		id: "extend_relay",
		label: "Extend Relay",
		description:
			"Strengthen command reach and synchronize district signal resilience.",
		requiredCapabilities: ["relay"],
		requiredStructures: ["relay_spine"],
	},
	{
		id: "capture_lightning",
		label: "Capture Lightning",
		description:
			"Ground storm energy through the district sink array for local power hardening.",
		requiredCapabilities: ["power_sink"],
		requiredStructures: ["power_sink_array"],
	},
	{
		id: "fortify_substation",
		label: "Fortify Substation",
		description:
			"Anchor defensive hardpoints and harden the district against hostile pressure.",
		requiredCapabilities: ["defense"],
		requiredStructures: ["defensive_gate", "substation_core"],
	},
	{
		id: "open_transit",
		label: "Open Transit",
		description:
			"Commit district lanes to fast routing and movement staging within the sector.",
		requiredCapabilities: ["transit"],
		requiredStructures: ["transit_node"],
	},
	{
		id: "review_archive",
		label: "Review Archive",
		description:
			"Pull memory strata and machine records from archive stacks for campaign insight.",
		requiredCapabilities: ["archive", "research"],
		requiredStructures: ["archive_cluster"],
	},
	{
		id: "survey_gateway",
		label: "Survey Gateway",
		description:
			"Map the gateway spine and prepare future route access for late-campaign transition.",
		requiredCapabilities: ["gateway_access"],
		requiredStructures: ["transit_node", "relay_spine"],
	},
	{
		id: "contest_incursion",
		label: "Contest Incursion",
		description:
			"Suppress hostile occupation and reclaim district control from cult or rogue pressure.",
		requiredCapabilities: ["hostile_presence"],
		requiredStructures: ["cult_incursion_structure", "defensive_gate"],
	},
];

const STATUS_PRIORITY = {
	hostile: 3,
	locked: 2,
	latent: 1,
	online: 0,
} as const;

function resolveOperationStatus(args: {
	poiType: WorldPoiType;
	state: CityInstanceState;
	requiredCapabilities: DistrictCapabilityId[];
	requiredStructures: DistrictStructureId[];
}): DistrictOperationViewModel["status"] {
	const capabilities = getDistrictCapabilities({
		poiType: args.poiType,
		state: args.state,
	});
	const structures = getDistrictStructures({
		poiType: args.poiType,
		state: args.state,
	});

	const capabilityStatuses = capabilities
		.filter((capability) => args.requiredCapabilities.includes(capability.id))
		.map((capability) => capability.status);
	const structureStatuses = structures
		.filter((structure) => args.requiredStructures.includes(structure.id))
		.map((structure) => structure.status);
	const worstStatus = [...capabilityStatuses, ...structureStatuses].sort(
		(a, b) => STATUS_PRIORITY[b] - STATUS_PRIORITY[a],
	)[0];

	switch (worstStatus) {
		case "hostile":
			return "hostile";
		case "locked":
			return "locked";
		case "latent":
			return "latent";
		default:
			return "available";
	}
}

export function getDistrictOperations(args: {
	poiType: WorldPoiType;
	state: CityInstanceState;
	structures?: ReturnType<typeof getDistrictStructures>;
}) {
	const structures =
		args.structures ??
		getDistrictStructures({ poiType: args.poiType, state: args.state });
	return OPERATION_RULES.filter((rule) => {
		return rule.requiredStructures.every((required) =>
			structures.some((structure) => structure.id === required),
		);
	}).map((rule) => ({
		id: rule.id,
		label: rule.label,
		description: rule.description,
		status: resolveOperationStatus({
			poiType: args.poiType,
			state: args.state,
			requiredCapabilities: rule.requiredCapabilities,
			requiredStructures: rule.requiredStructures,
		}),
		requires: rule.requiredStructures,
	}));
}

const OPERATION_EFFECTS: Record<
	DistrictOperationId,
	{
		cost?: Partial<
			Record<"scrapMetal" | "eWaste" | "intactComponents", number>
		>;
		gain?: Partial<
			Record<"scrapMetal" | "eWaste" | "intactComponents", number>
		>;
	}
> = {
	fabricate_components: {
		cost: { scrapMetal: 2, eWaste: 1 },
		gain: { intactComponents: 2 },
	},
	stage_salvage: {
		gain: { scrapMetal: 3, eWaste: 1 },
	},
	extend_relay: {
		cost: { eWaste: 1 },
	},
	capture_lightning: {
		gain: { eWaste: 1, intactComponents: 1 },
	},
	fortify_substation: {
		cost: { scrapMetal: 3 },
	},
	open_transit: {
		cost: { scrapMetal: 1, eWaste: 1 },
	},
	review_archive: {
		gain: { intactComponents: 1 },
	},
	survey_gateway: {
		cost: { eWaste: 1 },
	},
	contest_incursion: {
		gain: { scrapMetal: 2 },
	},
};

function applyCost(
	cost: Partial<Record<"scrapMetal" | "eWaste" | "intactComponents", number>>,
) {
	const applied: ["scrapMetal" | "eWaste" | "intactComponents", number][] = [];
	for (const [resourceType, amount] of Object.entries(cost) as [
		"scrapMetal" | "eWaste" | "intactComponents",
		number,
	][]) {
		if (amount <= 0) {
			continue;
		}
		if (!spendResource(resourceType, amount)) {
			for (const [rollbackType, rollbackAmount] of applied) {
				addResource(rollbackType, rollbackAmount);
			}
			return false;
		}
		applied.push([resourceType, amount]);
	}
	return true;
}

export function executeDistrictOperation(args: {
	cityInstanceId: number | null;
	poiType: WorldPoiType;
	state: CityInstanceState;
	operationId: DistrictOperationId;
}) {
	const operation = getDistrictOperations({
		poiType: args.poiType,
		state: args.state,
	}).find((candidate) => candidate.id === args.operationId);
	if (!operation) {
		throw new Error(
			`Operation ${args.operationId} is not available for this district.`,
		);
	}
	if (operation.status !== "available") {
		throw new Error(
			`Operation ${args.operationId} is not available to execute.`,
		);
	}

	const effect = OPERATION_EFFECTS[args.operationId];
	if (effect?.cost && !applyCost(effect.cost)) {
		throw new Error(`Operation ${args.operationId} lacks required resources.`);
	}

	const delta = {
		scrapMetal: 0,
		eWaste: 0,
		intactComponents: 0,
	};
	if (effect?.cost) {
		for (const [resourceType, amount] of Object.entries(effect.cost) as [
			"scrapMetal" | "eWaste" | "intactComponents",
			number,
		][]) {
			if (amount <= 0) {
				continue;
			}
			delta[resourceType] -= amount;
		}
	}
	if (effect?.gain) {
		for (const [resourceType, amount] of Object.entries(effect.gain) as [
			"scrapMetal" | "eWaste" | "intactComponents",
			number,
		][]) {
			if (amount <= 0) {
				continue;
			}
			addResource(resourceType, amount);
			delta[resourceType] += amount;
		}
	}

	pushDistrictEvent({
		cityInstanceId: args.cityInstanceId,
		label: operation.label,
		description:
			delta.scrapMetal === 0 &&
			delta.eWaste === 0 &&
			delta.intactComponents === 0
				? operation.description
				: `${operation.description} Resource shift: scrap ${delta.scrapMetal >= 0 ? "+" : ""}${delta.scrapMetal}, e-waste ${delta.eWaste >= 0 ? "+" : ""}${delta.eWaste}, intact ${delta.intactComponents >= 0 ? "+" : ""}${delta.intactComponents}.`,
		operationId: operation.id,
		tick: getRuntimeState().currentTick,
	});

	return {
		operation,
		resourceDelta: delta,
	} satisfies ExecutedDistrictOperation;
}
