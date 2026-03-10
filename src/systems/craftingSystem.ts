/**
 * Crafting system — recipe-based fabrication at machines.
 *
 * Bots must be near a furnace/fabrication unit to start crafting.
 * Recipes consume input items from the bot's inventory and produce
 * output items after a configurable number of ticks. Each machine
 * has its own crafting queue; multiple machines can run in parallel.
 *
 * Config reference: config/furnace.json (fabrication.recipes)
 */

import {
	addItem,
	hasItem,
	removeItem,
} from "./inventorySystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A required input for a recipe. */
export interface RecipeInput {
	itemId: string;
	count: number;
}

/** A recipe that can be crafted at a machine. */
export interface CraftingRecipe {
	id: string;
	name: string;
	inputs: RecipeInput[];
	outputItemId: string;
	outputCount: number;
	/** Number of ticks to complete. */
	craftTicks: number;
}

/** An active crafting job bound to a machine. */
export interface CraftingJob {
	id: string;
	machineId: string;
	botId: string;
	recipe: CraftingRecipe;
	/** Tick at which crafting started. */
	startedAtTick: number;
	/** Ticks remaining until completion. */
	ticksRemaining: number;
}

/** Result of starting a craft. */
export interface StartCraftResult {
	success: boolean;
	jobId?: string;
	reason?: string;
}

/** Snapshot of a crafting job for read-only queries. */
export interface CraftingJobSnapshot {
	id: string;
	machineId: string;
	botId: string;
	recipeName: string;
	ticksRemaining: number;
	totalTicks: number;
	progress: number;
}

// ---------------------------------------------------------------------------
// Default recipes (from furnace.json fabrication.recipes shape)
// ---------------------------------------------------------------------------

const DEFAULT_RECIPES: CraftingRecipe[] = [
	{
		id: "camera_module",
		name: "Camera Module",
		inputs: [
			{ itemId: "eWaste", count: 4 },
			{ itemId: "circuitBoard", count: 1 },
		],
		outputItemId: "camera",
		outputCount: 1,
		craftTicks: 8,
	},
	{
		id: "arm_assembly",
		name: "Arm Assembly",
		inputs: [{ itemId: "scrapMetal", count: 5 }],
		outputItemId: "grabber",
		outputCount: 1,
		craftTicks: 6,
	},
	{
		id: "leg_assembly",
		name: "Leg Assembly",
		inputs: [{ itemId: "scrapMetal", count: 4 }],
		outputItemId: "ironPlate",
		outputCount: 2,
		craftTicks: 5,
	},
	{
		id: "power_cell",
		name: "Power Cell",
		inputs: [
			{ itemId: "eWaste", count: 3 },
			{ itemId: "scrapMetal", count: 2 },
		],
		outputItemId: "powerCell",
		outputCount: 1,
		craftTicks: 7,
	},
	{
		id: "wire_bundle",
		name: "Wire Bundle",
		inputs: [{ itemId: "copper", count: 1 }],
		outputItemId: "wireBundle",
		outputCount: 4,
		craftTicks: 4,
	},
	{
		id: "circuit_board",
		name: "Circuit Board",
		inputs: [{ itemId: "silicon", count: 2 }],
		outputItemId: "circuitBoard",
		outputCount: 1,
		craftTicks: 10,
	},
];

/** Default maximum interaction range (world units) for crafting. */
const DEFAULT_CRAFT_RANGE = 3.0;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let nextJobId = 0;
const activeJobs = new Map<string, CraftingJob>();
const recipes = new Map<string, CraftingRecipe>();

/** Machine positions: machineId -> { x, y, z } */
const machinePositions = new Map<string, { x: number; y: number; z: number }>();

/** Bot positions: botId -> { x, y, z } */
const botPositions = new Map<string, { x: number; y: number; z: number }>();

// Initialize default recipes
for (const r of DEFAULT_RECIPES) {
	recipes.set(r.id, r);
}

// ---------------------------------------------------------------------------
// Position registration (for proximity checks)
// ---------------------------------------------------------------------------

/**
 * Register or update a machine's world position.
 * Must be called for proximity checks during startCraft.
 */
export function registerMachinePosition(
	machineId: string,
	pos: { x: number; y: number; z: number },
): void {
	machinePositions.set(machineId, { ...pos });
}

/**
 * Register or update a bot's world position.
 * Must be called for proximity checks during startCraft.
 */
export function registerBotPosition(
	botId: string,
	pos: { x: number; y: number; z: number },
): void {
	botPositions.set(botId, { ...pos });
}

// ---------------------------------------------------------------------------
// Recipe management
// ---------------------------------------------------------------------------

/**
 * Register or override a crafting recipe.
 */
export function registerRecipe(recipe: CraftingRecipe): void {
	recipes.set(recipe.id, recipe);
}

/**
 * Get a recipe by ID.
 */
export function getRecipe(recipeId: string): CraftingRecipe | undefined {
	return recipes.get(recipeId);
}

/**
 * Get all registered recipes.
 */
export function getAllRecipes(): CraftingRecipe[] {
	return Array.from(recipes.values());
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Calculate Euclidean distance between two 3D points.
 */
function distance3D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Start a crafting job at a machine.
 *
 * Validates:
 * - Recipe exists
 * - Bot is within range of the machine
 * - Bot has required input items
 * - Machine doesn't already have an active job
 *
 * On success, input items are consumed from the bot's inventory.
 *
 * @param botId - the bot performing the craft
 * @param machineId - the machine to craft at
 * @param recipeId - the recipe to use
 * @param currentTick - the current simulation tick
 * @param maxRange - override for interaction range (default 3.0)
 */
export function startCraft(
	botId: string,
	machineId: string,
	recipeId: string,
	currentTick: number,
	maxRange: number = DEFAULT_CRAFT_RANGE,
): StartCraftResult {
	// Recipe must exist
	const recipe = recipes.get(recipeId);
	if (!recipe) {
		return { success: false, reason: "unknown_recipe" };
	}

	// Machine must not already have an active job
	for (const job of activeJobs.values()) {
		if (job.machineId === machineId) {
			return { success: false, reason: "machine_busy" };
		}
	}

	// Proximity check
	const botPos = botPositions.get(botId);
	const machinePos = machinePositions.get(machineId);
	if (botPos && machinePos) {
		if (distance3D(botPos, machinePos) > maxRange) {
			return { success: false, reason: "out_of_range" };
		}
	}
	// If positions aren't registered, skip proximity check (for tests/headless)

	// Check inputs
	for (const input of recipe.inputs) {
		if (!hasItem(botId, input.itemId, input.count)) {
			return { success: false, reason: "missing_inputs" };
		}
	}

	// Consume inputs
	for (const input of recipe.inputs) {
		removeItem(botId, input.itemId, input.count);
	}

	// Create job
	const jobId = `craft_${nextJobId++}`;
	const job: CraftingJob = {
		id: jobId,
		machineId,
		botId,
		recipe,
		startedAtTick: currentTick,
		ticksRemaining: recipe.craftTicks,
	};

	activeJobs.set(jobId, job);

	return { success: true, jobId };
}

/**
 * Cancel an active crafting job.
 *
 * NOTE: consumed inputs are NOT refunded (items are lost).
 * Returns true if the job was found and cancelled.
 */
export function cancelCraft(jobId: string): boolean {
	return activeJobs.delete(jobId);
}

/**
 * Process all active crafting jobs for one tick.
 *
 * Jobs that complete have their output items added to the
 * crafting bot's inventory.
 *
 * @param _currentTick - the current simulation tick (for event logging)
 * @returns array of job IDs that completed this tick
 */
export function craftingSystem(_currentTick: number): string[] {
	const completed: string[] = [];

	for (const [jobId, job] of activeJobs) {
		job.ticksRemaining--;

		if (job.ticksRemaining <= 0) {
			// Produce output
			addItem(job.botId, job.recipe.outputItemId, job.recipe.outputCount);
			completed.push(jobId);
			activeJobs.delete(jobId);
		}
	}

	return completed;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all active crafting jobs as read-only snapshots.
 */
export function getActiveJobs(): CraftingJobSnapshot[] {
	const snapshots: CraftingJobSnapshot[] = [];
	for (const job of activeJobs.values()) {
		snapshots.push({
			id: job.id,
			machineId: job.machineId,
			botId: job.botId,
			recipeName: job.recipe.name,
			ticksRemaining: job.ticksRemaining,
			totalTicks: job.recipe.craftTicks,
			progress: 1 - job.ticksRemaining / job.recipe.craftTicks,
		});
	}
	return snapshots;
}

/**
 * Get all active jobs for a specific machine.
 */
export function getJobsForMachine(machineId: string): CraftingJobSnapshot[] {
	return getActiveJobs().filter((j) => j.machineId === machineId);
}

/**
 * Get the active job on a specific machine (if any).
 * Each machine supports one concurrent job.
 */
export function getJobForMachine(machineId: string): CraftingJobSnapshot | null {
	const jobs = getJobsForMachine(machineId);
	return jobs.length > 0 ? jobs[0] : null;
}

/**
 * Get the number of active crafting jobs globally.
 */
export function getActiveJobCount(): number {
	return activeJobs.size;
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Reset all crafting state. For testing and save/load.
 */
export function _resetCraftingState(): void {
	activeJobs.clear();
	nextJobId = 0;
	machinePositions.clear();
	botPositions.clear();

	// Restore default recipes
	recipes.clear();
	for (const r of DEFAULT_RECIPES) {
		recipes.set(r.id, r);
	}
}
