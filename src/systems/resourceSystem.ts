import type { World } from "koota";
import type { ResourceMaterial } from "../terrain/types";
import { Faction, ResourcePool } from "../traits";

/** Get the ResourcePool values for the player faction. */
export function getPlayerResources(
	world: World,
): Record<ResourceMaterial, number> | null {
	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		if (!f || !f.isPlayer) continue;
		const pool = e.get(ResourcePool);
		if (!pool) continue;
		return { ...pool } as Record<ResourceMaterial, number>;
	}
	return null;
}

/** Add resources to a faction's pool. */
export function addResources(
	world: World,
	factionId: string,
	material: ResourceMaterial,
	amount: number,
): void {
	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		if (!f || f.id !== factionId) continue;
		const pool = e.get(ResourcePool);
		if (!pool) continue;
		e.set(ResourcePool, {
			...pool,
			[material]: (pool[material as keyof typeof pool] as number) + amount,
		});
		return;
	}
}

/** Spend resources from a faction's pool. Returns false if insufficient. */
export function spendResources(
	world: World,
	factionId: string,
	material: ResourceMaterial,
	amount: number,
): boolean {
	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		if (!f || f.id !== factionId) continue;
		const pool = e.get(ResourcePool);
		if (!pool) continue;
		const current = pool[material as keyof typeof pool] as number;
		if (current < amount) return false;
		e.set(ResourcePool, { ...pool, [material]: current - amount });
		return true;
	}
	return false;
}

/** Check if a faction can afford a cost. */
export function canAfford(
	world: World,
	factionId: string,
	costs: Partial<Record<ResourceMaterial, number>>,
): boolean {
	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		if (!f || f.id !== factionId) continue;
		const pool = e.get(ResourcePool);
		if (!pool) continue;
		for (const [mat, needed] of Object.entries(costs)) {
			const current = pool[mat as keyof typeof pool] as number;
			if (current < (needed ?? 0)) return false;
		}
		return true;
	}
	return false;
}
