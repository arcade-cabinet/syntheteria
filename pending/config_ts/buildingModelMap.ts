/**
 * Building type → city model ID for Filament rendering.
 * Web uses procedural boxes (InstancedBuildingRenderer); native uses GLB models.
 * Each building type maps to a city catalog model for full parity (no placeholders).
 */

export const BUILDING_MODEL_MAP: Record<string, string> = {
	lightning_rod: "column_slim",
	fabrication_unit: "props_computer",
	motor_pool: "props_containerfull",
	relay_tower: "column_1",
	defense_turret: "props_laser",
	power_sink: "props_pod",
	storage_hub: "props_shelf",
	habitat_module: "props_pod",
};

export function getBuildingModelId(buildingType: string): string | null {
	return BUILDING_MODEL_MAP[buildingType] ?? null;
}
