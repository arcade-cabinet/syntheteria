import type { DistrictCapabilityId } from "./districtCapabilities";
import type { CityInstanceState, WorldPoiType } from "./contracts";
import type { SectorStructureSnapshot } from "./snapshots";

export type DistrictStructureId =
	| "substation_core"
	| "fabrication_block"
	| "storage_block"
	| "relay_spine"
	| "defensive_gate"
	| "power_sink_array"
	| "transit_node"
	| "archive_cluster"
	| "cult_incursion_structure"
	| "motor_pool"
	| "storm_collector"
	| "transport_spine";

export interface DistrictStructureDefinition {
	id: DistrictStructureId;
	label: string;
	compositeId: string;
	role:
		| "core"
		| "industrial"
		| "research"
		| "defense"
		| "power"
		| "transit"
		| "hostile";
	capabilities: DistrictCapabilityId[];
}

export interface DistrictStructureViewModel extends DistrictStructureDefinition {
	status: "online" | "latent" | "hostile" | "locked";
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	controllerFaction: string | null;
}

const DISTRICT_STRUCTURE_DEFINITIONS: Record<
	DistrictStructureId,
	DistrictStructureDefinition
> = {
	substation_core: {
		id: "substation_core",
		label: "Substation Core",
		compositeId: "substation_core",
		role: "core",
		capabilities: ["relay", "fabrication", "substation"],
	},
	fabrication_block: {
		id: "fabrication_block",
		label: "Fabrication Block",
		compositeId: "fabrication_hub",
		role: "industrial",
		capabilities: ["fabrication", "power_sink"],
	},
	storage_block: {
		id: "storage_block",
		label: "Storage Block",
		compositeId: "storage_block",
		role: "industrial",
		capabilities: ["storage", "salvage"],
	},
	relay_spine: {
		id: "relay_spine",
		label: "Relay Spine",
		compositeId: "relay_spine",
		role: "core",
		capabilities: ["relay"],
	},
	defensive_gate: {
		id: "defensive_gate",
		label: "Defensive Gate",
		compositeId: "defensive_gate",
		role: "defense",
		capabilities: ["defense"],
	},
	power_sink_array: {
		id: "power_sink_array",
		label: "Power Sink Array",
		compositeId: "power_sink_array",
		role: "power",
		capabilities: ["power_sink", "relay"],
	},
	transit_node: {
		id: "transit_node",
		label: "Transit Node",
		compositeId: "transit_node",
		role: "transit",
		capabilities: ["transit"],
	},
	archive_cluster: {
		id: "archive_cluster",
		label: "Archive Cluster",
		compositeId: "archive_cluster",
		role: "research",
		capabilities: ["archive", "research", "relay"],
	},
	cult_incursion_structure: {
		id: "cult_incursion_structure",
		label: "Cult Incursion Structure",
		compositeId: "cult_incursion_structure",
		role: "hostile",
		capabilities: ["hostile_presence", "power_sink"],
	},
	motor_pool: {
		id: "motor_pool",
		label: "Motor Pool",
		compositeId: "motor_pool",
		role: "industrial",
		capabilities: ["logistics", "transit", "storage"],
	},
	storm_collector: {
		id: "storm_collector",
		label: "Storm Collector",
		compositeId: "storm_collector_array",
		role: "power",
		capabilities: ["power_sink", "storm_capture"],
	},
	transport_spine: {
		id: "transport_spine",
		label: "Transport Spine",
		compositeId: "transport_spine",
		role: "transit",
		capabilities: ["transit", "relay", "logistics"],
	},
};

function defaultStructureIdsForPoi(poiType: WorldPoiType) {
	switch (poiType) {
		case "home_base":
			return [
				"substation_core",
				"relay_spine",
				"storage_block",
				"fabrication_block",
				"power_sink_array",
				"defensive_gate",
			] as const;
		case "coast_mines":
			return [
				"substation_core",
				"storage_block",
				"transit_node",
				"power_sink_array",
				"defensive_gate",
			] as const;
		case "science_campus":
			return [
				"substation_core",
				"archive_cluster",
				"relay_spine",
				"fabrication_block",
			] as const;
		case "northern_cult_site":
			return [
				"cult_incursion_structure",
				"power_sink_array",
				"defensive_gate",
			] as const;
		case "deep_sea_gateway":
			return ["transit_node", "relay_spine", "power_sink_array"] as const;
	}
}

function getStructureStatus(args: {
	state: CityInstanceState;
	controllerFaction: string | null;
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	poiType: WorldPoiType;
}) {
	if (args.poiType === "deep_sea_gateway") {
		return "locked" as const;
	}
	if (args.controllerFaction === "cult") {
		return "hostile" as const;
	}
	if (args.state === "founded") {
		return "online" as const;
	}
	if (args.state === "surveyed") {
		return args.source === "constructed" ? ("online" as const) : ("latent" as const);
	}
	return "latent" as const;
}

export function getDistrictStructureDefinition(id: DistrictStructureId) {
	return DISTRICT_STRUCTURE_DEFINITIONS[id];
}

export function getDistrictStructureDefinitions() {
	return Object.values(DISTRICT_STRUCTURE_DEFINITIONS);
}

export function getDistrictStructures(args: {
	poiType: WorldPoiType;
	state: CityInstanceState;
	structures?: SectorStructureSnapshot[];
}) {
	return getDistrictStructuresFromSnapshots({
		poiType: args.poiType,
		state: args.state,
		structures: args.structures ?? [],
	});
}

export function getDistrictStructuresFromSnapshots(args: {
	poiType: WorldPoiType;
	state: CityInstanceState;
	structures: SectorStructureSnapshot[];
}) {
	const keyed = new Map<DistrictStructureId, SectorStructureSnapshot>();
	for (const structure of args.structures) {
		const id = structure.district_structure_id as DistrictStructureId;
		if (!DISTRICT_STRUCTURE_DEFINITIONS[id] || keyed.has(id)) {
			continue;
		}
		keyed.set(id, structure);
	}

	const fallbacks = defaultStructureIdsForPoi(args.poiType);
	const resolvedIds =
		keyed.size > 0 ? [...keyed.keys()] : [...fallbacks] as DistrictStructureId[];

	return resolvedIds.map((id) => {
		const definition = DISTRICT_STRUCTURE_DEFINITIONS[id];
		const snapshot = keyed.get(id);
		return {
			...definition,
			status: getStructureStatus({
				state: args.state,
				controllerFaction: snapshot?.controller_faction ?? null,
				source: snapshot?.source ?? "seeded_district",
				poiType: args.poiType,
			}),
			source: snapshot?.source ?? "seeded_district",
			controllerFaction: snapshot?.controller_faction ?? null,
		} satisfies DistrictStructureViewModel;
	});
}

export function summarizeDistrictStructures(
	structures: DistrictStructureViewModel[],
) {
	if (structures.length === 0) {
		return "No district structures are classified for this site.";
	}
	const hostile = structures.filter((structure) => structure.status === "hostile");
	if (hostile.length > 0) {
		return `Hostile structures detected: ${hostile.map((structure) => structure.label).join(", ")}.`;
	}
	const constructed = structures.filter(
		(structure) => structure.source === "constructed" && structure.status === "online",
	);
	if (constructed.length > 0) {
		return `Constructed district modules online: ${constructed.map((structure) => structure.label).join(", ")}.`;
	}
	const online = structures.filter((structure) => structure.status === "online");
	if (online.length > 0) {
		return `Online structures: ${online.map((structure) => structure.label).join(", ")}.`;
	}
	const locked = structures.filter((structure) => structure.status === "locked");
	if (locked.length > 0) {
		return `Reserved structures: ${locked.map((structure) => structure.label).join(", ")}.`;
	}
	return `Latent structures: ${structures.map((structure) => structure.label).join(", ")}.`;
}
