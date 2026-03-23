import type { UnitEntity } from "../ecs/traits";

/**
 * Fragment merge system: now deprecated since we use a single global map fragment.
 */

export interface MergeEvent {
	absorbedId: string;
	survivorId: string;
}

export function fragmentMergeSystem(): MergeEvent[] {
	return [];
}
