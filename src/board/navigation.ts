/**
 * Yuka NavGraph built from chunk tile data.
 *
 * Each loaded chunk gets a local nav graph. Graphs from adjacent chunks
 * connect at border gate positions (same deterministic gates from chunks.ts).
 */

import { Edge, Graph, NavNode } from "yuka";
import type { Chunk } from "./chunks";
import { CHUNK_SIZE } from "./chunks";
import { TILE_SIZE_M, tileToYuka } from "./coords";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChunkNavGraph {
	chunkX: number;
	chunkZ: number;
	graph: Graph;
	/** Map from "worldTileX,worldTileZ" to graph node index. */
	nodeIndex: Map<string, number>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function tileKey(wx: number, wz: number): string {
	return `${wx},${wz}`;
}

// ─── Graph building ─────────────────────────────────────────────────────────

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

/**
 * Connect two adjacent chunk nav graphs at shared border gates.
 * Finds matching border tile keys and creates cross-edges.
 */
export function connectChunkGraphs(_a: ChunkNavGraph, _b: ChunkNavGraph): void {
	// TODO: merge into single world graph for cross-chunk pathfinding.
	// For now, per-chunk graphs work independently.
}
