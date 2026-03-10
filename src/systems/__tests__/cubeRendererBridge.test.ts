/**
 * Unit tests for the cube renderer bridge system.
 *
 * Tests cover:
 * - Registration and unregistration of cubes
 * - Position and rotation updates
 * - Highlight toggling with emissive override
 * - PBR material property lookup (all 6 materials + fallback)
 * - Instanced batching by material type
 * - Pile label generation (grouping, thresholds, positioning)
 * - collectRenderData full aggregation
 * - getHighlightedCubes filtering
 * - getCubeRenderState returns copies
 * - reset clears all state
 * - Edge cases (empty state, unknown materials, duplicate IDs)
 */

import {
	collectRenderData,
	getCubeRenderState,
	getHighlightedCubes,
	getInstancedBatches,
	getMaterialRenderProps,
	getPileLabelData,
	registerCubeForRendering,
	reset,
	setCubeHighlight,
	unregisterCubeForRendering,
	updateCubeRenderPosition,
} from "../cubeRendererBridge";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// registerCubeForRendering
// ---------------------------------------------------------------------------

describe("registerCubeForRendering", () => {
	it("registers a cube and it becomes retrievable", () => {
		registerCubeForRendering("c1", { x: 1, y: 2, z: 3 }, "iron");

		const state = getCubeRenderState("c1");
		expect(state).toBeDefined();
		expect(state!.cubeId).toBe("c1");
		expect(state!.position).toEqual({ x: 1, y: 2, z: 3 });
		expect(state!.materialType).toBe("iron");
	});

	it("sets default rotation to zero, scale to 1, and highlighted to false", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "copper");

		const state = getCubeRenderState("c1");
		expect(state!.rotation).toEqual({ x: 0, y: 0, z: 0 });
		expect(state!.scale).toBe(1);
		expect(state!.highlighted).toBe(false);
	});

	it("assigns PBR render properties from the material table", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "copper");

		const state = getCubeRenderState("c1");
		expect(state!.renderProps.color).toBe("#B87333");
		expect(state!.renderProps.roughness).toBe(0.3);
		expect(state!.renderProps.metalness).toBe(0.8);
	});

	it("stores a copy of position, not a reference", () => {
		const pos = { x: 5, y: 10, z: 15 };
		registerCubeForRendering("c1", pos, "iron");

		pos.x = 999;

		const state = getCubeRenderState("c1");
		expect(state!.position.x).toBe(5);
	});

	it("overwrites existing cube when re-registered with same ID", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c1", { x: 10, y: 20, z: 30 }, "copper");

		const state = getCubeRenderState("c1");
		expect(state!.position).toEqual({ x: 10, y: 20, z: 30 });
		expect(state!.materialType).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// unregisterCubeForRendering
// ---------------------------------------------------------------------------

describe("unregisterCubeForRendering", () => {
	it("removes a registered cube", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		unregisterCubeForRendering("c1");

		expect(getCubeRenderState("c1")).toBeUndefined();
	});

	it("does nothing for a nonexistent cube ID", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		unregisterCubeForRendering("nonexistent");

		expect(getCubeRenderState("c1")).toBeDefined();
	});

	it("removes only the specified cube, leaving others intact", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 1, y: 0, z: 0 }, "copper");
		unregisterCubeForRendering("c1");

		expect(getCubeRenderState("c1")).toBeUndefined();
		expect(getCubeRenderState("c2")).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// updateCubeRenderPosition
// ---------------------------------------------------------------------------

describe("updateCubeRenderPosition", () => {
	it("updates position of a registered cube", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		updateCubeRenderPosition("c1", { x: 5, y: 10, z: 15 });

		const state = getCubeRenderState("c1");
		expect(state!.position).toEqual({ x: 5, y: 10, z: 15 });
	});

	it("updates both position and rotation when rotation is provided", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		updateCubeRenderPosition(
			"c1",
			{ x: 1, y: 2, z: 3 },
			{ x: 0.1, y: 0.2, z: 0.3 },
		);

		const state = getCubeRenderState("c1");
		expect(state!.position).toEqual({ x: 1, y: 2, z: 3 });
		expect(state!.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
	});

	it("preserves existing rotation when rotation is not provided", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		updateCubeRenderPosition(
			"c1",
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 2, z: 3 },
		);
		updateCubeRenderPosition("c1", { x: 5, y: 5, z: 5 });

		const state = getCubeRenderState("c1");
		expect(state!.rotation).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("does nothing for an unregistered cube ID", () => {
		updateCubeRenderPosition("nonexistent", { x: 5, y: 5, z: 5 });
		expect(getCubeRenderState("nonexistent")).toBeUndefined();
	});

	it("stores a copy of position, not a reference", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		const pos = { x: 10, y: 20, z: 30 };
		updateCubeRenderPosition("c1", pos);

		pos.x = 999;

		expect(getCubeRenderState("c1")!.position.x).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// setCubeHighlight
// ---------------------------------------------------------------------------

describe("setCubeHighlight", () => {
	it("sets a cube as highlighted", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);

		expect(getCubeRenderState("c1")!.highlighted).toBe(true);
	});

	it("clears highlight on a cube", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);
		setCubeHighlight("c1", false);

		expect(getCubeRenderState("c1")!.highlighted).toBe(false);
	});

	it("does nothing for an unregistered cube ID", () => {
		setCubeHighlight("nonexistent", true);
		expect(getCubeRenderState("nonexistent")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getMaterialRenderProps — PBR property lookup
// ---------------------------------------------------------------------------

describe("getMaterialRenderProps", () => {
	it("returns correct props for scrap_iron", () => {
		const props = getMaterialRenderProps("scrap_iron");
		expect(props.color).toBe("#8B7355");
		expect(props.roughness).toBe(0.8);
		expect(props.metalness).toBe(0.3);
		expect(props.emissive).toBe("#000000");
	});

	it("returns correct props for iron", () => {
		const props = getMaterialRenderProps("iron");
		expect(props.color).toBe("#A8A8A8");
		expect(props.roughness).toBe(0.4);
		expect(props.metalness).toBe(0.7);
	});

	it("returns correct props for copper", () => {
		const props = getMaterialRenderProps("copper");
		expect(props.color).toBe("#B87333");
		expect(props.roughness).toBe(0.3);
		expect(props.metalness).toBe(0.8);
	});

	it("returns correct props for e_waste", () => {
		const props = getMaterialRenderProps("e_waste");
		expect(props.color).toBe("#4A6741");
		expect(props.roughness).toBe(0.7);
		expect(props.metalness).toBe(0.2);
	});

	it("returns correct props for fiber_optics (has non-black emissive)", () => {
		const props = getMaterialRenderProps("fiber_optics");
		expect(props.color).toBe("#00BFFF");
		expect(props.roughness).toBe(0.2);
		expect(props.metalness).toBe(0.1);
		expect(props.emissive).toBe("#003344");
	});

	it("returns correct props for rare_alloy", () => {
		const props = getMaterialRenderProps("rare_alloy");
		expect(props.color).toBe("#FFD700");
		expect(props.roughness).toBe(0.1);
		expect(props.metalness).toBe(0.9);
	});

	it("returns fallback (scrap_iron) props for unknown material", () => {
		const props = getMaterialRenderProps("unobtainium");
		expect(props.color).toBe("#8B7355");
		expect(props.roughness).toBe(0.8);
		expect(props.metalness).toBe(0.3);
	});

	it("returns fallback props for empty string", () => {
		const props = getMaterialRenderProps("");
		expect(props.color).toBe("#8B7355");
	});
});

// ---------------------------------------------------------------------------
// getInstancedBatches — batching by material
// ---------------------------------------------------------------------------

describe("getInstancedBatches", () => {
	it("returns an empty map when no cubes are registered", () => {
		const batches = getInstancedBatches();
		expect(batches.size).toBe(0);
	});

	it("groups cubes by material type", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 1, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c3", { x: 2, y: 0, z: 0 }, "copper");

		const batches = getInstancedBatches();
		expect(batches.size).toBe(2);
		expect(batches.get("iron")).toHaveLength(2);
		expect(batches.get("copper")).toHaveLength(1);
	});

	it("includes correct PBR properties in each instance", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "rare_alloy");

		const batches = getInstancedBatches();
		const instance = batches.get("rare_alloy")![0];

		expect(instance.color).toBe("#FFD700");
		expect(instance.roughness).toBe(0.1);
		expect(instance.metalness).toBe(0.9);
		expect(instance.emissive).toBe("#000000");
	});

	it("applies highlight emissive override for highlighted cubes", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);

		const batches = getInstancedBatches();
		const instance = batches.get("iron")![0];

		expect(instance.emissive).toBe("#FFAA00");
	});

	it("does not apply highlight emissive for non-highlighted cubes", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");

		const batches = getInstancedBatches();
		const instance = batches.get("iron")![0];

		expect(instance.emissive).toBe("#000000");
	});

	it("preserves position and rotation in batch instances", () => {
		registerCubeForRendering("c1", { x: 3, y: 4, z: 5 }, "copper");
		updateCubeRenderPosition("c1", { x: 3, y: 4, z: 5 }, { x: 0.5, y: 1.0, z: 0 });

		const batches = getInstancedBatches();
		const instance = batches.get("copper")![0];

		expect(instance.position).toEqual({ x: 3, y: 4, z: 5 });
		expect(instance.rotation).toEqual({ x: 0.5, y: 1.0, z: 0 });
	});
});

// ---------------------------------------------------------------------------
// getPileLabelData
// ---------------------------------------------------------------------------

describe("getPileLabelData", () => {
	it("returns no labels when no cubes are registered", () => {
		expect(getPileLabelData()).toEqual([]);
	});

	it("returns no labels for a single cube (no pile)", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");

		expect(getPileLabelData()).toEqual([]);
	});

	it("returns a label when two cubes share the same integer XZ column", () => {
		registerCubeForRendering("c1", { x: 0.1, y: 0, z: 0.2 }, "iron");
		registerCubeForRendering("c2", { x: 0.3, y: 0.5, z: 0.4 }, "iron");

		const labels = getPileLabelData();
		expect(labels).toHaveLength(1);
		expect(labels[0].value).toBe(2);
		expect(labels[0].text).toBe("x2");
	});

	it("positions label above the highest cube in the column", () => {
		registerCubeForRendering("c1", { x: 0, y: 1, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 0, y: 5, z: 0 }, "iron");
		registerCubeForRendering("c3", { x: 0, y: 3, z: 0 }, "iron");

		const labels = getPileLabelData();
		expect(labels[0].position.y).toBe(5.75); // maxY + 0.75
	});

	it("computes average XZ for the label position", () => {
		registerCubeForRendering("c1", { x: 0.0, y: 0, z: 0.0 }, "iron");
		registerCubeForRendering("c2", { x: 0.4, y: 1, z: 0.6 }, "iron");

		const labels = getPileLabelData();
		expect(labels[0].position.x).toBeCloseTo(0.2);
		expect(labels[0].position.z).toBeCloseTo(0.3);
	});

	it("generates separate labels for cubes in different XZ columns", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 0, y: 1, z: 0 }, "iron");
		registerCubeForRendering("c3", { x: 10, y: 0, z: 10 }, "copper");
		registerCubeForRendering("c4", { x: 10, y: 1, z: 10 }, "copper");

		const labels = getPileLabelData();
		expect(labels).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// getHighlightedCubes
// ---------------------------------------------------------------------------

describe("getHighlightedCubes", () => {
	it("returns empty array when no cubes are highlighted", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");

		expect(getHighlightedCubes()).toEqual([]);
	});

	it("returns only highlighted cubes", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 1, y: 0, z: 0 }, "copper");
		registerCubeForRendering("c3", { x: 2, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);
		setCubeHighlight("c3", true);

		const highlighted = getHighlightedCubes();
		expect(highlighted).toHaveLength(2);
		expect(highlighted.map((c) => c.cubeId).sort()).toEqual(["c1", "c3"]);
	});

	it("returns copies, not references to internal state", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);

		const highlighted = getHighlightedCubes();
		highlighted[0].position.x = 999;

		const fresh = getCubeRenderState("c1");
		expect(fresh!.position.x).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getCubeRenderState
// ---------------------------------------------------------------------------

describe("getCubeRenderState", () => {
	it("returns undefined for an unregistered cube", () => {
		expect(getCubeRenderState("nonexistent")).toBeUndefined();
	});

	it("returns a copy that does not affect internal state when mutated", () => {
		registerCubeForRendering("c1", { x: 5, y: 10, z: 15 }, "iron");

		const state = getCubeRenderState("c1")!;
		state.position.x = 999;
		state.renderProps.color = "#FFFFFF";

		const fresh = getCubeRenderState("c1")!;
		expect(fresh.position.x).toBe(5);
		expect(fresh.renderProps.color).toBe("#A8A8A8");
	});
});

// ---------------------------------------------------------------------------
// collectRenderData
// ---------------------------------------------------------------------------

describe("collectRenderData", () => {
	it("returns empty instances and pileLabels when no cubes registered", () => {
		const batch = collectRenderData();
		expect(batch.instances).toEqual([]);
		expect(batch.pileLabels).toEqual([]);
	});

	it("includes all registered cubes as instances", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 1, y: 0, z: 0 }, "copper");
		registerCubeForRendering("c3", { x: 2, y: 0, z: 0 }, "rare_alloy");

		const batch = collectRenderData();
		expect(batch.instances).toHaveLength(3);
	});

	it("applies highlight emissive in collected instances", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);

		const batch = collectRenderData();
		const instance = batch.instances.find((i) => i.cubeId === "c1");
		expect(instance!.emissive).toBe("#FFAA00");
	});

	it("includes pile labels in the batch", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 0, y: 0.5, z: 0 }, "iron");

		const batch = collectRenderData();
		expect(batch.pileLabels).toHaveLength(1);
		expect(batch.pileLabels[0].value).toBe(2);
	});

	it("instance cubeId matches registered cubeId", () => {
		registerCubeForRendering("cube_42", { x: 3, y: 0, z: 7 }, "e_waste");

		const batch = collectRenderData();
		expect(batch.instances[0].cubeId).toBe("cube_42");
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all registered cubes", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 1, y: 0, z: 0 }, "copper");
		reset();

		expect(getCubeRenderState("c1")).toBeUndefined();
		expect(getCubeRenderState("c2")).toBeUndefined();
	});

	it("clears instanced batches", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		reset();

		expect(getInstancedBatches().size).toBe(0);
	});

	it("clears pile labels", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		registerCubeForRendering("c2", { x: 0, y: 1, z: 0 }, "iron");
		reset();

		expect(getPileLabelData()).toEqual([]);
	});

	it("clears highlighted cubes", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		setCubeHighlight("c1", true);
		reset();

		expect(getHighlightedCubes()).toEqual([]);
	});

	it("allows fresh registration after reset", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "iron");
		reset();

		registerCubeForRendering("c2", { x: 5, y: 5, z: 5 }, "copper");
		const state = getCubeRenderState("c2");
		expect(state).toBeDefined();
		expect(state!.materialType).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles registering and unregistering the same cube repeatedly", () => {
		for (let i = 0; i < 5; i++) {
			registerCubeForRendering("c1", { x: i, y: 0, z: 0 }, "iron");
			unregisterCubeForRendering("c1");
		}

		expect(getCubeRenderState("c1")).toBeUndefined();
		expect(getInstancedBatches().size).toBe(0);
	});

	it("fiber_optics base emissive is preserved when not highlighted", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "fiber_optics");

		const batches = getInstancedBatches();
		const instance = batches.get("fiber_optics")![0];
		expect(instance.emissive).toBe("#003344");
	});

	it("fiber_optics emissive switches to highlight color when highlighted", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "fiber_optics");
		setCubeHighlight("c1", true);

		const batches = getInstancedBatches();
		const instance = batches.get("fiber_optics")![0];
		expect(instance.emissive).toBe("#FFAA00");
	});

	it("fiber_optics emissive reverts when highlight is cleared", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "fiber_optics");
		setCubeHighlight("c1", true);
		setCubeHighlight("c1", false);

		const batches = getInstancedBatches();
		const instance = batches.get("fiber_optics")![0];
		expect(instance.emissive).toBe("#003344");
	});

	it("handles large numbers of cubes without error", () => {
		for (let i = 0; i < 100; i++) {
			registerCubeForRendering(
				`c${i}`,
				{ x: i * 0.5, y: 0, z: 0 },
				i % 2 === 0 ? "iron" : "copper",
			);
		}

		const batches = getInstancedBatches();
		expect(batches.get("iron")).toHaveLength(50);
		expect(batches.get("copper")).toHaveLength(50);

		const batch = collectRenderData();
		expect(batch.instances).toHaveLength(100);
	});

	it("unknown material gets fallback PBR in registered state", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "mystery_ore");

		const state = getCubeRenderState("c1");
		expect(state!.renderProps.color).toBe("#8B7355");
		expect(state!.renderProps.roughness).toBe(0.8);
		expect(state!.renderProps.metalness).toBe(0.3);
	});

	it("unknown material cubes are batched under their own key", () => {
		registerCubeForRendering("c1", { x: 0, y: 0, z: 0 }, "mystery_ore");

		const batches = getInstancedBatches();
		expect(batches.has("mystery_ore")).toBe(true);
		expect(batches.get("mystery_ore")).toHaveLength(1);
	});
});
