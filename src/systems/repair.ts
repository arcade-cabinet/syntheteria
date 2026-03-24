/**
 * Unit repair system.
 *
 * A unit with functional arms can repair broken components on
 * an adjacent unit, consuming resources from the global pool.
 *
 * Repair costs depend on the component's material type.
 */

import type { Entity } from "koota";
import {
	BuildingTrait,
	EntityId,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import {
	hasArms,
	parseComponents,
	serializeComponents,
	type UnitComponent,
} from "../ecs/types";
import { world } from "../ecs/world";
import { type ResourcePool, spendResource } from "./resources";

/** Repair range -- units must be within this distance */
const REPAIR_RANGE = 3.0;

/** Material cost to repair one component */
const REPAIR_COSTS: Record<
	UnitComponent["material"],
	{ type: keyof ResourcePool; amount: number }
> = {
	metal: { type: "scrapMetal", amount: 3 },
	plastic: { type: "scrapMetal", amount: 1 },
	electronic: { type: "circuitry", amount: 2 },
};

export interface RepairAction {
	repairerId: string;
	targetId: string;
	componentName: string;
	ticksRemaining: number;
	totalTicks: number;
}

const activeRepairs: RepairAction[] = [];

export function getActiveRepairs(): RepairAction[] {
	return [...activeRepairs];
}

/**
 * Start repairing a component on a target entity.
 * Returns true if repair was started successfully.
 */
export function startRepair(
	repairer: Entity,
	target: Entity,
	componentName: string,
): boolean {
	// Validate repairer has arms
	const repairerComps = repairer.get(UnitComponents);
	if (!repairerComps) return false;
	if (!hasArms(parseComponents(repairerComps.componentsJson))) return false;

	// Validate distance
	const repairerPos = repairer.get(Position);
	const targetPos = target.get(Position);
	if (!repairerPos || !targetPos) return false;
	const dx = repairerPos.x - targetPos.x;
	const dz = repairerPos.z - targetPos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist > REPAIR_RANGE) return false;

	// Find the broken component (on unit or building)
	let components: UnitComponent[] | null = null;
	if (target.has(UnitComponents)) {
		components = parseComponents(target.get(UnitComponents)?.componentsJson);
	} else if (target.has(BuildingTrait)) {
		components = parseComponents(
			target.get(BuildingTrait)?.buildingComponentsJson,
		);
	}

	const comp = components?.find(
		(c: UnitComponent) => c.name === componentName && !c.functional,
	);
	if (!comp) return false;

	// Check and spend resources
	const cost = REPAIR_COSTS[comp.material];
	if (!spendResource(cost.type, cost.amount)) return false;

	const repairerId = repairer.get(EntityId)?.value ?? "";
	const targetId = target.get(EntityId)?.value ?? "";

	// Already repairing?
	const existing = activeRepairs.find(
		(r) => r.targetId === targetId && r.componentName === componentName,
	);
	if (existing) return false;

	// Start repair (takes 5 ticks)
	activeRepairs.push({
		repairerId,
		targetId,
		componentName,
		ticksRemaining: 5,
		totalTicks: 5,
	});

	return true;
}

/**
 * Repair system tick. Advances active repairs.
 */
export function repairSystem() {
	for (let i = activeRepairs.length - 1; i >= 0; i--) {
		const repair = activeRepairs[i];
		repair.ticksRemaining--;

		if (repair.ticksRemaining <= 0) {
			// Find target (unit or building) and fix the component
			let found = false;
			for (const entity of world.query(Unit, UnitComponents, EntityId)) {
				if (entity.get(EntityId)?.value === repair.targetId) {
					const comps = parseComponents(
						entity.get(UnitComponents)?.componentsJson,
					);
					const comp = comps.find(
						(c: UnitComponent) =>
							c.name === repair.componentName && !c.functional,
					);
					if (comp) {
						comp.functional = true;
						entity.set(UnitComponents, {
							componentsJson: serializeComponents(comps),
						});
					}
					found = true;
					break;
				}
			}
			if (!found) {
				for (const entity of world.query(BuildingTrait, EntityId)) {
					if (entity.get(EntityId)?.value === repair.targetId) {
						const comps = parseComponents(
							entity.get(BuildingTrait)?.buildingComponentsJson,
						);
						const comp = comps.find(
							(c: UnitComponent) =>
								c.name === repair.componentName && !c.functional,
						);
						if (comp) {
							comp.functional = true;
							entity.set(BuildingTrait, {
								buildingComponentsJson: serializeComponents(comps),
							});
						}
						break;
					}
				}
			}
			activeRepairs.splice(i, 1);
		}
	}
}
