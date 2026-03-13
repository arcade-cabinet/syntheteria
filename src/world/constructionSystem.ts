/**
 * Construction System
 *
 * Manages the building of composite structures within founded districts.
 * Each composite goes through staged construction: foundation → shell → interior → operational.
 * Resource costs reference the cube economy (scrapMetal, eWaste, intactComponents).
 * Structure slots expand as capabilities come online.
 */

import type { ResourcePool } from "../systems/resources";
import type { DistrictCapabilityId } from "./districtCapabilities";
import type { DistrictStructureId } from "./districtStructures";
import type { WorldPoiType } from "./contracts";

// ---------------------------------------------------------------------------
// Construction stage definitions
// ---------------------------------------------------------------------------

export type ConstructionStage =
	| "unbuilt"
	| "foundation"
	| "shell"
	| "interior"
	| "operational";

export const CONSTRUCTION_STAGE_ORDER: readonly ConstructionStage[] = [
	"unbuilt",
	"foundation",
	"shell",
	"interior",
	"operational",
] as const;

export interface ResourceCost {
	scrapMetal: number;
	eWaste: number;
	intactComponents: number;
}

export interface ConstructionStageDefinition {
	stage: ConstructionStage;
	/** Cost to advance TO this stage from the previous one */
	cost: ResourceCost;
	/** Which composite part indices become visible at this stage */
	partIndices: number[];
	/** Build duration in game ticks */
	buildTicks: number;
	/** Description shown to the player */
	description: string;
}

// ---------------------------------------------------------------------------
// Construction blueprint — how a composite structure is built
// ---------------------------------------------------------------------------

export interface ConstructionBlueprint {
	/** Which district structure this blueprint builds */
	structureId: DistrictStructureId;
	/** Which composite definition to instantiate */
	compositeId: string;
	/** Label shown in construction UI */
	label: string;
	/** Staged construction plan */
	stages: ConstructionStageDefinition[];
	/** Total cost across all stages */
	totalCost: ResourceCost;
	/** Capabilities required before construction can begin */
	prerequisiteCapabilities: DistrictCapabilityId[];
	/** Capabilities this structure provides when operational */
	providedCapabilities: DistrictCapabilityId[];
	/** Which slot tier unlocks this blueprint (0 = always available) */
	slotTier: number;
}

// ---------------------------------------------------------------------------
// Slot system — expandable structure positions per district
// ---------------------------------------------------------------------------

export interface ConstructionSlot {
	index: number;
	/** Grid offset from district anchor */
	offset: { x: number; z: number };
	/** Slot tier: 0=initial, 1=after first expansion, 2=late-game */
	tier: number;
	/** Which capabilities must be online to unlock this slot */
	unlockRequirements: DistrictCapabilityId[];
}

/** Slot layout per POI type — replaces the old hardcoded 6-slot array */
const SLOT_LAYOUTS: Record<WorldPoiType, ConstructionSlot[]> = {
	home_base: [
		{ index: 0, offset: { x: 0, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 1, offset: { x: 6, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 2, offset: { x: -6, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 3, offset: { x: 0, z: 6 }, tier: 1, unlockRequirements: ["relay"] },
		{ index: 4, offset: { x: 0, z: -6 }, tier: 1, unlockRequirements: ["power_sink"] },
		{ index: 5, offset: { x: 6, z: 6 }, tier: 2, unlockRequirements: ["relay", "fabrication"] },
		{ index: 6, offset: { x: -6, z: 6 }, tier: 2, unlockRequirements: ["transit", "relay"] },
		{ index: 7, offset: { x: 6, z: -6 }, tier: 2, unlockRequirements: ["defense", "power_sink"] },
		{ index: 8, offset: { x: -6, z: -6 }, tier: 2, unlockRequirements: ["archive", "relay"] },
	],
	coast_mines: [
		{ index: 0, offset: { x: 0, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 1, offset: { x: 6, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 2, offset: { x: -6, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 3, offset: { x: 0, z: 6 }, tier: 1, unlockRequirements: ["transit"] },
		{ index: 4, offset: { x: 0, z: -6 }, tier: 1, unlockRequirements: ["storage"] },
		{ index: 5, offset: { x: 6, z: 6 }, tier: 2, unlockRequirements: ["fabrication", "power_sink"] },
	],
	science_campus: [
		{ index: 0, offset: { x: 0, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 1, offset: { x: 6, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 2, offset: { x: -6, z: 0 }, tier: 1, unlockRequirements: ["archive"] },
		{ index: 3, offset: { x: 0, z: 6 }, tier: 1, unlockRequirements: ["research"] },
		{ index: 4, offset: { x: 0, z: -6 }, tier: 2, unlockRequirements: ["research", "relay"] },
	],
	northern_cult_site: [
		{ index: 0, offset: { x: 0, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 1, offset: { x: 6, z: 0 }, tier: 1, unlockRequirements: ["defense"] },
		{ index: 2, offset: { x: -6, z: 0 }, tier: 2, unlockRequirements: ["defense", "power_sink"] },
	],
	deep_sea_gateway: [
		{ index: 0, offset: { x: 0, z: 0 }, tier: 0, unlockRequirements: [] },
		{ index: 1, offset: { x: 6, z: 0 }, tier: 1, unlockRequirements: ["transit"] },
		{ index: 2, offset: { x: -6, z: 0 }, tier: 2, unlockRequirements: ["gateway_access", "power_sink"] },
	],
};

// ---------------------------------------------------------------------------
// Construction blueprints — one per buildable structure type
// ---------------------------------------------------------------------------

function sumCosts(...costs: ResourceCost[]): ResourceCost {
	return costs.reduce(
		(acc, cost) => ({
			scrapMetal: acc.scrapMetal + cost.scrapMetal,
			eWaste: acc.eWaste + cost.eWaste,
			intactComponents: acc.intactComponents + cost.intactComponents,
		}),
		{ scrapMetal: 0, eWaste: 0, intactComponents: 0 },
	);
}

/**
 * Part indices reference CityCompositeDefinition.parts[].
 * Foundation stage = structural elements (columns, walls).
 * Shell stage = enclosure (roof, doors).
 * Interior stage = functional props (computers, teleporters, shelves).
 * Operational stage = detail elements (pipes, vents, panels).
 */
export const CONSTRUCTION_BLUEPRINTS: ConstructionBlueprint[] = [
	{
		structureId: "substation_core",
		compositeId: "substation_core",
		label: "Substation Core",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 2, intactComponents: 1 }, partIndices: [0, 1, 2, 3], buildTicks: 30, description: "Erecting corner columns to anchor the substation shell." },
			{ stage: "shell", cost: { scrapMetal: 12, eWaste: 4, intactComponents: 2 }, partIndices: [4, 5, 6, 7], buildTicks: 45, description: "Sealing walls and framing the window run for observation." },
			{ stage: "interior", cost: { scrapMetal: 4, eWaste: 8, intactComponents: 4 }, partIndices: [8, 9], buildTicks: 30, description: "Installing command console and teleporter relay." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 2, intactComponents: 1 }, partIndices: [10], buildTicks: 15, description: "Capping with detailed roof and bringing systems online." },
		],
		totalCost: { scrapMetal: 26, eWaste: 16, intactComponents: 8 },
		prerequisiteCapabilities: [],
		providedCapabilities: ["relay", "fabrication", "substation"],
		slotTier: 0,
	},
	{
		structureId: "relay_spine",
		compositeId: "relay_spine",
		label: "Relay Spine",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 6, eWaste: 1, intactComponents: 0 }, partIndices: [0, 1], buildTicks: 20, description: "Raising corridor walls to form the relay spine." },
			{ stage: "shell", cost: { scrapMetal: 8, eWaste: 3, intactComponents: 1 }, partIndices: [2, 3], buildTicks: 30, description: "Framing door entries for transit access." },
			{ stage: "interior", cost: { scrapMetal: 2, eWaste: 6, intactComponents: 3 }, partIndices: [4], buildTicks: 25, description: "Installing teleporter column for relay signal." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 2, intactComponents: 1 }, partIndices: [5, 6], buildTicks: 15, description: "Running pipe detail and capping with piped roof." },
		],
		totalCost: { scrapMetal: 18, eWaste: 12, intactComponents: 5 },
		prerequisiteCapabilities: ["relay"],
		providedCapabilities: ["relay"],
		slotTier: 0,
	},
	{
		structureId: "storage_block",
		compositeId: "storage_block",
		label: "Storage Block",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 10, eWaste: 1, intactComponents: 0 }, partIndices: [0, 1, 2, 3], buildTicks: 25, description: "Raising four-wall enclosure for cargo staging." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [8], buildTicks: 20, description: "Installing roof plating for weather protection." },
			{ stage: "interior", cost: { scrapMetal: 6, eWaste: 2, intactComponents: 2 }, partIndices: [4, 5], buildTicks: 20, description: "Stacking containers and long crates for throughput." },
			{ stage: "operational", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [6, 7], buildTicks: 5, description: "Mounting wall plates for cargo zone identification." },
		],
		totalCost: { scrapMetal: 20, eWaste: 5, intactComponents: 3 },
		prerequisiteCapabilities: ["storage"],
		providedCapabilities: ["storage", "salvage"],
		slotTier: 0,
	},
	{
		structureId: "fabrication_block",
		compositeId: "fabrication_hub",
		label: "Fabrication Hub",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 2, intactComponents: 0 }, partIndices: [0, 1], buildTicks: 20, description: "Setting wall partitions for workshop zones." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [2, 3], buildTicks: 25, description: "Installing compute consoles for fabrication control." },
			{ stage: "interior", cost: { scrapMetal: 3, eWaste: 8, intactComponents: 4 }, partIndices: [4], buildTicks: 30, description: "Placing teleporter for material relay." },
			{ stage: "operational", cost: { scrapMetal: 3, eWaste: 3, intactComponents: 2 }, partIndices: [5, 6, 7, 8], buildTicks: 20, description: "Running overhead pipes, mounting vent and output indicator, capping with detail roof." },
		],
		totalCost: { scrapMetal: 18, eWaste: 17, intactComponents: 8 },
		prerequisiteCapabilities: ["fabrication"],
		providedCapabilities: ["fabrication", "power_sink"],
		slotTier: 0,
	},
	{
		structureId: "power_sink_array",
		compositeId: "power_sink_array",
		label: "Power Sink Array",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 6, eWaste: 1, intactComponents: 0 }, partIndices: [0, 1], buildTicks: 15, description: "Erecting grounding columns." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 6, intactComponents: 3 }, partIndices: [2, 3], buildTicks: 25, description: "Installing teleporter pads for energy capture." },
			{ stage: "interior", cost: { scrapMetal: 2, eWaste: 4, intactComponents: 2 }, partIndices: [4], buildTicks: 20, description: "Connecting pipe conduits for storm routing." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 2, intactComponents: 1 }, partIndices: [5, 6, 7], buildTicks: 15, description: "Mounting warning triangles, detail plate, and piped roof." },
		],
		totalCost: { scrapMetal: 14, eWaste: 13, intactComponents: 6 },
		prerequisiteCapabilities: ["power_sink"],
		providedCapabilities: ["power_sink", "relay"],
		slotTier: 0,
	},
	{
		structureId: "defensive_gate",
		compositeId: "defensive_gate",
		label: "Defensive Gate",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 12, eWaste: 2, intactComponents: 1 }, partIndices: [3, 4], buildTicks: 20, description: "Planting heavy accent columns as gate anchors." },
			{ stage: "shell", cost: { scrapMetal: 16, eWaste: 4, intactComponents: 2 }, partIndices: [0, 1, 2], buildTicks: 35, description: "Raising heavy wall panels and framing the gate door." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Gate interior is open hardpoint space." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [5, 6, 7, 8], buildTicks: 15, description: "Mounting warning triangles, hazard marker, and orange vent roof." },
		],
		totalCost: { scrapMetal: 32, eWaste: 8, intactComponents: 4 },
		prerequisiteCapabilities: ["defense"],
		providedCapabilities: ["defense"],
		slotTier: 1,
	},
	{
		structureId: "transit_node",
		compositeId: "transit_node",
		label: "Transit Node",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 6, eWaste: 2, intactComponents: 0 }, partIndices: [0, 1], buildTicks: 20, description: "Framing door walls for bidirectional access." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [6], buildTicks: 15, description: "Installing piped roof for transit shelter." },
			{ stage: "interior", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [2, 3], buildTicks: 20, description: "Placing equipment base and vessel staging." },
			{ stage: "operational", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [4, 5], buildTicks: 5, description: "Mounting directional arrow signage." },
		],
		totalCost: { scrapMetal: 14, eWaste: 8, intactComponents: 3 },
		prerequisiteCapabilities: ["transit"],
		providedCapabilities: ["transit"],
		slotTier: 1,
	},
	{
		structureId: "archive_cluster",
		compositeId: "archive_cluster",
		label: "Archive Cluster",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 10, eWaste: 3, intactComponents: 1 }, partIndices: [0, 1, 2, 3], buildTicks: 30, description: "Enclosing archive space with window walls and access door." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [7], buildTicks: 15, description: "Capping with plated roof for environmental seal." },
			{ stage: "interior", cost: { scrapMetal: 4, eWaste: 10, intactComponents: 6 }, partIndices: [4, 5], buildTicks: 35, description: "Installing computer console and machine statue for archive ritual." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [6], buildTicks: 20, description: "Building staircase for vertical archive access." },
		],
		totalCost: { scrapMetal: 22, eWaste: 19, intactComponents: 10 },
		prerequisiteCapabilities: ["archive"],
		providedCapabilities: ["archive", "research", "relay"],
		slotTier: 1,
	},
	{
		structureId: "motor_pool",
		compositeId: "motor_pool",
		label: "Motor Pool",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 1, intactComponents: 0 }, partIndices: [0, 1, 2, 3], buildTicks: 25, description: "Framing wide door walls and side partitions for vehicle bay." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [9], buildTicks: 15, description: "Installing ventilated roof for exhaust clearance." },
			{ stage: "interior", cost: { scrapMetal: 6, eWaste: 4, intactComponents: 2 }, partIndices: [4, 5, 6], buildTicks: 25, description: "Placing equipment base and staging containers." },
			{ stage: "operational", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [7, 8], buildTicks: 5, description: "Adding directional signage and vent grille." },
		],
		totalCost: { scrapMetal: 18, eWaste: 7, intactComponents: 3 },
		prerequisiteCapabilities: ["logistics"],
		providedCapabilities: ["logistics", "transit", "storage"],
		slotTier: 1,
	},
	{
		structureId: "storm_collector",
		compositeId: "storm_collector_array",
		label: "Storm Collector",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 4, intactComponents: 2 }, partIndices: [0, 1, 2, 3], buildTicks: 20, description: "Raising four grounding columns as lightning rod frame." },
			{ stage: "shell", cost: { scrapMetal: 6, eWaste: 8, intactComponents: 4 }, partIndices: [4, 5], buildTicks: 30, description: "Installing dual teleporter pads for energy capture grid." },
			{ stage: "interior", cost: { scrapMetal: 4, eWaste: 6, intactComponents: 3 }, partIndices: [6, 7], buildTicks: 25, description: "Running overhead pipe conduit and vertical pipe detail." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [8, 9, 10], buildTicks: 20, description: "Mounting vent box, warning triangles, and orange vent roof." },
		],
		totalCost: { scrapMetal: 22, eWaste: 22, intactComponents: 11 },
		prerequisiteCapabilities: ["power_sink"],
		providedCapabilities: ["power_sink", "storm_capture"],
		slotTier: 2,
	},
	{
		structureId: "transport_spine",
		compositeId: "transport_spine",
		label: "Transport Spine",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 2, intactComponents: 1 }, partIndices: [0, 1, 2, 3], buildTicks: 20, description: "Framing wide corridor walls with cargo-class doors." },
			{ stage: "shell", cost: { scrapMetal: 10, eWaste: 4, intactComponents: 2 }, partIndices: [10], buildTicks: 30, description: "Capping with side pipe roof for spine protection." },
			{ stage: "interior", cost: { scrapMetal: 4, eWaste: 8, intactComponents: 4 }, partIndices: [4, 5, 6], buildTicks: 25, description: "Placing loading platform, crate, and container staging." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [7, 8, 9], buildTicks: 20, description: "Installing directional arrows and dot pattern wayfinding." },
		],
		totalCost: { scrapMetal: 26, eWaste: 18, intactComponents: 9 },
		prerequisiteCapabilities: ["transit", "relay"],
		providedCapabilities: ["transit", "relay", "logistics"],
		slotTier: 2,
	},
	// -------------------------------------------------------------------
	// Overworld composites — 4X strategic structures
	// -------------------------------------------------------------------
	{
		structureId: "power_relay_station",
		compositeId: "power_relay_station",
		label: "Power Relay Station",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 6, eWaste: 4, intactComponents: 2 }, partIndices: [0], buildTicks: 20, description: "Deploying generator core for power relay anchor." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 6, intactComponents: 2 }, partIndices: [1], buildTicks: 20, description: "Running cable trunk for distribution reach." },
			{ stage: "interior", cost: { scrapMetal: 2, eWaste: 4, intactComponents: 3 }, partIndices: [2], buildTicks: 15, description: "Raising antenna mast for relay signal." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 4, intactComponents: 2 }, partIndices: [3], buildTicks: 15, description: "Aligning satellite dish for network synchronization." },
		],
		totalCost: { scrapMetal: 14, eWaste: 18, intactComponents: 9 },
		prerequisiteCapabilities: ["power_sink"],
		providedCapabilities: ["power_sink", "relay"],
		slotTier: 1,
	},
	{
		structureId: "pipe_junction",
		compositeId: "pipe_junction",
		label: "Pipe Junction",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 2, intactComponents: 1 }, partIndices: [0], buildTicks: 15, description: "Laying pipe crossover frame at junction site." },
			{ stage: "shell", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [1], buildTicks: 10, description: "Erecting support column for elevated pipe run." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Junction interior is open conduit space." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [2], buildTicks: 10, description: "Installing barrel buffer for pressure regulation." },
		],
		totalCost: { scrapMetal: 16, eWaste: 6, intactComponents: 3 },
		prerequisiteCapabilities: ["fabrication"],
		providedCapabilities: ["fabrication", "storage"],
		slotTier: 1,
	},
	{
		structureId: "defensive_outpost",
		compositeId: "defensive_outpost",
		label: "Defensive Outpost",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 10, eWaste: 2, intactComponents: 1 }, partIndices: [2, 3], buildTicks: 20, description: "Anchoring gate complex and perimeter fence." },
			{ stage: "shell", cost: { scrapMetal: 6, eWaste: 4, intactComponents: 2 }, partIndices: [1], buildTicks: 25, description: "Erecting barricade doorway for access control." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Outpost interior is open firing position." },
			{ stage: "operational", cost: { scrapMetal: 8, eWaste: 6, intactComponents: 4 }, partIndices: [0], buildTicks: 30, description: "Mounting turret cannon for active defense." },
		],
		totalCost: { scrapMetal: 24, eWaste: 12, intactComponents: 7 },
		prerequisiteCapabilities: ["defense"],
		providedCapabilities: ["defense"],
		slotTier: 1,
	},
	{
		structureId: "transit_depot",
		compositeId: "transit_depot",
		label: "Transit Depot",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 8, eWaste: 4, intactComponents: 2 }, partIndices: [0], buildTicks: 25, description: "Laying monorail track segment for transit anchor." },
			{ stage: "shell", cost: { scrapMetal: 10, eWaste: 2, intactComponents: 1 }, partIndices: [1], buildTicks: 20, description: "Constructing loading platform for cargo staging." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Depot is open staging area." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [2], buildTicks: 15, description: "Docking cargo craft for transit commissioning." },
		],
		totalCost: { scrapMetal: 22, eWaste: 10, intactComponents: 5 },
		prerequisiteCapabilities: ["transit"],
		providedCapabilities: ["transit", "logistics"],
		slotTier: 1,
	},
	{
		structureId: "salvage_cache",
		compositeId: "salvage_cache",
		label: "Salvage Cache",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 2, eWaste: 1, intactComponents: 0 }, partIndices: [2, 3], buildTicks: 10, description: "Clearing crater debris and bone fragments." },
			{ stage: "shell", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [1], buildTicks: 5, description: "Exposing rock formations around the cache site." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Cache contents are exposed." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [0], buildTicks: 10, description: "Securing lootbox for controlled material recovery." },
		],
		totalCost: { scrapMetal: 6, eWaste: 3, intactComponents: 1 },
		prerequisiteCapabilities: ["salvage"],
		providedCapabilities: ["salvage", "storage"],
		slotTier: 0,
	},
	{
		structureId: "resource_node",
		compositeId: "resource_node",
		label: "Resource Node",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [0], buildTicks: 15, description: "Stabilizing crystal deposit for extraction access." },
			{ stage: "shell", cost: { scrapMetal: 6, eWaste: 4, intactComponents: 2 }, partIndices: [1], buildTicks: 20, description: "Installing generator for powered extraction." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Node interior is raw deposit." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 2, intactComponents: 1 }, partIndices: [2], buildTicks: 10, description: "Mounting pipe ring for material outflow." },
		],
		totalCost: { scrapMetal: 12, eWaste: 8, intactComponents: 4 },
		prerequisiteCapabilities: ["fabrication"],
		providedCapabilities: ["fabrication", "power_sink"],
		slotTier: 0,
	},
	{
		structureId: "abandoned_hangar",
		compositeId: "abandoned_hangar",
		label: "Abandoned Hangar",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 6, eWaste: 2, intactComponents: 1 }, partIndices: [0], buildTicks: 25, description: "Shoring up derelict hangar superstructure." },
			{ stage: "shell", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [1, 2], buildTicks: 5, description: "Cataloging barrel stores and structural detail." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Hangar interior is prior-mission wreckage." },
			{ stage: "operational", cost: { scrapMetal: 4, eWaste: 4, intactComponents: 2 }, partIndices: [], buildTicks: 15, description: "Reactivating hangar bay for salvage operations." },
		],
		totalCost: { scrapMetal: 10, eWaste: 6, intactComponents: 3 },
		prerequisiteCapabilities: ["salvage"],
		providedCapabilities: ["salvage", "storage"],
		slotTier: 1,
	},
	{
		structureId: "cult_breach_point",
		compositeId: "cult_breach_point",
		label: "Cult Breach Point",
		stages: [
			{ stage: "foundation", cost: { scrapMetal: 4, eWaste: 2, intactComponents: 1 }, partIndices: [2], buildTicks: 15, description: "Containing meteor impact zone at breach perimeter." },
			{ stage: "shell", cost: { scrapMetal: 6, eWaste: 2, intactComponents: 1 }, partIndices: [0], buildTicks: 20, description: "Reinforcing window barricade for hostile zone containment." },
			{ stage: "interior", cost: { scrapMetal: 0, eWaste: 0, intactComponents: 0 }, partIndices: [], buildTicks: 0, description: "Breach interior is active cult territory." },
			{ stage: "operational", cost: { scrapMetal: 2, eWaste: 2, intactComponents: 1 }, partIndices: [1], buildTicks: 10, description: "Posting hazard signage and establishing containment perimeter." },
		],
		totalCost: { scrapMetal: 12, eWaste: 6, intactComponents: 3 },
		prerequisiteCapabilities: ["defense"],
		providedCapabilities: ["hostile_presence"],
		slotTier: 1,
	},
];

// ---------------------------------------------------------------------------
// Construction state management
// ---------------------------------------------------------------------------

export interface ConstructionProgress {
	structureId: DistrictStructureId;
	blueprintIndex: number;
	currentStage: ConstructionStage;
	currentStageIndex: number;
	ticksRemaining: number;
	slotIndex: number;
}

/** Get available slots for a POI type, filtered by online capabilities */
export function getAvailableSlots(
	poiType: WorldPoiType,
	onlineCapabilities: DistrictCapabilityId[],
): ConstructionSlot[] {
	const layout = SLOT_LAYOUTS[poiType];
	return layout.filter((slot) =>
		slot.unlockRequirements.every((req) => onlineCapabilities.includes(req)),
	);
}

/** Get all slots for a POI type regardless of unlock state */
export function getAllSlots(poiType: WorldPoiType): ConstructionSlot[] {
	return SLOT_LAYOUTS[poiType];
}

/** Get buildable blueprints given online capabilities and available slot tiers */
export function getAvailableBlueprints(
	onlineCapabilities: DistrictCapabilityId[],
	maxSlotTier: number,
): ConstructionBlueprint[] {
	return CONSTRUCTION_BLUEPRINTS.filter(
		(bp) =>
			bp.slotTier <= maxSlotTier &&
			bp.prerequisiteCapabilities.every((req) =>
				onlineCapabilities.includes(req),
			),
	);
}

/** Check if the player can afford to advance a construction one stage */
export function canAffordStage(
	blueprint: ConstructionBlueprint,
	stageIndex: number,
	resources: ResourcePool,
): boolean {
	const stageDef = blueprint.stages[stageIndex];
	if (!stageDef) {
		return false;
	}
	return (
		resources.scrapMetal >= stageDef.cost.scrapMetal &&
		resources.eWaste >= stageDef.cost.eWaste &&
		resources.intactComponents >= stageDef.cost.intactComponents
	);
}

/** Deduct stage cost from resource pool. Returns new pool (does not mutate). */
export function deductStageCost(
	blueprint: ConstructionBlueprint,
	stageIndex: number,
	resources: ResourcePool,
): ResourcePool {
	const stageDef = blueprint.stages[stageIndex];
	if (!stageDef) {
		return resources;
	}
	return {
		scrapMetal: resources.scrapMetal - stageDef.cost.scrapMetal,
		eWaste: resources.eWaste - stageDef.cost.eWaste,
		intactComponents: resources.intactComponents - stageDef.cost.intactComponents,
	};
}

/** Get composite part indices that should be visible at a given construction stage */
export function getVisiblePartIndices(
	blueprint: ConstructionBlueprint,
	currentStage: ConstructionStage,
): number[] {
	const stageOrder = CONSTRUCTION_STAGE_ORDER;
	const currentIndex = stageOrder.indexOf(currentStage);
	const indices: number[] = [];
	for (const stageDef of blueprint.stages) {
		const defIndex = stageOrder.indexOf(stageDef.stage);
		if (defIndex <= currentIndex) {
			indices.push(...stageDef.partIndices);
		}
	}
	return indices.sort((a, b) => a - b);
}

/** Advance construction by one stage. Returns updated progress or null if already complete. */
export function advanceConstruction(
	progress: ConstructionProgress,
): ConstructionProgress | null {
	const blueprint = CONSTRUCTION_BLUEPRINTS[progress.blueprintIndex];
	if (!blueprint) {
		return null;
	}
	const nextStageIndex = progress.currentStageIndex + 1;
	const nextStageDef = blueprint.stages[nextStageIndex];
	if (!nextStageDef) {
		return null;
	}
	return {
		...progress,
		currentStage: nextStageDef.stage,
		currentStageIndex: nextStageIndex,
		ticksRemaining: nextStageDef.buildTicks,
	};
}

/** Create initial construction progress for a new build */
export function startConstruction(
	blueprintIndex: number,
	slotIndex: number,
): ConstructionProgress | null {
	const blueprint = CONSTRUCTION_BLUEPRINTS[blueprintIndex];
	if (!blueprint) {
		return null;
	}
	const firstStage = blueprint.stages[0];
	if (!firstStage) {
		return null;
	}
	return {
		structureId: blueprint.structureId,
		blueprintIndex,
		currentStage: firstStage.stage,
		currentStageIndex: 0,
		ticksRemaining: firstStage.buildTicks,
		slotIndex,
	};
}

/** Check if construction is fully complete */
export function isConstructionComplete(progress: ConstructionProgress): boolean {
	const blueprint = CONSTRUCTION_BLUEPRINTS[progress.blueprintIndex];
	if (!blueprint) {
		return false;
	}
	return (
		progress.currentStageIndex >= blueprint.stages.length - 1 &&
		progress.ticksRemaining <= 0
	);
}

/** Get blueprint by structure ID */
export function getBlueprintForStructure(
	structureId: DistrictStructureId,
): ConstructionBlueprint | null {
	return (
		CONSTRUCTION_BLUEPRINTS.find((bp) => bp.structureId === structureId) ??
		null
	);
}

/** Get the next stage cost for a construction in progress */
export function getNextStageCost(
	progress: ConstructionProgress,
): ResourceCost | null {
	const blueprint = CONSTRUCTION_BLUEPRINTS[progress.blueprintIndex];
	if (!blueprint) {
		return null;
	}
	const nextIndex = progress.currentStageIndex + 1;
	return blueprint.stages[nextIndex]?.cost ?? null;
}

/** Summarize total remaining cost for an in-progress construction */
export function getRemainingCost(
	progress: ConstructionProgress,
): ResourceCost {
	const blueprint = CONSTRUCTION_BLUEPRINTS[progress.blueprintIndex];
	if (!blueprint) {
		return { scrapMetal: 0, eWaste: 0, intactComponents: 0 };
	}
	const remainingStages = blueprint.stages.slice(progress.currentStageIndex + 1);
	return sumCosts(...remainingStages.map((s) => s.cost));
}
