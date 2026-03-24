/**
 * Resource and scavenging system.
 *
 * Manages material resources gathered from the world:
 * - Scrap metal, e-waste, intact components
 * - Scavenge points scattered through the city
 * - Units with functional arms can scavenge nearby points
 */

import { isInsideBuilding } from "../ecs/cityLayout";
import {
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { hasArms, parseComponents } from "../ecs/types";
import { world } from "../ecs/world";

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

export function getResources(): ResourcePool {
	return { ...resources };
}

export function addResource(type: keyof ResourcePool, amount: number) {
	resources[type] += amount;
}

export function spendResource(
	type: keyof ResourcePool,
	amount: number,
): boolean {
	if (resources[type] < amount) return false;
	resources[type] -= amount;
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

// Seeded PRNG
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};
}

let scavengePoints: ScavengePoint[] | null = null;

export function getScavengePoints(): ScavengePoint[] {
	if (scavengePoints) return scavengePoints;

	const rng = seededRandom(789);
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

/** Auto-scavenge range for units with arms */
const SCAVENGE_RANGE = 2.5;

/**
 * Scavenging system. Called once per sim tick.
 * Units with functional arms automatically scavenge nearby resource points.
 */
export function resourceSystem() {
	const points = getScavengePoints();

	for (const entity of world.query(
		Position,
		Unit,
		UnitComponents,
		Faction,
		Navigation,
	)) {
		if (entity.get(Faction)?.value !== "player") continue;
		const components = parseComponents(
			entity.get(UnitComponents)?.componentsJson,
		);
		if (!hasArms(components)) continue;
		const nav = entity.get(Navigation)!;
		if (nav.moving) continue; // busy moving

		const pos = entity.get(Position)!;

		for (const point of points) {
			if (point.remaining <= 0) continue;

			const dx = point.x - pos.x;
			const dz = point.z - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= SCAVENGE_RANGE) {
				resources[point.type] += point.amountPerScavenge;
				point.remaining--;
				break; // one scavenge per tick per unit
			}
		}
	}
}
