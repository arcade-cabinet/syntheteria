/**
 * Yuka NavGraph built from chunk tile data.
 *
 * Individual chunks get local nav graphs via buildChunkNavGraph().
 * A unified WorldNavGraph merges all loaded chunks into a single Yuka Graph
 * with globally unique node indices, enabling cross-chunk pathfinding.
 */

import { Edge, Graph, NavNode } from "yuka";
import type { Chunk } from "./chunks";
import { CHUNK_SIZE, type ChunkKey, chunkKey } from "./chunks";
import { TILE_SIZE_M, tileToYuka } from "./coords";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ChunkNavGraph {
	chunkX: number;
	chunkZ: number;
	graph: Graph;
	/** Map from "worldTileX,worldTileZ" to graph node index (local to this chunk graph). */
	nodeIndex: Map<string, number>;
}

/**
 * Unified world nav graph that merges all loaded chunk graphs.
 * Node indices are globally unique across all chunks.
 */
export interface WorldNavGraph {
	graph: Graph;
	/** Map from "worldTileX,worldTileZ" to global graph node index. */
	nodeIndex: Map<string, number>;
	/** Track which chunks have been merged. */
	mergedChunks: Set<ChunkKey>;
}

// ─── Constants ──────────────────────────────────────────────────────────

const DIRS: [number, number][] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
	[-1, -1],
	[1, -1],
	[-1, 1],
	[1, 1],
];

const ELEVATION_COST = 1.5;

// ─── Helpers ────────────────────────────────────────────────────────────

function tileKey(wx: number, wz: number): string {
	return `${wx},${wz}`;
}

// ─── Per-chunk graph building ───────────────────────────────────────────

/**
 * Build a Yuka NavGraph from a chunk's passable tiles.
 *
 * Nodes at world-space center of each passable tile.
 * Edges connect adjacent passable tiles (8-directional).
 * Edge cost = distance * elevation penalty.
 */
export function buildChunkNavGraph(chunk: Chunk): ChunkNavGraph {
	const graph = new Graph();
	graph.digraph = true;
	const nodeIndex = new Map<string, number>();
	const { tiles } = chunk;

	// Pass 1: Create nodes
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < tiles[0]!.length; lx++) {
			const tile = tiles[lz]![lx]!;
			if (!tile.passable) continue;

			const pos = tileToYuka(tile);
			const node = new NavNode(graph.getNodeCount(), pos);
			const idx = graph.addNode(node);
			nodeIndex.set(tileKey(tile.x, tile.z), idx);
		}
	}

	// Pass 2: Create edges
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < tiles[0]!.length; lx++) {
			const tile = tiles[lz]![lx]!;
			if (!tile.passable) continue;

			const fromIdx = nodeIndex.get(tileKey(tile.x, tile.z));
			if (fromIdx === undefined) continue;

			for (const [dx, dz] of DIRS) {
				const nlx = lx + dx;
				const nlz = lz + dz;
				if (nlx < 0 || nlx >= CHUNK_SIZE || nlz < 0 || nlz >= CHUNK_SIZE)
					continue;

				const neighbor = tiles[nlz]![nlx]!;
				if (!neighbor.passable) continue;

				const toIdx = nodeIndex.get(tileKey(neighbor.x, neighbor.z));
				if (toIdx === undefined) continue;

				const isDiag = dx !== 0 && dz !== 0;
				const baseDist = isDiag ? TILE_SIZE_M * Math.SQRT2 : TILE_SIZE_M;
				const elevDelta = Math.abs(neighbor.elevation - tile.elevation);
				const cost = baseDist * (1 + elevDelta * ELEVATION_COST);

				graph.addEdge(new Edge(fromIdx, toIdx, cost));
			}
		}
	}

	return { chunkX: chunk.chunkX, chunkZ: chunk.chunkZ, graph, nodeIndex };
}

// ─── Unified world graph ────────────────────────────────────────────────

/**
 * Create an empty world nav graph.
 */
export function createWorldNavGraph(): WorldNavGraph {
	const graph = new Graph();
	graph.digraph = true;
	return {
		graph,
		nodeIndex: new Map(),
		mergedChunks: new Set(),
	};
}

/**
 * Merge a chunk's nav graph into the unified world graph.
 *
 * All nodes are re-indexed with globally unique IDs. Intra-chunk edges
 * are preserved. After merging, cross-chunk edges are created for any
 * previously-merged adjacent chunks that share border tiles.
 */
export function mergeChunkIntoWorld(
	worldNav: WorldNavGraph,
	chunkNav: ChunkNavGraph,
): void {
	const ck = chunkKey(chunkNav.chunkX, chunkNav.chunkZ);
	if (worldNav.mergedChunks.has(ck)) return; // already merged

	// Build a mapping from chunk-local node index to global node index
	const localToGlobal = new Map<number, number>();

	// Add all nodes from the chunk graph into the world graph
	for (const [key, localIdx] of chunkNav.nodeIndex) {
		// Skip if already in world graph (shouldn't happen, but be safe)
		if (worldNav.nodeIndex.has(key)) continue;

		const localNode = chunkNav.graph.getNode(localIdx) as NavNode;
		const globalIdx = worldNav.graph.getNodeCount();
		const globalNode = new NavNode(globalIdx, localNode.position.clone());
		worldNav.graph.addNode(globalNode);
		worldNav.nodeIndex.set(key, globalIdx);
		localToGlobal.set(localIdx, globalIdx);
	}

	// Re-create intra-chunk edges with global indices
	const edgeBuf: Edge[] = [];
	for (const [, localIdx] of chunkNav.nodeIndex) {
		const globalFrom = localToGlobal.get(localIdx);
		if (globalFrom === undefined) continue;

		// Gather outgoing edges from this node in the chunk graph
		chunkNav.graph.getEdgesOfNode(localIdx, edgeBuf);
		for (const edge of edgeBuf) {
			const globalTo = localToGlobal.get(edge.to);
			if (globalTo !== undefined) {
				worldNav.graph.addEdge(new Edge(globalFrom, globalTo, edge.cost));
			}
		}
	}

	worldNav.mergedChunks.add(ck);

	// Now connect to any adjacent chunks already in the world graph
	const adjacents: [number, number][] = [
		[chunkNav.chunkX, chunkNav.chunkZ - 1], // N
		[chunkNav.chunkX, chunkNav.chunkZ + 1], // S
		[chunkNav.chunkX + 1, chunkNav.chunkZ], // E
		[chunkNav.chunkX - 1, chunkNav.chunkZ], // W
	];

	for (const [adjCx, adjCz] of adjacents) {
		const adjKey = chunkKey(adjCx, adjCz);
		if (!worldNav.mergedChunks.has(adjKey)) continue;

		// Find the shared border and connect matching gate nodes
		connectBorderInWorld(
			worldNav,
			chunkNav.chunkX,
			chunkNav.chunkZ,
			adjCx,
			adjCz,
		);
	}
}

/**
 * Create cross-chunk edges in the world graph between two adjacent chunks.
 * Scans the shared border row/column for tile keys present in both chunks.
 */
function connectBorderInWorld(
	worldNav: WorldNavGraph,
	cxA: number,
	czA: number,
	cxB: number,
	czB: number,
): void {
	const dx = cxB - cxA;
	const dz = czB - czA;

	const pairs: Array<{ keyA: string; keyB: string }> = [];

	if (dx === 0 && dz === -1) {
		// B is north of A: A's row z=czA*CS, B's row z=(czB+1)*CS - 1
		const aZ = czA * CHUNK_SIZE;
		const bZ = czB * CHUNK_SIZE + (CHUNK_SIZE - 1);
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const wx = cxA * CHUNK_SIZE + lx;
			const kA = tileKey(wx, aZ);
			const kB = tileKey(wx, bZ);
			if (worldNav.nodeIndex.has(kA) && worldNav.nodeIndex.has(kB)) {
				pairs.push({ keyA: kA, keyB: kB });
			}
		}
	} else if (dx === 0 && dz === 1) {
		// B is south of A
		const aZ = czA * CHUNK_SIZE + (CHUNK_SIZE - 1);
		const bZ = czB * CHUNK_SIZE;
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const wx = cxA * CHUNK_SIZE + lx;
			const kA = tileKey(wx, aZ);
			const kB = tileKey(wx, bZ);
			if (worldNav.nodeIndex.has(kA) && worldNav.nodeIndex.has(kB)) {
				pairs.push({ keyA: kA, keyB: kB });
			}
		}
	} else if (dx === 1 && dz === 0) {
		// B is east of A
		const aX = cxA * CHUNK_SIZE + (CHUNK_SIZE - 1);
		const bX = cxB * CHUNK_SIZE;
		for (let lz = 0; lz < CHUNK_SIZE; lz++) {
			const wz = czA * CHUNK_SIZE + lz;
			const kA = tileKey(aX, wz);
			const kB = tileKey(bX, wz);
			if (worldNav.nodeIndex.has(kA) && worldNav.nodeIndex.has(kB)) {
				pairs.push({ keyA: kA, keyB: kB });
			}
		}
	} else if (dx === -1 && dz === 0) {
		// B is west of A
		const aX = cxA * CHUNK_SIZE;
		const bX = cxB * CHUNK_SIZE + (CHUNK_SIZE - 1);
		for (let lz = 0; lz < CHUNK_SIZE; lz++) {
			const wz = czA * CHUNK_SIZE + lz;
			const kA = tileKey(aX, wz);
			const kB = tileKey(bX, wz);
			if (worldNav.nodeIndex.has(kA) && worldNav.nodeIndex.has(kB)) {
				pairs.push({ keyA: kA, keyB: kB });
			}
		}
	}

	// Create bidirectional edges for each matched pair
	for (const { keyA, keyB } of pairs) {
		const idxA = worldNav.nodeIndex.get(keyA)!;
		const idxB = worldNav.nodeIndex.get(keyB)!;
		worldNav.graph.addEdge(new Edge(idxA, idxB, TILE_SIZE_M));
		worldNav.graph.addEdge(new Edge(idxB, idxA, TILE_SIZE_M));
	}
}

/**
 * Connect two adjacent chunk nav graphs at shared border gates.
 *
 * @deprecated Use WorldNavGraph + mergeChunkIntoWorld() for cross-chunk pathfinding.
 * This stub remains for backward compatibility but is a no-op when using WorldNavGraph.
 */
export function connectChunkGraphs(_a: ChunkNavGraph, _b: ChunkNavGraph): void {
	// Cross-chunk connections are handled by WorldNavGraph.mergeChunkIntoWorld().
	// Per-chunk graphs are independent; use the unified WorldNavGraph for
	// pathfinding that spans chunk boundaries.
}
