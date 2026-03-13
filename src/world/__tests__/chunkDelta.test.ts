import {
	_resetDeltas,
	applyDeltasToChunk,
	type ChunkModification,
	deserializeDeltas,
	getDelta,
	recordDelta,
	type SerializedChunkDeltas,
	serializeDeltas,
} from "../chunkDelta";
import type { GeneratedSectorStructure } from "../sectorStructurePlan";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStructure(
	overrides: Partial<GeneratedSectorStructure> = {},
): GeneratedSectorStructure {
	return {
		districtStructureId: "struct-001",
		anchorKey: "0,0",
		q: 0,
		r: 0,
		modelId: "model-a",
		placementLayer: "floor",
		edge: null,
		rotationQuarterTurns: 0,
		offsetX: 0,
		offsetY: 0,
		offsetZ: 0,
		targetSpan: 1,
		sectorArchetype: "industrial",
		source: "seeded_district",
		controllerFaction: null,
		...overrides,
	};
}

function harvestMod(structureId: string, tick = 1): ChunkModification {
	return { kind: "harvest", structureId, tick };
}

function buildMod(
	structure: GeneratedSectorStructure,
	tick = 1,
): ChunkModification {
	return { kind: "build", structure, tick };
}

function terrainMod(
	q: number,
	r: number,
	field: string,
	value: string | number | boolean,
	tick = 1,
): ChunkModification {
	return { kind: "terrain", q, r, field, value, tick };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetDeltas();
});

// ---------------------------------------------------------------------------
// recordDelta + getDelta basics
// ---------------------------------------------------------------------------

describe("recordDelta / getDelta", () => {
	it("returns an empty array for an unmodified chunk", () => {
		expect(getDelta(5, 5)).toEqual([]);
	});

	it("records and retrieves a single delta", () => {
		const mod = harvestMod("s-1");
		recordDelta(0, 0, mod);
		expect(getDelta(0, 0)).toEqual([mod]);
	});

	it("accumulates multiple deltas for the same chunk", () => {
		const m1 = harvestMod("s-1", 1);
		const m2 = buildMod(makeStructure(), 2);
		const m3 = terrainMod(3, 4, "passable", false, 3);

		recordDelta(1, 2, m1);
		recordDelta(1, 2, m2);
		recordDelta(1, 2, m3);

		const result = getDelta(1, 2);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual(m1);
		expect(result[1]).toEqual(m2);
		expect(result[2]).toEqual(m3);
	});

	it("keeps deltas separate between different chunks", () => {
		const m1 = harvestMod("a");
		const m2 = harvestMod("b");

		recordDelta(0, 0, m1);
		recordDelta(1, 1, m2);

		expect(getDelta(0, 0)).toEqual([m1]);
		expect(getDelta(1, 1)).toEqual([m2]);
	});

	it("handles negative chunk coordinates", () => {
		const mod = harvestMod("neg");
		recordDelta(-3, -7, mod);
		expect(getDelta(-3, -7)).toEqual([mod]);
	});
});

// ---------------------------------------------------------------------------
// Serialization round-trip
// ---------------------------------------------------------------------------

describe("serializeDeltas / deserializeDeltas", () => {
	it("round-trips an empty state", () => {
		const serialized = serializeDeltas();
		expect(serialized.version).toBe(1);
		expect(serialized.deltas).toHaveLength(0);

		deserializeDeltas(serialized);
		expect(getDelta(0, 0)).toEqual([]);
	});

	it("round-trips modifications across multiple chunks", () => {
		const m1 = harvestMod("s-1", 10);
		const m2 = buildMod(
			makeStructure({ districtStructureId: "player-wall-1" }),
			20,
		);
		const m3 = terrainMod(5, 6, "discoveryState", 2, 30);

		recordDelta(0, 0, m1);
		recordDelta(0, 0, m2);
		recordDelta(3, -1, m3);

		const serialized = serializeDeltas();
		expect(serialized.deltas).toHaveLength(2);

		// Clear and restore
		_resetDeltas();
		expect(getDelta(0, 0)).toEqual([]);

		deserializeDeltas(serialized);

		expect(getDelta(0, 0)).toHaveLength(2);
		expect(getDelta(0, 0)[0]).toEqual(m1);
		expect(getDelta(0, 0)[1]).toEqual(m2);
		expect(getDelta(3, -1)).toHaveLength(1);
		expect(getDelta(3, -1)[0]).toEqual(m3);
	});

	it("preserves structure data through serialization", () => {
		const structure = makeStructure({
			districtStructureId: "player-turret-7",
			q: 12,
			r: -4,
			modelId: "turret_mk2",
			rotationQuarterTurns: 3,
			source: "constructed",
			controllerFaction: "player",
		});
		const mod = buildMod(structure, 42);
		recordDelta(2, 2, mod);

		const serialized = serializeDeltas();
		_resetDeltas();
		deserializeDeltas(serialized);

		const restored = getDelta(2, 2);
		expect(restored).toHaveLength(1);
		const restoredMod = restored[0] as {
			kind: "build";
			structure: GeneratedSectorStructure;
		};
		expect(restoredMod.kind).toBe("build");
		expect(restoredMod.structure.districtStructureId).toBe("player-turret-7");
		expect(restoredMod.structure.rotationQuarterTurns).toBe(3);
		expect(restoredMod.structure.controllerFaction).toBe("player");
	});

	it("serialized JSON round-trips through JSON.parse/stringify", () => {
		recordDelta(0, 0, harvestMod("x", 1));
		recordDelta(0, 0, terrainMod(1, 1, "passable", true, 2));

		const serialized = serializeDeltas();
		const json = JSON.stringify(serialized);
		const parsed = JSON.parse(json) as SerializedChunkDeltas;

		_resetDeltas();
		deserializeDeltas(parsed);

		expect(getDelta(0, 0)).toHaveLength(2);
		expect(getDelta(0, 0)[0].kind).toBe("harvest");
		expect(getDelta(0, 0)[1].kind).toBe("terrain");
	});
});

// ---------------------------------------------------------------------------
// Unmodified chunk has zero storage cost
// ---------------------------------------------------------------------------

describe("zero storage cost for unmodified chunks", () => {
	it("serialization omits chunks with no modifications", () => {
		recordDelta(1, 1, harvestMod("a"));
		// chunk (2,2) is never touched

		const serialized = serializeDeltas();
		const chunkKeys = serialized.deltas.map((d) => `${d.chunkX},${d.chunkZ}`);
		expect(chunkKeys).toContain("1,1");
		expect(chunkKeys).not.toContain("2,2");
	});

	it("getDelta returns [] without creating a map entry", () => {
		// Access a chunk that was never written to
		const result = getDelta(99, 99);
		expect(result).toEqual([]);

		// Serialization should still be empty
		const serialized = serializeDeltas();
		expect(serialized.deltas).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Backward compatibility with old saves
// ---------------------------------------------------------------------------

describe("backward compatibility", () => {
	it("handles null data (old save without chunk deltas)", () => {
		// Pre-populate some state
		recordDelta(0, 0, harvestMod("old"));

		deserializeDeltas(null);

		// State should be cleared — old saves have structures in DB directly
		expect(getDelta(0, 0)).toEqual([]);
	});

	it("handles undefined data", () => {
		recordDelta(0, 0, harvestMod("old"));

		deserializeDeltas(undefined);

		expect(getDelta(0, 0)).toEqual([]);
	});

	it("handles data with empty deltas array", () => {
		recordDelta(0, 0, harvestMod("old"));

		deserializeDeltas({ version: 1, deltas: [] });

		expect(getDelta(0, 0)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// applyDeltasToChunk
// ---------------------------------------------------------------------------

describe("applyDeltasToChunk", () => {
	it("returns structures unchanged when no deltas exist", () => {
		const generated = [
			makeStructure({ districtStructureId: "a" }),
			makeStructure({ districtStructureId: "b" }),
		];

		const result = applyDeltasToChunk(0, 0, generated);

		expect(result.structures).toHaveLength(2);
		expect(result.structures.map((s) => s.districtStructureId)).toEqual([
			"a",
			"b",
		]);
		expect(result.terrainPatches).toHaveLength(0);
	});

	it("does not mutate the input array", () => {
		const generated = [makeStructure({ districtStructureId: "a" })];
		recordDelta(0, 0, harvestMod("a"));

		const result = applyDeltasToChunk(0, 0, generated);

		// Original untouched
		expect(generated).toHaveLength(1);
		// Result has the structure removed
		expect(result.structures).toHaveLength(0);
	});

	it("removes harvested structures", () => {
		const generated = [
			makeStructure({ districtStructureId: "keep" }),
			makeStructure({ districtStructureId: "remove-me" }),
			makeStructure({ districtStructureId: "also-keep" }),
		];

		recordDelta(5, 5, harvestMod("remove-me"));

		const result = applyDeltasToChunk(5, 5, generated);
		expect(result.structures.map((s) => s.districtStructureId)).toEqual([
			"keep",
			"also-keep",
		]);
	});

	it("appends built structures after generated ones", () => {
		const generated = [makeStructure({ districtStructureId: "original" })];
		const playerWall = makeStructure({
			districtStructureId: "player-wall-1",
			source: "constructed",
			controllerFaction: "player",
		});

		recordDelta(0, 0, buildMod(playerWall));

		const result = applyDeltasToChunk(0, 0, generated);
		expect(result.structures).toHaveLength(2);
		expect(result.structures[0].districtStructureId).toBe("original");
		expect(result.structures[1].districtStructureId).toBe("player-wall-1");
	});

	it("collects terrain patches", () => {
		recordDelta(1, 1, terrainMod(3, 4, "passable", false, 10));
		recordDelta(1, 1, terrainMod(3, 4, "discoveryState", 2, 11));

		const result = applyDeltasToChunk(1, 1, []);

		expect(result.terrainPatches).toHaveLength(2);
		expect(result.terrainPatches[0]).toEqual({
			q: 3,
			r: 4,
			field: "passable",
			value: false,
		});
		expect(result.terrainPatches[1]).toEqual({
			q: 3,
			r: 4,
			field: "discoveryState",
			value: 2,
		});
	});

	it("handles all three modification kinds together", () => {
		const generated = [
			makeStructure({ districtStructureId: "ore-node" }),
			makeStructure({ districtStructureId: "wall-segment" }),
		];

		const playerBuilding = makeStructure({
			districtStructureId: "player-refinery",
			source: "constructed",
		});

		recordDelta(2, 3, harvestMod("ore-node", 1));
		recordDelta(2, 3, buildMod(playerBuilding, 2));
		recordDelta(2, 3, terrainMod(0, 0, "floorPresetId", "scorched", 3));

		const result = applyDeltasToChunk(2, 3, generated);

		// ore-node removed, wall-segment kept, player-refinery added
		expect(result.structures.map((s) => s.districtStructureId)).toEqual([
			"wall-segment",
			"player-refinery",
		]);
		expect(result.terrainPatches).toHaveLength(1);
		expect(result.terrainPatches[0].field).toBe("floorPresetId");
		expect(result.terrainPatches[0].value).toBe("scorched");
	});
});

// ---------------------------------------------------------------------------
// _resetDeltas
// ---------------------------------------------------------------------------

describe("_resetDeltas", () => {
	it("clears all delta state", () => {
		recordDelta(0, 0, harvestMod("a"));
		recordDelta(1, 1, harvestMod("b"));

		_resetDeltas();

		expect(getDelta(0, 0)).toEqual([]);
		expect(getDelta(1, 1)).toEqual([]);
		expect(serializeDeltas().deltas).toHaveLength(0);
	});
});
