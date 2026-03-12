import {
	buildBlankCityAssembly,
	type CityAssemblyContract,
	type CityModuleType,
} from "../assemblyContract";
import { buildCityLayoutPlan } from "../layoutPlan";
import type { CityLayoutScenario } from "../config/types";
import { getCityPurposePresentation } from "../../world/cityPresentation";
import type { CityRuntimeSnapshot, WorldSessionSnapshot } from "../../world/snapshots";

export interface CitySceneAnchor {
	id: string;
	label: string;
	cellX: number;
	cellY: number;
	kind: "entry" | "command" | "power" | "fabrication" | "storage" | "habitation";
}

export interface CitySceneContract {
	cityId: number;
	label: string;
	description: string;
	state: CityRuntimeSnapshot["state"];
	presentationBadge: string;
	presentationRole: string;
	gridWidth: number;
	gridHeight: number;
	cellSize: number;
	scenario: CityLayoutScenario;
	anchors: CitySceneAnchor[];
	moduleCounts: Record<CityModuleType, number>;
}

function getModuleCounts(contract: CityAssemblyContract) {
	const counts: Record<CityModuleType, number> = {
		core: 0,
		power: 0,
		fabrication: 0,
		storage: 0,
		habitation: 0,
		corridor: 0,
	};

	for (const cell of contract.cells) {
		counts[cell.module] += 1;
	}

	return counts;
}

function findFirstCell(contract: CityAssemblyContract, module: CityModuleType) {
	return contract.cells.find((cell) => cell.module === module) ?? null;
}

export function buildCitySceneContract(args: {
	city: CityRuntimeSnapshot;
	session: WorldSessionSnapshot;
}) : CitySceneContract {
	const { city, session } = args;
	const contract = buildBlankCityAssembly(city.layout_seed);
	const plan = buildCityLayoutPlan(city.layout_seed, contract);
	const poi =
		session.pointsOfInterest.find((candidate) => candidate.id === city.poi_id) ??
		null;
	const presentation = poi
		? getCityPurposePresentation(poi.type)
		: {
				badge: "City Shell",
				enterLabel: "Enter City",
				foundationLabel: "Found City",
				role: "Persistent interior shell.",
				summary: "This city instance is detached from a world POI.",
				surveyLabel: "Survey Interior",
			};
	const moduleCounts = getModuleCounts(contract);

	const scenario: CityLayoutScenario = {
		id: `city-${city.id}`,
		label: city.name,
		description: `${presentation.summary} ${presentation.role}`,
		gridWidth: plan.contract.gridWidth,
		gridHeight: plan.contract.gridHeight,
		cellSize: plan.contract.cellSize,
		placements: plan.placements.map((placement) => ({
			modelId: placement.assetId,
			cellX: placement.cellX,
			cellY: placement.cellY,
			layer: placement.layer,
			edge: placement.edge,
			rotationQuarterTurns: placement.rotationQuarterTurns,
		})),
	};

	const entry = contract.entryCell;
	const core = findFirstCell(contract, "core") ?? entry;
	const power = findFirstCell(contract, "power") ?? core;
	const fabrication = findFirstCell(contract, "fabrication") ?? core;
	const storage = findFirstCell(contract, "storage") ?? core;
	const habitation = findFirstCell(contract, "habitation") ?? core;

	return {
		cityId: city.id,
		label: city.name,
		description: scenario.description,
		state: city.state,
		presentationBadge: presentation.badge,
		presentationRole: presentation.role,
		gridWidth: contract.gridWidth,
		gridHeight: contract.gridHeight,
		cellSize: contract.cellSize,
		scenario,
		moduleCounts,
		anchors: [
			{
				id: `${city.id}:entry`,
				label: "Entry Relay",
				cellX: entry.x,
				cellY: entry.y,
				kind: "entry",
			},
			{
				id: `${city.id}:command`,
				label: "Command Core",
				cellX: core.x,
				cellY: core.y,
				kind: "command",
			},
			{
				id: `${city.id}:power`,
				label: "Power Spine",
				cellX: power.x,
				cellY: power.y,
				kind: "power",
			},
			{
				id: `${city.id}:fabrication`,
				label: "Fabrication Bay",
				cellX: fabrication.x,
				cellY: fabrication.y,
				kind: "fabrication",
			},
			{
				id: `${city.id}:storage`,
				label: "Storage Stack",
				cellX: storage.x,
				cellY: storage.y,
				kind: "storage",
			},
			{
				id: `${city.id}:habitation`,
				label: "Habitation Cluster",
				cellX: habitation.x,
				cellY: habitation.y,
				kind: "habitation",
			},
		],
	};
}
