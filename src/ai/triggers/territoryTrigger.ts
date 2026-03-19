/**
 * TerritoryTrigger — territory-based trigger system for AI reactions.
 *
 * Uses the concept of Yuka's TriggerRegion but adapted for our tile grid:
 * - Each faction has a set of claimed tiles (their "territory")
 * - When enemy units enter a faction's territory → triggers defensive alert
 * - When own units leave territory → triggers recall consideration
 *
 * We don't use Yuka's SphericalTriggerRegion/RectangularTriggerRegion
 * directly because our territories are irregular tile sets, not geometric
 * shapes. Instead, we implement the same event-driven pattern with tile sets.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TerritoryEventType =
	| "enemy_entered" // Enemy unit entered our territory
	| "enemy_exited" // Enemy unit left our territory
	| "own_left" // Own unit left our territory
	| "own_returned"; // Own unit returned to our territory

export interface TerritoryEvent {
	type: TerritoryEventType;
	factionId: string;
	entityId: number;
	tileX: number;
	tileZ: number;
	turn: number;
}

// ---------------------------------------------------------------------------
// TerritoryTracker
// ---------------------------------------------------------------------------

export class TerritoryTracker {
	/** Claimed tiles as "x,z" keys. */
	private territory = new Set<string>();

	/** Previous known positions of tracked entities: entityId → "x,z" */
	private lastKnownPositions = new Map<number, string>();

	/** The faction this tracker belongs to. */
	readonly factionId: string;

	constructor(factionId: string) {
		this.factionId = factionId;
	}

	/** Update the territory tile set. */
	setTerritory(tiles: Set<string>): void {
		this.territory = tiles;
	}

	/** Add a tile to territory. */
	claimTile(x: number, z: number): void {
		this.territory.add(`${x},${z}`);
	}

	/** Check if a tile is in this faction's territory. */
	isInTerritory(x: number, z: number): boolean {
		return this.territory.has(`${x},${z}`);
	}

	/** Number of claimed tiles. */
	get size(): number {
		return this.territory.size;
	}

	/**
	 * Process unit movements and detect territory events.
	 * Call once per turn after all movement is resolved.
	 *
	 * @param units - All units to track: own faction + enemies
	 * @param turn - Current turn number
	 * @returns Array of territory events that occurred
	 */
	detectEvents(
		units: Array<{
			entityId: number;
			factionId: string;
			tileX: number;
			tileZ: number;
		}>,
		turn: number,
	): TerritoryEvent[] {
		const events: TerritoryEvent[] = [];

		for (const unit of units) {
			const currentKey = `${unit.tileX},${unit.tileZ}`;
			const prevKey = this.lastKnownPositions.get(unit.entityId);
			const wasInTerritory = prevKey ? this.territory.has(prevKey) : false;
			const isInTerritory = this.territory.has(currentKey);
			const isOwnUnit = unit.factionId === this.factionId;

			if (isOwnUnit) {
				// Own unit tracking
				if (wasInTerritory && !isInTerritory) {
					events.push({
						type: "own_left",
						factionId: this.factionId,
						entityId: unit.entityId,
						tileX: unit.tileX,
						tileZ: unit.tileZ,
						turn,
					});
				} else if (!wasInTerritory && isInTerritory) {
					events.push({
						type: "own_returned",
						factionId: this.factionId,
						entityId: unit.entityId,
						tileX: unit.tileX,
						tileZ: unit.tileZ,
						turn,
					});
				}
			} else {
				// Enemy unit tracking
				if (!wasInTerritory && isInTerritory) {
					events.push({
						type: "enemy_entered",
						factionId: this.factionId,
						entityId: unit.entityId,
						tileX: unit.tileX,
						tileZ: unit.tileZ,
						turn,
					});
				} else if (wasInTerritory && !isInTerritory) {
					events.push({
						type: "enemy_exited",
						factionId: this.factionId,
						entityId: unit.entityId,
						tileX: unit.tileX,
						tileZ: unit.tileZ,
						turn,
					});
				}
			}

			this.lastKnownPositions.set(unit.entityId, currentKey);
		}

		return events;
	}

	/** Remove tracking for a destroyed entity. */
	forgetEntity(entityId: number): void {
		this.lastKnownPositions.delete(entityId);
	}

	/** Clear all state. */
	clear(): void {
		this.territory.clear();
		this.lastKnownPositions.clear();
	}
}

// ---------------------------------------------------------------------------
// Registry — one TerritoryTracker per faction
// ---------------------------------------------------------------------------

const _trackers = new Map<string, TerritoryTracker>();

export function getTerritoryTracker(factionId: string): TerritoryTracker {
	let tracker = _trackers.get(factionId);
	if (!tracker) {
		tracker = new TerritoryTracker(factionId);
		_trackers.set(factionId, tracker);
	}
	return tracker;
}

export function resetAllTerritoryTrackers(): void {
	_trackers.clear();
}

/**
 * Check if any enemies are inside a faction's territory.
 * Useful for defensive evaluator boost.
 */
export function countEnemiesInTerritory(
	factionId: string,
	enemies: Array<{ tileX: number; tileZ: number }>,
): number {
	const tracker = _trackers.get(factionId);
	if (!tracker) return 0;
	let count = 0;
	for (const enemy of enemies) {
		if (tracker.isInTerritory(enemy.tileX, enemy.tileZ)) {
			count++;
		}
	}
	return count;
}
