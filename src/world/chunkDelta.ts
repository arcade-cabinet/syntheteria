import type { GeneratedSectorStructure } from "./sectorStructurePlan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single modification to a chunk — one of three kinds. */
export type ChunkModification =
	| { kind: "harvest"; structureId: string; tick: number }
	| { kind: "build"; structure: GeneratedSectorStructure; tick: number }
	| {
			kind: "terrain";
			q: number;
			r: number;
			field: string;
			value: string | number | boolean;
			tick: number;
	  };

/** All player-made modifications for a single chunk. */
export interface ChunkDelta {
	chunkX: number;
	chunkZ: number;
	modifications: ChunkModification[];
}

/** Serialized form stored in save files. */
export interface SerializedChunkDeltas {
	version: 1;
	deltas: ChunkDelta[];
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Map from "chunkX,chunkZ" to the list of modifications. */
const deltaMap = new Map<string, ChunkModification[]>();

function chunkKey(chunkX: number, chunkZ: number): string {
	return `${chunkX},${chunkZ}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a single modification in a chunk.
 *
 * Creates the chunk entry on first write — unmodified chunks have zero cost.
 */
export function recordDelta(
	chunkX: number,
	chunkZ: number,
	modification: ChunkModification,
): void {
	const key = chunkKey(chunkX, chunkZ);
	const existing = deltaMap.get(key);
	if (existing) {
		existing.push(modification);
	} else {
		deltaMap.set(key, [modification]);
	}
}

/**
 * Return all modifications for a chunk.
 *
 * Returns an empty array for unmodified chunks (no map entry exists).
 */
export function getDelta(chunkX: number, chunkZ: number): ChunkModification[] {
	return deltaMap.get(chunkKey(chunkX, chunkZ)) ?? [];
}

/**
 * Serialize all chunk deltas for inclusion in a save file.
 *
 * Only chunks with modifications are included — unmodified chunks produce
 * zero bytes in the output.
 */
export function serializeDeltas(): SerializedChunkDeltas {
	const deltas: ChunkDelta[] = [];

	for (const [key, modifications] of deltaMap) {
		const [cx, cz] = key.split(",").map(Number);
		deltas.push({ chunkX: cx, chunkZ: cz, modifications });
	}

	return { version: 1, deltas };
}

/**
 * Restore chunk deltas from a save file, replacing the current in-memory state.
 *
 * **Backward compatibility**: if `data` is `null` or `undefined` (old saves that
 * predate chunk deltas), this is a no-op — the delta map stays empty, which is
 * correct because old fixed-grid saves have all structures stored directly in
 * the database rather than as deltas.
 */
export function deserializeDeltas(
	data: SerializedChunkDeltas | null | undefined,
): void {
	deltaMap.clear();

	if (!data || !data.deltas) {
		return;
	}

	for (const delta of data.deltas) {
		const key = chunkKey(delta.chunkX, delta.chunkZ);
		deltaMap.set(key, [...delta.modifications]);
	}
}

/**
 * Apply saved deltas to a procedurally regenerated chunk.
 *
 * Given the structures produced by the deterministic chunk generator, this
 * function replays the player's modifications:
 *   - `harvest` deltas remove structures by `districtStructureId`
 *   - `build` deltas append player-placed structures
 *   - `terrain` deltas patch cell properties (returned separately)
 *
 * The input array is not mutated; a new array of structures is returned along
 * with a list of terrain patches.
 */
export function applyDeltasToChunk(
	chunkX: number,
	chunkZ: number,
	generatedStructures: GeneratedSectorStructure[],
): {
	structures: GeneratedSectorStructure[];
	terrainPatches: Array<{
		q: number;
		r: number;
		field: string;
		value: string | number | boolean;
	}>;
} {
	const modifications = getDelta(chunkX, chunkZ);

	if (modifications.length === 0) {
		return { structures: [...generatedStructures], terrainPatches: [] };
	}

	// Collect harvested IDs and built structures in tick order
	const harvestedIds = new Set<string>();
	const builtStructures: GeneratedSectorStructure[] = [];
	const terrainPatches: Array<{
		q: number;
		r: number;
		field: string;
		value: string | number | boolean;
	}> = [];

	for (const mod of modifications) {
		switch (mod.kind) {
			case "harvest":
				harvestedIds.add(mod.structureId);
				break;
			case "build":
				builtStructures.push(mod.structure);
				break;
			case "terrain":
				terrainPatches.push({
					q: mod.q,
					r: mod.r,
					field: mod.field,
					value: mod.value,
				});
				break;
		}
	}

	// Filter out harvested structures, then append built ones
	const structures = generatedStructures
		.filter((s) => !harvestedIds.has(s.districtStructureId))
		.concat(builtStructures);

	return { structures, terrainPatches };
}

/**
 * Reset all in-memory delta state. Used for new game or test cleanup.
 */
export function _resetDeltas(): void {
	deltaMap.clear();
}
