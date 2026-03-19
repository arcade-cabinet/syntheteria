import { ChunkDiscovery } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	loadChunkDiscovery,
	resetChunkDiscovery,
	unloadChunk,
} from "../chunkDiscovery";

afterEach(() => {
	resetChunkDiscovery();
	for (const e of [...world.entities]) {
		if (e.isAlive()) e.destroy();
	}
});

describe("ChunkDiscovery Koota entities (T22)", () => {
	it("loadChunkDiscovery spawns a ChunkDiscovery entity", () => {
		loadChunkDiscovery(0, 0, "unexplored");
		const entities = Array.from(world.query(ChunkDiscovery));
		expect(entities).toHaveLength(1);
		const trait = entities[0].get(ChunkDiscovery)!;
		expect(trait.chunkX).toBe(0);
		expect(trait.chunkZ).toBe(0);
		expect(trait.discoveryLevel).toBe("unexplored");
	});

	it("loadChunkDiscovery updates existing entity rather than spawning a second", () => {
		loadChunkDiscovery(1, 2, "unexplored");
		loadChunkDiscovery(1, 2, "abstract");
		const entities = Array.from(world.query(ChunkDiscovery));
		expect(entities).toHaveLength(1);
		expect(entities[0].get(ChunkDiscovery)!.discoveryLevel).toBe("abstract");
	});

	it("loadChunkDiscovery handles multiple distinct chunks", () => {
		loadChunkDiscovery(0, 0, "abstract");
		loadChunkDiscovery(1, 0, "full");
		loadChunkDiscovery(0, 1, "unexplored");
		const entities = Array.from(world.query(ChunkDiscovery));
		expect(entities).toHaveLength(3);
	});

	it("unloadChunk destroys the entity", () => {
		loadChunkDiscovery(3, 4, "full");
		unloadChunk(3, 4);
		const entities = Array.from(world.query(ChunkDiscovery));
		expect(entities).toHaveLength(0);
	});

	it("unloadChunk on nonexistent chunk does not throw", () => {
		expect(() => unloadChunk(99, 99)).not.toThrow();
	});
});
