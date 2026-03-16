import type { AssetModule } from "../../config/assetUri";
import type { CityEdgeDirection } from "../topology";

export type CityZone =
	| "core"
	| "power"
	| "fabrication"
	| "storage"
	| "habitation"
	| "corridor";

export type CityFamily =
	| "floor"
	| "wall"
	| "door"
	| "roof"
	| "prop"
	| "detail"
	| "column"
	| "stair"
	| "utility";

export type CityPlacementType =
	| "cell"
	| "edge"
	| "corner"
	| "roof"
	| "prop"
	| "detail"
	| "vertical"
	| "composite";

export type CityPassabilityEffect =
	| "walkable"
	| "blocking"
	| "portal"
	| "cover"
	| "vertical_connector"
	| "guidance";

export interface CityModelDefinition {
	id: string;
	label: string;
	sourceAsset: AssetModule;
	sourceAssetPath: string;
	previewAsset: AssetModule;
	previewAssetPath: string;
	family: CityFamily;
	subcategory: string;
	placementType: CityPlacementType;
	footprint: {
		width: number;
		depth: number;
		height: number;
	};
	defaultScale: number;
	defaultRotation: number;
	rotationSymmetry: 1 | 2 | 4;
	pivotPolicy: string;
	passabilityEffect: CityPassabilityEffect;
	zoneAffinity: CityZone[];
	adjacencyBias: string[];
	compositeEligibility: string[];
	tags: string[];
	bounds: {
		width: number;
		depth: number;
		height: number;
	};
	meshCount: number;
	objectCount: number;
	materials: string[];
	meshNames: string[];
}

export interface CityCompositePart {
	modelId: string;
	offset: { x: number; y: number; z: number };
	rotationQuarterTurns?: 0 | 1 | 2 | 3;
	scale?: number;
}

export interface CityCompositeDefinition {
	id: string;
	label: string;
	tags: string[];
	gameplayRole: string;
	parts: CityCompositePart[];
}

export type CityPlacementLayer =
	| "floor"
	| "structure"
	| "roof"
	| "prop"
	| "detail";

export interface CityModulePlacement {
	assetId: string;
	cellX: number;
	cellY: number;
	layer: CityPlacementLayer;
	edge?: CityEdgeDirection;
	rotationQuarterTurns: 0 | 1 | 2 | 3;
}

export type CityLayoutIssueCode =
	| "entry_not_passable"
	| "disconnected_passable_cell"
	| "missing_floor"
	| "missing_perimeter_structure"
	| "room_missing_access"
	| "prop_on_corridor"
	| "roof_on_passable_cell"
	| "invalid_door_transition";

export interface CityLayoutIssueDefinition {
	code: CityLayoutIssueCode;
	message: string;
	cellX?: number;
	cellY?: number;
}

export interface CityLayoutScenario {
	id: string;
	label: string;
	description: string;
	gridWidth: number;
	gridHeight: number;
	cellSize: number;
	placements: {
		modelId: string;
		cellX: number;
		cellY: number;
		layer: CityPlacementLayer | "composite";
		edge?: CityEdgeDirection;
		rotationQuarterTurns: 0 | 1 | 2 | 3;
		compositeId?: string;
	}[];
}
