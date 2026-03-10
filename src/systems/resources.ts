/**
 * Resource and scavenging system.
 *
 * Manages material resources gathered from the world:
 * - Scrap metal, e-waste, intact components
 * - Scavenge points scattered through the city
 * - Units with functional arms can scavenge nearby points
 *
 * Tunables sourced from config/mining.json scavenging section.
 */

import { config } from "../../config";
import { isInsideBuilding } from "../ecs/cityLayout";
import { worldPRNG } from "../ecs/seed";
import { hasArms } from "../ecs/types";
import { units } from "../ecs/world";

const scavCfg = config.mining.scavenging;

export interface ResourcePool {
	scrapMetal: number;
	eWaste: number;
	intactComponents: number;
}

// Global resource pool
const resources: ResourcePool = {
	scrapMetal: 0,
	eWaste: 0,
	intactComponents: 0,
};

// --- Resource gain subscribers ---
type ResourceGainCallback = (type: keyof ResourcePool, amount: number) => void;
const resourceGainListeners = new Set<ResourceGainCallback>();

export function onResourceGain(
	callback: ResourceGainCallback,
): () => void {
	resourceGainListeners.add(callback);
	return () => {
		resourceGainListeners.delete(callback);
	};
}

function notifyResourceGain(type: keyof ResourcePool, amount: number) {
	for (const cb of resourceGainListeners) {
		cb(type, amount);
	}
}

export function getResources(): ResourcePool {
	return { ...resources };
}

export function addResource(type: keyof ResourcePool, amount: number) {
	resources[type] += amount;
	notifyResourceGain(type, amount);
}

export function spendResource(
	type: keyof ResourcePool,
	amount: number,
): boolean {
	if (resources[type] < amount) return false;
	resources[type] -= amount;
	return true;
}

/** Reset the resource pool to zero — for testing and save/load. */
export function resetResourcePool(): void {
	resources.scrapMetal = 0;
	resources.eWaste = 0;
	resources.intactComponents = 0;
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
	for (let z = scavCfg.gridMinZ; z < scavCfg.gridMaxZ; z += scavCfg.gridSpacing) {
		for (let x = scavCfg.gridMinX; x < scavCfg.gridMaxX; x += scavCfg.gridSpacing) {
			if (rng() > scavCfg.spawnChance) continue;
			// Don't place inside buildings
			if (isInsideBuilding(x, z)) continue;

			const typeRoll = rng();
			let type: keyof ResourcePool;
			let amount: number;
			let remaining: number;

			const scrapWeight = scavCfg.types.scrapMetal.weight;
			const eWasteWeight = scrapWeight + scavCfg.types.eWaste.weight;

			if (typeRoll < scrapWeight) {
				type = "scrapMetal";
				const t = scavCfg.types.scrapMetal;
				amount = t.amountMin + Math.floor(rng() * t.amountRange);
				remaining = t.remainingMin + Math.floor(rng() * t.remainingRange);
			} else if (typeRoll < eWasteWeight) {
				type = "eWaste";
				const t = scavCfg.types.eWaste;
				amount = t.amountMin + Math.floor(rng() * t.amountRange);
				remaining = t.remainingMin + Math.floor(rng() * t.remainingRange);
			} else {
				type = "intactComponents";
				const t = scavCfg.types.intactComponents;
				amount = t.amountMin + Math.floor(rng() * t.amountRange);
				remaining = t.remainingMin + Math.floor(rng() * t.remainingRange);
			}

			points.push({
				x: x + (rng() - 0.5) * scavCfg.jitter,
				z: z + (rng() - 0.5) * scavCfg.jitter,
				remaining,
				type,
				amountPerScavenge: amount,
			});
		}
	}

	scavengePoints = points;
	return points;
}

/** Auto-scavenge range for units with arms */
const SCAVENGE_RANGE = scavCfg.range;

/**
 * Scavenging system. Called once per sim tick.
 * Units with functional arms automatically scavenge nearby resource points.
 */
export function resourceSystem() {
	const points = getScavengePoints();

	for (const unit of units) {
		if (!hasArms(unit)) continue;
		if (unit.navigation?.moving) continue; // busy moving

		const ux = unit.worldPosition.x;
		const uz = unit.worldPosition.z;

		for (const point of points) {
			if (point.remaining <= 0) continue;

			const dx = point.x - ux;
			const dz = point.z - uz;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= SCAVENGE_RANGE) {
				resources[point.type] += point.amountPerScavenge;
				notifyResourceGain(point.type, point.amountPerScavenge);
				point.remaining--;
				break; // one scavenge per tick per unit
			}
		}
	}
}
