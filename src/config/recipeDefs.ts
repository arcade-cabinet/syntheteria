/**
 * Component fabrication recipes — craft robot parts at fabrication units.
 *
 * Converted from pending/config/recipes.json to TypeScript const objects.
 *
 * These are COMPONENT recipes (craft a camera module, arm assembly, etc.)
 * as distinct from FUSION recipes in synthesisSystem.ts (convert raw
 * materials into advanced materials). Component recipes produce parts
 * that can be installed on units to restore broken components.
 */

import type { ResourceMaterial } from "../terrain";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComponentRecipe {
	readonly id: string;
	readonly name: string;
	/** Which component slot this recipe produces. */
	readonly outputComponent: string;
	/** Material type of the produced component. */
	readonly outputMaterial: "metal" | "electronic";
	/** Resource costs to fabricate. */
	readonly costs: readonly Readonly<{
		type: ResourceMaterial;
		amount: number;
	}>[];
	/** Turns to complete fabrication. */
	readonly buildTime: number;
}

// ─── Data ───────────────────────────────────────────────────────────────────

export const COMPONENT_RECIPES: readonly ComponentRecipe[] = [
	{
		id: "camera_module",
		name: "Camera Module",
		outputComponent: "camera",
		outputMaterial: "electronic",
		costs: [
			{ type: "e_waste", amount: 4 },
			{ type: "intact_components", amount: 1 },
		],
		buildTime: 8,
	},
	{
		id: "arm_assembly",
		name: "Arm Assembly",
		outputComponent: "arms",
		outputMaterial: "metal",
		costs: [{ type: "scrap_metal", amount: 5 }],
		buildTime: 6,
	},
	{
		id: "leg_assembly",
		name: "Leg Assembly",
		outputComponent: "legs",
		outputMaterial: "metal",
		costs: [{ type: "scrap_metal", amount: 4 }],
		buildTime: 5,
	},
	{
		id: "power_cell",
		name: "Power Cell",
		outputComponent: "power_cell",
		outputMaterial: "electronic",
		costs: [
			{ type: "e_waste", amount: 3 },
			{ type: "scrap_metal", amount: 2 },
		],
		buildTime: 7,
	},
	{
		id: "power_supply",
		name: "Power Supply",
		outputComponent: "power_supply",
		outputMaterial: "electronic",
		costs: [
			{ type: "e_waste", amount: 5 },
			{ type: "intact_components", amount: 1 },
		],
		buildTime: 10,
	},
] as const;

/** Fast lookup by recipe ID. */
export const RECIPE_BY_ID: ReadonlyMap<string, ComponentRecipe> = new Map(
	COMPONENT_RECIPES.map((r) => [r.id, r]),
);

/** Get total resource cost for a recipe as a flat map. */
export function getRecipeCostMap(
	recipeId: string,
): Partial<Record<ResourceMaterial, number>> | null {
	const recipe = RECIPE_BY_ID.get(recipeId);
	if (!recipe) return null;

	const costMap: Partial<Record<ResourceMaterial, number>> = {};
	for (const c of recipe.costs) {
		costMap[c.type] = (costMap[c.type] ?? 0) + c.amount;
	}
	return costMap;
}
