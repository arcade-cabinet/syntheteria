/**
 * POI entity management — spawns POITrait Koota entities from persisted
 * SectorPoiSnapshot data loaded at world initialization.
 *
 * Provides reactive access to POI state via useQuery(POITrait) in renderers
 * and UI components. Called once in initializeNewGame after world DB load.
 */

import { POITrait } from "../ecs/traits";
import { pois, world } from "../ecs/world";
import type { SectorPoiSnapshot } from "../world/snapshots";

// ─── State ───────────────────────────────────────────────────────────────────

/** Index by DB id for fast lookup and deduplication */
const _poiIndex = new Map<number, ReturnType<typeof world.spawn>>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Spawn POITrait entities from persisted snapshots.
 * Destroys any existing POI entities first (idempotent).
 */
export function spawnPOIEntities(snapshots: SectorPoiSnapshot[]): void {
	// Clear existing entities
	clearPOIEntities();

	for (const snap of snapshots) {
		const entity = world.spawn(POITrait);
		entity.set(POITrait, {
			q: snap.q,
			r: snap.r,
			poiType: snap.type,
			name: snap.name,
			discovered: snap.discovered === 1,
		});
		_poiIndex.set(snap.id, entity);
	}
}

/**
 * Destroy all POITrait entities and clear the index.
 * Called on reset/new game.
 */
export function clearPOIEntities(): void {
	for (const e of Array.from(pois)) {
		if (e.isAlive()) e.destroy();
	}
	_poiIndex.clear();
}
