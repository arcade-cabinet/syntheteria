/**
 * Fabrication system.
 *
 * Powered fabrication units can craft replacement components.
 * Each recipe consumes materials and takes several ticks to complete.
 * Completed components are added to the global resource pool as intact parts.
 */

import type { Entity } from "koota";
import { playSfx } from "../audio";
import { BuildingTrait, EntityId } from "../ecs/traits";
import { world } from "../ecs/world";
import {
	addResource,
	getResources,
	type ResourcePool,
	spendResource,
} from "./resources";

export interface Recipe {
	name: string;
	/** What component this produces */
	outputComponent: string;
	outputMaterial: "metal" | "plastic" | "electronic";
	/** Resource costs */
	costs: { type: keyof ResourcePool; amount: number }[];
	/** Ticks to complete */
	buildTime: number;
}

export const RECIPES: Recipe[] = [
	{
		name: "Camera Module",
		outputComponent: "camera",
		outputMaterial: "electronic",
		costs: [
			{ type: "circuitry", amount: 2 },
			{ type: "scrapMetal", amount: 1 },
		],
		buildTime: 8,
	},
	{
		name: "Arm Assembly",
		outputComponent: "arms",
		outputMaterial: "metal",
		costs: [
			{ type: "scrapMetal", amount: 3 },
			{ type: "circuitry", amount: 1 },
		],
		buildTime: 6,
	},
	{
		name: "Leg Assembly",
		outputComponent: "legs",
		outputMaterial: "metal",
		costs: [
			{ type: "scrapMetal", amount: 3 },
			{ type: "durasteel", amount: 1 },
		],
		buildTime: 5,
	},
	{
		name: "Power Cell",
		outputComponent: "power_cell",
		outputMaterial: "electronic",
		costs: [
			{ type: "powerCells", amount: 2 },
			{ type: "circuitry", amount: 1 },
		],
		buildTime: 7,
	},
	{
		name: "Power Supply",
		outputComponent: "power_supply",
		outputMaterial: "electronic",
		costs: [
			{ type: "circuitry", amount: 3 },
			{ type: "powerCells", amount: 1 },
		],
		buildTime: 10,
	},
];

export interface FabricationJob {
	fabricatorId: string;
	recipe: Recipe;
	ticksRemaining: number;
}

const activeJobs: FabricationJob[] = [];

export function getActiveJobs(): FabricationJob[] {
	return [...activeJobs];
}

/**
 * Queue a fabrication job on a specific fabrication unit.
 * Returns true if the job was started.
 */
export function startFabrication(
	fabricator: Entity,
	recipeName: string,
): boolean {
	// Must be a powered fabrication unit
	const building = fabricator.get(BuildingTrait);
	if (!building) return false;
	if (building.buildingType !== "fabrication_unit") return false;
	if (!building.powered || !building.operational) return false;

	const entityId = fabricator.get(EntityId);
	if (!entityId) return false;
	const fabId = entityId.value;

	// Already has a job?
	if (activeJobs.some((j) => j.fabricatorId === fabId)) return false;

	const recipe = RECIPES.find((r) => r.name === recipeName);
	if (!recipe) return false;

	// Check resources
	const pool = getResources();
	for (const cost of recipe.costs) {
		if (pool[cost.type] < cost.amount) return false;
	}

	// Spend resources
	for (const cost of recipe.costs) {
		spendResource(cost.type, cost.amount);
	}

	activeJobs.push({
		fabricatorId: fabId,
		recipe,
		ticksRemaining: recipe.buildTime,
	});

	return true;
}

/**
 * Fabrication tick. Advances active jobs.
 * Completed jobs produce intact components.
 */
export function fabricationSystem() {
	for (let i = activeJobs.length - 1; i >= 0; i--) {
		const job = activeJobs[i];

		// Check fabricator is still powered
		let fabricatorPowered = false;
		for (const building of world.query(BuildingTrait, EntityId)) {
			const eid = building.get(EntityId)?.value;
			const bldg = building.get(BuildingTrait)!;
			if (eid === job.fabricatorId && bldg.powered) {
				fabricatorPowered = true;
				break;
			}
		}

		if (!fabricatorPowered) continue; // paused, not cancelled

		job.ticksRemaining--;
		if (job.ticksRemaining <= 0) {
			// Component fabricated -- add to resource pool as circuitry (reusable material)
			addResource("circuitry", 1);
			activeJobs.splice(i, 1);
			playSfx("synthesis_complete");
		}
	}
}
