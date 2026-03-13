import { isEntityExecutingAITask } from "../ai";
import { isInsideBuilding } from "../ecs/cityLayout";
import { worldPRNG } from "../ecs/seed";
import { hasArms, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { setRuntimeResources } from "../world/runtimeState";
/**
 * Resource and scavenging system.
 *
 * Manages material resources gathered from the world:
 * - Scrap metal, e-waste, intact components
 * - Scavenge points scattered through the city
 * - Units with functional arms can scavenge nearby points
 */

export interface ResourcePool {
	scrapMetal: number;
	eWaste: number;
	intactComponents: number;
	// Harvest resources — the Exploit pillar.
	// Optional for backward compatibility with existing construction costs
	// and test fixtures. Default to 0 via defaultResourcePool().
	heavyMetals?: number;
	lightMetals?: number;
	uranics?: number;
	plastics?: number;
	oil?: number;
	microchips?: number;
	rareComponents?: number;
}

// Global resource pool
const resources: ResourcePool = {
	scrapMetal: 0,
	eWaste: 0,
	intactComponents: 0,
	heavyMetals: 0,
	lightMetals: 0,
	uranics: 0,
	plastics: 0,
	oil: 0,
	microchips: 0,
	rareComponents: 0,
};

/** Create a ResourcePool with all fields defaulting to 0 */
export function defaultResourcePool(
	overrides: Partial<ResourcePool> = {},
): ResourcePool {
	return {
		scrapMetal: 0,
		eWaste: 0,
		intactComponents: 0,
		heavyMetals: 0,
		lightMetals: 0,
		uranics: 0,
		plastics: 0,
		oil: 0,
		microchips: 0,
		rareComponents: 0,
		...overrides,
	};
}

export function getResources(): ResourcePool {
	return { ...resources };
}

export function addResource(type: keyof ResourcePool, amount: number) {
	(resources[type] as number) = ((resources[type] as number) ?? 0) + amount;
	setRuntimeResources(resources);
}

export function spendResource(
	type: keyof ResourcePool,
	amount: number,
): boolean {
	if (((resources[type] as number) ?? 0) < amount) return false;
	(resources[type] as number) = ((resources[type] as number) ?? 0) - amount;
	setRuntimeResources(resources);
	return true;
}

// --- Scavenge Points ---

export interface ScavengePoint {
	x: number;
	z: number;
	remaining: number; // how many scavenges left
	type: keyof ResourcePool;
	amountPerScavenge: number;
}

let scavengePoints: ScavengePoint[] | null = null;

/** Reset cached scavenge points — call when the world seed changes. */
export function resetScavengePoints() {
	scavengePoints = null;
}

export function getScavengePoints(): ScavengePoint[] {
	if (scavengePoints) return scavengePoints;

	const rng = worldPRNG("resources");
	const points: ScavengePoint[] = [];

	// Scatter scavenge points through the city area
	for (let z = -15; z < 45; z += 4) {
		for (let x = -25; x < 45; x += 4) {
			if (rng() > 0.35) continue; // ~35% chance
			// Don't place inside buildings
			if (isInsideBuilding(x, z)) continue;

			const typeRoll = rng();
			let type: keyof ResourcePool;
			let amount: number;
			let remaining: number;

			if (typeRoll < 0.5) {
				type = "scrapMetal";
				amount = 2 + Math.floor(rng() * 3);
				remaining = 3 + Math.floor(rng() * 4);
			} else if (typeRoll < 0.85) {
				type = "eWaste";
				amount = 1 + Math.floor(rng() * 2);
				remaining = 2 + Math.floor(rng() * 3);
			} else {
				type = "intactComponents";
				amount = 1;
				remaining = 1 + Math.floor(rng() * 2);
			}

			points.push({
				x: x + (rng() - 0.5) * 3,
				z: z + (rng() - 0.5) * 3,
				remaining,
				type,
				amountPerScavenge: amount,
			});
		}
	}

	scavengePoints = points;
	return points;
}

export function resetResources() {
	resources.scrapMetal = 0;
	resources.eWaste = 0;
	resources.intactComponents = 0;
	resources.heavyMetals = 0;
	resources.lightMetals = 0;
	resources.uranics = 0;
	resources.plastics = 0;
	resources.oil = 0;
	resources.microchips = 0;
	resources.rareComponents = 0;
	scavengePoints = null;
	setRuntimeResources(resources);
}

export function setResources(nextResources: Partial<ResourcePool>) {
	for (const key of Object.keys(resources) as (keyof ResourcePool)[]) {
		if (key in nextResources) {
			(resources[key] as number) =
				(nextResources[key] as number) ?? (resources[key] as number);
		}
	}
	setRuntimeResources(resources);
}

/** Auto-scavenge range for units with arms */
const SCAVENGE_RANGE = 2.5;

/**
 * Scavenging system. Called once per sim tick.
 * Units with functional arms automatically scavenge nearby resource points.
 */
export function resourceSystem() {
	const points = getScavengePoints();

	for (const unit of units) {
		if (!hasArms(unit)) continue;
		if (isEntityExecutingAITask(unit)) continue;

		const ux = unit.get(WorldPosition)?.x;
		const uz = unit.get(WorldPosition)?.z;

		for (const point of points) {
			if (point.remaining <= 0) continue;

			const dx = point.x - ux!;
			const dz = point.z - uz!;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= SCAVENGE_RANGE) {
				resources[point.type] += point.amountPerScavenge;
				point.remaining--;
				setRuntimeResources(resources);
				break; // one scavenge per tick per unit
			}
		}
	}
}
