/**
 * Factory functions for spawning mining drills and processor buildings.
 */

import { getFragment, getTerrainHeight } from "./terrain";
import type { Entity, MinerComponent, ProcessorComponent } from "./types";
import { world } from "./world";

let nextFactoryBuildingId = 0;

/**
 * Spawn a mining drill at a world position.
 * Extracts resources from the terrain and places them on an output belt.
 */
export function spawnMiner(options: {
	x: number;
	z: number;
	fragmentId: string;
	resourceType: MinerComponent["resourceType"];
	outputBeltId?: string;
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const y = getTerrainHeight(options.x, options.z);

	return world.add({
		id: `miner_${nextFactoryBuildingId++}`,
		faction: "player" as const,
		worldPosition: { x: options.x, y, z: options.z },
		mapFragment: { fragmentId: options.fragmentId },
		building: {
			type: "miner",
			powered: false,
			operational: false,
			selected: false,
			components: [
				{ name: "drill_head", functional: true, material: "metal" },
				{ name: "motor", functional: true, material: "electronic" },
			],
		},
		miner: {
			resourceType: options.resourceType,
			extractionRate: 0.1, // 1 item per 10 ticks
			outputBeltId: options.outputBeltId ?? null,
			drillHealth: 1.0,
			active: true,
		},
	} as Partial<Entity> as Entity);
}

/**
 * Spawn a processor building at a world position.
 * Transforms raw materials into refined ones via recipes.
 */
export function spawnProcessor(options: {
	x: number;
	z: number;
	fragmentId: string;
	processorType: ProcessorComponent["processorType"];
	inputBeltId?: string;
	outputBeltId?: string;
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const y = getTerrainHeight(options.x, options.z);

	return world.add({
		id: `processor_${nextFactoryBuildingId++}`,
		faction: "player" as const,
		worldPosition: { x: options.x, y, z: options.z },
		mapFragment: { fragmentId: options.fragmentId },
		building: {
			type: options.processorType,
			powered: false,
			operational: false,
			selected: false,
			components: [
				{ name: "processing_unit", functional: true, material: "electronic" },
				{ name: "intake", functional: true, material: "metal" },
				{ name: "output_chute", functional: true, material: "metal" },
			],
		},
		processor: {
			processorType: options.processorType,
			recipe: null,
			inputBeltId: options.inputBeltId ?? null,
			outputBeltId: options.outputBeltId ?? null,
			progress: 0,
			speed: 60, // 60 ticks to complete
			active: true,
		},
	} as Partial<Entity> as Entity);
}
