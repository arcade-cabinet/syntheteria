/**
 * Resource and scavenging system.
 *
 * Manages 4 core materials: scrap metal, circuitry, power cells, durasteel.
 * Two scavenging paths:
 * - ScavengeSite ECS entities: units scavenge into per-unit Inventory trait
 * - Legacy ScavengePoint array: for backward compat until labyrinth seeds sites
 * Both paths also deposit into the global ResourcePool.
 */

import {
	MATERIALS,
	type MaterialId,
	pickMaterialByWeight,
} from "../config/materials";
import { isInsideBuilding } from "../ecs/cityLayout";
import {
	Faction,
	Inventory,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import {
	addToInventory,
	hasArms,
	parseComponents,
	parseInventory,
	serializeInventory,
} from "../ecs/types";
import { world } from "../ecs/world";

export interface ResourcePool {
	scrapMetal: number;
	circuitry: number;
	powerCells: number;
	durasteel: number;
}

// Global resource pool
const resources: ResourcePool = {
	scrapMetal: 0,
	circuitry: 0,
	powerCells: 0,
	durasteel: 0,
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

/** Reset all resources to zero (for testing) */
export function resetResources(): void {
	for (const key of Object.keys(resources) as (keyof ResourcePool)[]) {
		resources[key] = 0;
	}
}

// --- Scavenge Points (legacy) ---

export interface ScavengePoint {
	x: number;
	z: number;
	remaining: number;
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

	for (let z = -15; z < 45; z += 4) {
		for (let x = -25; x < 45; x += 4) {
			if (rng() > 0.35) continue;
			if (isInsideBuilding(x, z)) continue;

			const materialId = pickMaterialByWeight(rng);
			const mat = MATERIALS[materialId];
			const amount =
				mat.baseYield + Math.floor(rng() * Math.max(1, mat.baseYield));
			const remaining =
				mat.baseDurability +
				Math.floor(rng() * Math.max(1, mat.baseDurability));

			points.push({
				x: x + (rng() - 0.5) * 3,
				z: z + (rng() - 0.5) * 3,
				remaining,
				type: materialId as keyof ResourcePool,
				amountPerScavenge: amount,
			});
		}
	}

	scavengePoints = points;
	return points;
}

/** Reset legacy scavenge points (for testing) */
export function resetScavengePoints(): void {
	scavengePoints = null;
}

// --- Scavenging Constants ---

/** Auto-scavenge range for units with arms */
const SCAVENGE_RANGE = 2.5;

// --- ECS-based Scavenging (ScavengeSite entities) ---

/**
 * Scavenge from ScavengeSite entities into unit Inventory + global pool.
 * Units with functional arms, idle, and within range automatically scavenge.
 */
function scavengeFromSites(): void {
	const sites = Array.from(world.query(Position, ScavengeSite));
	if (sites.length === 0) return;

	for (const entity of world.query(
		Position,
		Unit,
		UnitComponents,
		Faction,
		Navigation,
		Inventory,
	)) {
		if (entity.get(Faction)?.value !== "player") continue;
		const components = parseComponents(
			entity.get(UnitComponents)?.componentsJson,
		);
		if (!hasArms(components)) continue;
		const nav = entity.get(Navigation)!;
		if (nav.moving) continue;

		const pos = entity.get(Position)!;

		for (const site of sites) {
			const siteData = site.get(ScavengeSite)!;
			if (siteData.remaining <= 0) continue;

			const sitePos = site.get(Position)!;
			const dx = sitePos.x - pos.x;
			const dz = sitePos.z - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= SCAVENGE_RANGE) {
				// Add to unit inventory
				const inv = parseInventory(entity.get(Inventory)?.inventoryJson);
				const updated = addToInventory(
					inv,
					siteData.materialType,
					siteData.amountPerScavenge,
				);
				entity.set(Inventory, {
					inventoryJson: serializeInventory(updated),
				});

				// Also add to global pool
				const materialId = siteData.materialType as keyof ResourcePool;
				if (materialId in resources) {
					resources[materialId] += siteData.amountPerScavenge;
				}

				// Deplete site
				site.set(ScavengeSite, {
					remaining: siteData.remaining - 1,
				});

				break; // one scavenge per tick per unit
			}
		}
	}
}

// --- Legacy Scavenging (ScavengePoint array) ---

/**
 * Scavenge from legacy ScavengePoint array into global pool.
 */
function scavengeFromLegacyPoints(): void {
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
		if (nav.moving) continue;

		const pos = entity.get(Position)!;

		for (const point of points) {
			if (point.remaining <= 0) continue;

			const dx = point.x - pos.x;
			const dz = point.z - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= SCAVENGE_RANGE) {
				resources[point.type] += point.amountPerScavenge;
				point.remaining--;
				break;
			}
		}
	}
}

/**
 * Scavenging system. Called once per sim tick.
 * Runs both ECS-based and legacy scavenging.
 */
export function resourceSystem() {
	scavengeFromSites();
	scavengeFromLegacyPoints();
}
