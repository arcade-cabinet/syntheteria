/**
 * @module useResourcePool
 *
 * React hook that reads the global ResourcePool from the Koota entity,
 * giving reactive updates without subscribing to the full gameState snapshot.
 *
 * Pattern: useQueryFirst(ResourcePool) → entity → useTrait(entity, ResourcePool)
 *
 * Falls back to zero values when the entity is not yet initialized (pre-game).
 *
 * @exports useResourcePool - Returns the live ResourcePool trait data
 */
import { useQueryFirst, useTrait } from "koota/react";
import { ResourcePool } from "../../ecs/traits";

const EMPTY = {
	scrapMetal: 0,
	eWaste: 0,
	intactComponents: 0,
	refinedAlloys: 0,
	powerCells: 0,
	circuitry: 0,
	opticalFiber: 0,
	nanoComposites: 0,
	quantumCores: 0,
	biomimeticPolymers: 0,
	darkMatter: 0,
} as const;

/**
 * Returns the live ResourcePool trait from the singleton Koota entity.
 * Reactive: re-renders when any tracked resource changes via addResource / spendResource.
 * Returns zero-initialized values before initResourcePoolEntity() is called.
 */
export function useResourcePool() {
	const entity = useQueryFirst(ResourcePool);
	const pool = useTrait(entity ?? null, ResourcePool);
	return pool ?? EMPTY;
}
