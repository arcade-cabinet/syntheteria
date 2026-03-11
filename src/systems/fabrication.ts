import recipesConfig from "../config/recipes.json";
import type { Entity } from "../ecs/traits";
import { Building, Identity } from "../ecs/traits";
import { buildings } from "../ecs/world";
import {
	/**
	 * Fabrication system.
	 *
	 * Powered fabrication units can craft replacement components.
	 * Each recipe consumes materials and takes several ticks to complete.
	 * Completed components are added to the global resource pool as intact parts.
	 */

	addResource,
	getResources,
	type ResourcePool,
	spendResource,
} from "./resources";

export interface Recipe {
	id: string;
	name: string;
	/** What component this produces */
	outputComponent: string;
	outputMaterial: "metal" | "plastic" | "electronic";
	/** Resource costs */
	costs: { type: keyof ResourcePool; amount: number }[];
	/** Ticks to complete */
	buildTime: number;
}

export const RECIPES: Recipe[] = recipesConfig as Recipe[];

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
	if (fabricator.get(Building)?.type !== "fabrication_unit") return false;
	if (
		!fabricator.get(Building)?.powered ||
		!fabricator.get(Building)?.operational
	)
		return false;

	// Already has a job?
	if (activeJobs.some((j) => j.fabricatorId === fabricator.get(Identity)?.id))
		return false;

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
		fabricatorId: fabricator.get(Identity)?.id,
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
		for (const building of buildings) {
			if (
				building.get(Identity)?.id === job.fabricatorId &&
				building.get(Building)?.powered
			) {
				fabricatorPowered = true;
				break;
			}
		}

		if (!fabricatorPowered) continue; // paused, not cancelled

		job.ticksRemaining--;
		if (job.ticksRemaining <= 0) {
			// Component fabricated — add to resource pool
			addResource("intactComponents", 1);
			activeJobs.splice(i, 1);
		}
	}
}
