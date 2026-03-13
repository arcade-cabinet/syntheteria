/**
 * Construction Visualization System
 *
 * Provides visual state for buildings under construction.
 * Each building goes through 4 stages: foundation → shell → interior → operational.
 *
 * Visual representation per stage:
 * - foundation (25%): wireframe base footprint, minimal geometry
 * - shell (50%): partial walls and structural frame, translucent panels
 * - interior (75%): full enclosure with interior equipment appearing
 * - operational (100%): complete building, fully opaque, systems online
 *
 * The construction progress overlay shows a progress bar on buildings being built.
 */

import { Building, Identity, WorldPosition } from "../ecs/traits";
import { buildings } from "../ecs/world";

// ---------------------------------------------------------------------------
// Construction stage visual config
// ---------------------------------------------------------------------------

export type ConstructionStageId =
	| "foundation"
	| "shell"
	| "interior"
	| "operational";

export interface StageVisualConfig {
	/** Stage completion percentage (0-1) */
	progress: number;
	/** Opacity of the building mesh (0-1) */
	opacity: number;
	/** Whether to show wireframe overlay */
	wireframe: boolean;
	/** Emissive intensity for construction glow */
	emissiveIntensity: number;
	/** Color tint for the stage (CSS hex) */
	tint: string;
	/** Label shown on the progress overlay */
	label: string;
}

export const STAGE_VISUAL_CONFIG: Record<ConstructionStageId, StageVisualConfig> =
	{
		foundation: {
			progress: 0.25,
			opacity: 0.4,
			wireframe: true,
			emissiveIntensity: 0.1,
			tint: "#4a6670",
			label: "Foundation",
		},
		shell: {
			progress: 0.5,
			opacity: 0.6,
			wireframe: false,
			emissiveIntensity: 0.15,
			tint: "#5a7a8a",
			label: "Shell",
		},
		interior: {
			progress: 0.75,
			opacity: 0.85,
			wireframe: false,
			emissiveIntensity: 0.2,
			tint: "#7a9aaa",
			label: "Interior",
		},
		operational: {
			progress: 1.0,
			opacity: 1.0,
			wireframe: false,
			emissiveIntensity: 0.0,
			tint: "#ffffff",
			label: "Operational",
		},
	};

// ---------------------------------------------------------------------------
// Construction progress tracking per building entity
// ---------------------------------------------------------------------------

export interface BuildingConstructionState {
	entityId: string;
	buildingType: string;
	currentStage: ConstructionStageId;
	turnsRemaining: number;
	totalTurns: number;
}

/** Turns required per stage for each building type */
export const BUILDING_STAGE_TURNS: Record<string, Record<ConstructionStageId, number>> = {
	lightning_rod: {
		foundation: 0,
		shell: 0,
		interior: 0,
		operational: 0,
	},
	fabrication_unit: {
		foundation: 1,
		shell: 1,
		interior: 1,
		operational: 0,
	},
	motor_pool: {
		foundation: 2,
		shell: 2,
		interior: 2,
		operational: 1,
	},
	relay_tower: {
		foundation: 1,
		shell: 1,
		interior: 0,
		operational: 0,
	},
	defense_turret: {
		foundation: 1,
		shell: 2,
		interior: 1,
		operational: 0,
	},
	power_sink: {
		foundation: 1,
		shell: 1,
		interior: 1,
		operational: 0,
	},
	storage_hub: {
		foundation: 1,
		shell: 1,
		interior: 0,
		operational: 0,
	},
	habitat_module: {
		foundation: 2,
		shell: 2,
		interior: 1,
		operational: 1,
	},
};

const STAGE_ORDER: ConstructionStageId[] = [
	"foundation",
	"shell",
	"interior",
	"operational",
];

const constructionStates: Map<string, BuildingConstructionState> = new Map();

/**
 * Start construction for a newly placed building.
 * Lightning rods are instant — all other buildings go through staged construction.
 */
export function startBuildingConstruction(
	entityId: string,
	buildingType: string,
): void {
	const stageTurns = BUILDING_STAGE_TURNS[buildingType];
	if (!stageTurns) return;

	// If all stages are 0 turns, building is instant
	const totalTurns = Object.values(stageTurns).reduce((a, b) => a + b, 0);
	if (totalTurns === 0) return;

	constructionStates.set(entityId, {
		entityId,
		buildingType,
		currentStage: "foundation",
		turnsRemaining: stageTurns.foundation,
		totalTurns,
	});
}

/**
 * Advance construction for all in-progress buildings by one turn.
 */
export function advanceConstructionTurn(): void {
	for (const state of constructionStates.values()) {
		if (state.turnsRemaining > 0) {
			state.turnsRemaining--;
			continue;
		}

		// Current stage complete — advance to next
		const currentIdx = STAGE_ORDER.indexOf(state.currentStage);
		if (currentIdx >= STAGE_ORDER.length - 1) {
			// Fully operational — remove from tracking and mark building as powered
			finalizeBuildingConstruction(state.entityId);
			constructionStates.delete(state.entityId);
			continue;
		}

		const nextStage = STAGE_ORDER[currentIdx + 1]!;
		const stageTurns = BUILDING_STAGE_TURNS[state.buildingType];
		if (!stageTurns) continue;

		state.currentStage = nextStage;
		state.turnsRemaining = stageTurns[nextStage];
	}
}

/**
 * Mark a building entity as powered and operational when construction finishes.
 */
function finalizeBuildingConstruction(entityId: string): void {
	for (const bldg of buildings) {
		if (bldg.get(Identity)?.id === entityId) {
			const buildingComp = bldg.get(Building);
			if (buildingComp) {
				bldg.set(Building, {
					...buildingComp,
					powered: true,
					operational: true,
				});
			}
			break;
		}
	}
}

/**
 * Get current construction state for a building entity.
 */
export function getBuildingConstructionState(
	entityId: string,
): BuildingConstructionState | null {
	return constructionStates.get(entityId) ?? null;
}

/**
 * Get all buildings currently under construction.
 */
export function getAllConstructionStates(): BuildingConstructionState[] {
	return Array.from(constructionStates.values());
}

/**
 * Check if a building is still under construction.
 */
export function isBuildingUnderConstruction(entityId: string): boolean {
	return constructionStates.has(entityId);
}

/**
 * Get the visual config for a building's current construction stage.
 */
export function getConstructionVisualConfig(
	entityId: string,
): StageVisualConfig | null {
	const state = constructionStates.get(entityId);
	if (!state) return null;
	return STAGE_VISUAL_CONFIG[state.currentStage];
}

/**
 * Get overall construction progress as a 0-1 value.
 */
export function getConstructionProgress(entityId: string): number {
	const state = constructionStates.get(entityId);
	if (!state) return 1.0;

	const stageTurns = BUILDING_STAGE_TURNS[state.buildingType];
	if (!stageTurns) return 1.0;

	const currentIdx = STAGE_ORDER.indexOf(state.currentStage);
	let completedTurns = 0;
	for (let i = 0; i < currentIdx; i++) {
		completedTurns += stageTurns[STAGE_ORDER[i]!];
	}
	const currentStageTotalTurns = stageTurns[state.currentStage];
	completedTurns += currentStageTotalTurns - state.turnsRemaining;

	return state.totalTurns > 0 ? completedTurns / state.totalTurns : 1.0;
}

/**
 * Get construction overlay data for all buildings under construction.
 * Used by the UI to render progress bars over construction sites.
 */
export function getConstructionOverlayData(): Array<{
	entityId: string;
	buildingType: string;
	stage: ConstructionStageId;
	stageLabel: string;
	progress: number;
	turnsRemaining: number;
	position: { x: number; y: number; z: number } | null;
}> {
	const overlays = [];
	for (const state of constructionStates.values()) {
		let position: { x: number; y: number; z: number } | null = null;
		for (const bldg of buildings) {
			if (bldg.get(Identity)?.id === state.entityId) {
				const pos = bldg.get(WorldPosition);
				if (pos) position = { x: pos.x, y: pos.y, z: pos.z };
				break;
			}
		}

		const visual = STAGE_VISUAL_CONFIG[state.currentStage];
		overlays.push({
			entityId: state.entityId,
			buildingType: state.buildingType,
			stage: state.currentStage,
			stageLabel: visual.label,
			progress: getConstructionProgress(state.entityId),
			turnsRemaining: state.turnsRemaining,
			position,
		});
	}
	return overlays;
}

export function resetConstructionVisualization() {
	constructionStates.clear();
}

export function _reset() {
	constructionStates.clear();
}
