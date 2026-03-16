/**
 * @module resources
 *
 * Global resource pool (11 material types) and proximity-based scavenging system.
 * Units with functional arms auto-scavenge nearby resource points each tick.
 * Provides the add/spend API consumed by all economy systems.
 *
 * @exports ResourcePool - 11-field resource interface (scrapMetal through elCrystal)
 * @exports getResources / addResource / spendResource - Read/mutate the global pool
 * @exports defaultResourcePool - Factory for zero-initialized pools
 * @exports ScavengePoint / getScavengePoints / resetScavengePoints - Scavenge point management
 * @exports resourceSystem - Per-tick scavenging logic
 * @exports resetResources / setResources - Reset and bulk-set for save/load
 * @exports initResourcePoolEntity / getResourcePoolEntity - Koota entity for reactive UI
 *
 * @dependencies ai (isEntityExecutingAITask), ecs/cityLayout, ecs/seed (worldPRNG),
 *   ecs/traits, ecs/world, world/runtimeState, resourceDeltas
 * @consumers gameState, buildingPlacement, harvestSystem, combat, fabrication,
 *   PlacementHUD, ResourceBreakdownPanel, ResourceStrip, TopBar, saveAllState,
 *   worldPersistence, persistenceSystem, constructionSystem, districtOperations,
 *   runtimeState, cityTransition, snapshots, initialization
 */
import { isEntityExecutingAITask } from "../ai";
import { isInsideBuilding } from "../ecs/cityLayout";
import { worldPRNG } from "../ecs/seed";
import type { Entity } from "../ecs/traits";
import {
	hasArms,
	ResourcePool as ResourcePoolTrait,
	WorldPosition,
} from "../ecs/traits";
import { units, world } from "../ecs/world";
import { setRuntimeResources } from "../world/runtimeState";
import {
	trackResourceExpenditure,
	trackResourceIncome,
} from "./resourceDeltas";

export interface ResourcePool {
	scrapMetal: number;
	eWaste: number;
	intactComponents: number;
	// Harvest resources — the Exploit pillar (urban mining).
	// Named after real material science categories from the dead ecumenopolis.
	// Optional for backward compatibility with existing construction costs.
	ferrousScrap?: number; // Walls, columns, structural steel → chassis, armor
	alloyStock?: number; // Props, equipment → sensors, light chassis
	polymerSalvage?: number; // Pipes, insulation → wiring, seals
	conductorWire?: number; // Electronics, terminals → circuits, relay
	electrolyte?: number; // Vessels, batteries → power cells, fuel
	siliconWafer?: number; // Computers, processors → AI cores, Mark upgrades
	stormCharge?: number; // Lightning capture → power, energy weapons
	elCrystal?: number; // Cultist breach zones → wormhole tech, endgame
}

// Global resource pool
const resources: ResourcePool = {
	scrapMetal: 0,
	eWaste: 0,
	intactComponents: 0,
	ferrousScrap: 0,
	alloyStock: 0,
	polymerSalvage: 0,
	conductorWire: 0,
	electrolyte: 0,
	siliconWafer: 0,
	stormCharge: 0,
	elCrystal: 0,
};

// ─── Koota entity (reactive mirror for useTrait) ──────────────────────────────

let _resourcePoolEntity: Entity | null = null;

/**
 * Spawn (or reset) the ResourcePool Koota entity.
 * Call from initializeNewGame() so UI can reactively read resources via useTrait.
 */
export function initResourcePoolEntity(): void {
	if (_resourcePoolEntity && _resourcePoolEntity.isAlive())
		_resourcePoolEntity.destroy();
	_resourcePoolEntity = world.spawn(ResourcePoolTrait);
	_resourcePoolEntity.set(ResourcePoolTrait, {
		scrapMetal: resources.scrapMetal,
		eWaste: resources.eWaste,
		intactComponents: resources.intactComponents,
		refinedAlloys: 0,
		powerCells: 0,
		circuitry: 0,
		opticalFiber: 0,
		nanoComposites: 0,
		quantumCores: 0,
		biomimeticPolymers: 0,
		darkMatter: 0,
	});
}

/**
 * Return the live ResourcePool entity.
 * Throws if initResourcePoolEntity() has not been called.
 */
export function getResourcePoolEntity(): Entity {
	if (!_resourcePoolEntity)
		throw new Error("ResourcePool entity not initialized");
	return _resourcePoolEntity;
}

/** Sync the entity's reactive fields from the current module-level pool. */
function syncEntityFromPool(): void {
	if (!_resourcePoolEntity || !_resourcePoolEntity.isAlive()) return;
	const cur = _resourcePoolEntity.get(ResourcePoolTrait)!;
	_resourcePoolEntity.set(ResourcePoolTrait, {
		...cur,
		scrapMetal: resources.scrapMetal,
		eWaste: resources.eWaste,
		intactComponents: resources.intactComponents,
	});
}

/** Create a ResourcePool with all fields defaulting to 0 */
export function defaultResourcePool(
	overrides: Partial<ResourcePool> = {},
): ResourcePool {
	return {
		scrapMetal: 0,
		eWaste: 0,
		intactComponents: 0,
		ferrousScrap: 0,
		alloyStock: 0,
		polymerSalvage: 0,
		conductorWire: 0,
		electrolyte: 0,
		siliconWafer: 0,
		stormCharge: 0,
		elCrystal: 0,
		...overrides,
	};
}

export function getResources(): ResourcePool {
	return { ...resources };
}

export function addResource(type: keyof ResourcePool, amount: number) {
	(resources[type] as number) = ((resources[type] as number) ?? 0) + amount;
	trackResourceIncome(type, amount);
	setRuntimeResources(resources);
	syncEntityFromPool();
}

export function spendResource(
	type: keyof ResourcePool,
	amount: number,
): boolean {
	if (((resources[type] as number) ?? 0) < amount) return false;
	(resources[type] as number) = ((resources[type] as number) ?? 0) - amount;
	trackResourceExpenditure(type, amount);
	setRuntimeResources(resources);
	syncEntityFromPool();
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

function generateScavengePoints(): ScavengePoint[] {
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

	return points;
}

/** Active scavenge points — lazily initialized to avoid worldPRNG at module load. */
let activeScavengePoints: ScavengePoint[] | null = null;

/** Reset scavenge points — call on new game. */
export function resetScavengePoints() {
	activeScavengePoints = generateScavengePoints();
}

/** Return the current scavenge points, generating lazily on first access. */
export function getScavengePoints(): ScavengePoint[] {
	if (!activeScavengePoints) {
		activeScavengePoints = generateScavengePoints();
	}
	return activeScavengePoints;
}

export function resetResources() {
	resources.scrapMetal = 0;
	resources.eWaste = 0;
	resources.intactComponents = 0;
	resources.ferrousScrap = 0;
	resources.alloyStock = 0;
	resources.polymerSalvage = 0;
	resources.conductorWire = 0;
	resources.electrolyte = 0;
	resources.siliconWafer = 0;
	resources.stormCharge = 0;
	resources.elCrystal = 0;
	resetScavengePoints();
	setRuntimeResources(resources);
	syncEntityFromPool();
}

export function setResources(nextResources: Partial<ResourcePool>) {
	for (const key of Object.keys(resources) as (keyof ResourcePool)[]) {
		if (key in nextResources) {
			(resources[key] as number) =
				(nextResources[key] as number) ?? (resources[key] as number);
		}
	}
	setRuntimeResources(resources);
	syncEntityFromPool();
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
				syncEntityFromPool();
				break; // one scavenge per tick per unit
			}
		}
	}
}
