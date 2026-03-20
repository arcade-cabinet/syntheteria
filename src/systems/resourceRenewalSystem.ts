/**
 * Resource renewal system — powered infrastructure generates resources each turn.
 *
 * Salvage nodes are finite. By turn 300 most are consumed. Power infrastructure
 * serves double duty: it generates power AND produces renewable income.
 *
 * Per turn, each powered building of these types generates:
 *   - storm_transmitter → 1 storm_charge
 *   - geothermal_tap    → 1 thermal_fluid
 *   - solar_array        → 1 electrolyte
 *
 * Called once per turn in the environment phase, after runPowerGrid
 * (so Powered trait is up-to-date).
 */

import type { World } from "koota";
import type { ResourceMaterial } from "../terrain/types";
import { Building, type BuildingType, Powered } from "../traits";
import { addResources } from "./resourceSystem";

/** Which building types generate which resource, and how much per turn. */
export const RENEWAL_YIELDS: Partial<
	Record<BuildingType, { material: ResourceMaterial; amount: number }>
> = {
	storm_transmitter: { material: "fuel", amount: 1 },
	geothermal_tap: { material: "fuel", amount: 1 },
	solar_array: { material: "fuel", amount: 1 },
	resource_refinery: { material: "iron_ore", amount: 2 },
	synthesizer: { material: "stone", amount: 1 },
};

/**
 * Tick resource renewal for all powered buildings that have a yield.
 * Returns the total number of resources generated (useful for testing).
 */
export function runResourceRenewal(world: World): number {
	let total = 0;

	for (const e of world.query(Building, Powered)) {
		const b = e.get(Building);
		if (!b) continue;

		const yield_ = RENEWAL_YIELDS[b.buildingType];
		if (!yield_) continue;

		addResources(world, b.factionId, yield_.material, yield_.amount);
		total += yield_.amount;
	}

	return total;
}
