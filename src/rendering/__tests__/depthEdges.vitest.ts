/**
 * Edge classification tests for DepthMappedLayer.
 *
 * When adjacent cells have different depth values, the system must classify
 * the edge between them:
 *   - same depth → no edge geometry needed
 *   - depth diff of exactly 1 → ramp edge (gradual slope)
 *   - depth diff > 1 → wall edge (sheer cliff)
 *   - boundary of the grid → wall on boundary side
 *
 * Edge classification drives geometry generation: ramps get slope quads,
 * walls get vertical quads.
 */

import { describe, expect, it } from "vitest";
import {
	classifyEdges,
	createDepthMappedLayer,
	type EdgeType,
} from "../depthMappedLayer";

describe("edge classification", () => {
	it("two adjacent cells at same depth produce no edge", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		// All cells at depth 0 (default)
		const edges = classifyEdges(layer);

		// No internal edges — all cells at same depth
		const internalEdges = edges.filter((e) => e.type !== "boundary");
		expect(internalEdges.length).toBe(0);
	});

	it("depth diff of 1 between adjacent cells produces ramp edge", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -1);
		// cells: [0, -1, 0] along x-axis

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		// Two ramp edges: (0,0)↔(1,0) and (1,0)↔(2,0)
		expect(ramps.length).toBe(2);
	});

	it("depth diff > 1 between adjacent cells produces wall edge", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -2);
		// cells: [0, -2, 0] along x-axis

		const edges = classifyEdges(layer);
		const walls = edges.filter((e) => e.type === "wall");

		// Two wall edges: (0,0)↔(1,0) diff=2 and (1,0)↔(2,0) diff=2
		expect(walls.length).toBe(2);
	});

	it("edge classification works in North direction (-Z)", () => {
		const layer = createDepthMappedLayer(1, 3, 0);
		layer.setDepth(0, 1, -1);

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		// (0,0)↔(0,1) and (0,1)↔(0,2)
		const northEdge = ramps.find(
			(e) => e.x === 0 && e.z === 1 && e.direction === "north",
		);
		expect(northEdge).toBeDefined();
	});

	it("edge classification works in South direction (+Z)", () => {
		const layer = createDepthMappedLayer(1, 3, 0);
		layer.setDepth(0, 1, -1);

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		const southEdge = ramps.find(
			(e) => e.x === 0 && e.z === 1 && e.direction === "south",
		);
		expect(southEdge).toBeDefined();
	});

	it("edge classification works in East direction (+X)", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -1);

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		const eastEdge = ramps.find(
			(e) => e.x === 1 && e.z === 0 && e.direction === "east",
		);
		expect(eastEdge).toBeDefined();
	});

	it("edge classification works in West direction (-X)", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -1);

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		const westEdge = ramps.find(
			(e) => e.x === 1 && e.z === 0 && e.direction === "west",
		);
		expect(westEdge).toBeDefined();
	});

	it("boundary cells get wall edges on grid boundary side", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setDepth(0, 0, -1);
		// Corner cell at (0,0) with depth -1 has boundary on north and west

		const edges = classifyEdges(layer);
		const boundaries = edges.filter((e) => e.type === "boundary");

		// Cell (0,0) at depth -1 should have boundary walls on its exposed edges
		// The boundary walls appear where depth != 0 at the grid edge
		const cornerBoundaries = boundaries.filter((e) => e.x === 0 && e.z === 0);
		expect(cornerBoundaries.length).toBeGreaterThanOrEqual(2);
	});

	it("mixed gradual and sheer transitions classify correctly", () => {
		const layer = createDepthMappedLayer(4, 1, 0);
		layer.setDepth(1, 0, -1); // gradual from (0,0)
		layer.setDepth(2, 0, -3); // sheer from (1,0)
		// cells: [0, -1, -3, 0] along x-axis

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");
		const walls = edges.filter((e) => e.type === "wall");

		// (0,0)↔(1,0): diff=1 → ramp
		expect(
			ramps.some(
				(e) =>
					(e.x === 0 && e.direction === "east") ||
					(e.x === 1 && e.direction === "west"),
			),
		).toBe(true);

		// (1,0)↔(2,0): diff=2 → wall
		expect(
			walls.some(
				(e) =>
					(e.x === 1 && e.direction === "east") ||
					(e.x === 2 && e.direction === "west"),
			),
		).toBe(true);

		// (2,0)↔(3,0): diff=3 → wall
		expect(
			walls.some(
				(e) =>
					(e.x === 2 && e.direction === "east") ||
					(e.x === 3 && e.direction === "west"),
			),
		).toBe(true);
	});

	it("all-same-depth grid produces only boundary edges (if any depth != 0)", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		// All at depth 0 — no edges at all (boundaries only matter when depth != 0)
		const edges = classifyEdges(layer);

		// Flat depth-0 grid should produce zero edges of any kind
		expect(edges.length).toBe(0);
	});

	it("surrounded pit classifies all 4 edges correctly", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setDepth(1, 1, -1);

		const edges = classifyEdges(layer);
		const ramps = edges.filter(
			(e) => e.type === "ramp" && e.x === 1 && e.z === 1,
		);

		// Center cell at -1, all 4 neighbors at 0 → 4 ramp edges
		expect(ramps.length).toBe(4);
	});

	it("edge includes depth difference magnitude", () => {
		const layer = createDepthMappedLayer(2, 1, 0);
		layer.setDepth(1, 0, -3);

		const edges = classifyEdges(layer);
		const wallEdges = edges.filter((e) => e.type === "wall");

		// Should report the magnitude of the depth difference
		expect(wallEdges.length).toBeGreaterThan(0);
		const edge = wallEdges[0]!;
		expect(edge.depthDiff).toBe(3);
	});
});
