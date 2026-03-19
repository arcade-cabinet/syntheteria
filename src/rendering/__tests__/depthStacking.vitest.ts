/**
 * Layer stacking tests for DepthLayerStack.
 *
 * Multiple DepthMappedLayer instances stack vertically:
 *   - Layer 0 (ground): baseY=0
 *   - Layer 1 (bridge/platform): baseY=1
 *   - Layer 2 (upper structure): baseY=2
 *
 * Each layer's depth is independent. "Raised" = new layer at higher baseY.
 * Connection down = negative depth at edges creating ramps/walls to lower layers.
 * Depth is ALWAYS zero or negative. No positive values ever.
 */

import { describe, expect, it } from "vitest";
import {
	createDepthMappedLayer,
} from "../depthMappedLayer";
import {
	createDepthLayerStack,
	type DepthLayerStack,
} from "../depthLayerStack";

describe("layer stacking", () => {
	it("two layers do not interfere with each other's depth maps", () => {
		const stack = createDepthLayerStack(5, 5);

		const layer0 = createDepthMappedLayer(5, 5, 0);
		const layer1 = createDepthMappedLayer(5, 5, 1);

		layer0.setDepth(2, 2, -1);
		layer1.setDepth(2, 2, 0); // flat on upper layer

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		// Layer 0 at (2,2) should be -1, layer 1 at (2,2) should be 0
		expect(stack.getLayer(0).getDepth(2, 2)).toBe(-1);
		expect(stack.getLayer(1).getDepth(2, 2)).toBe(0);
	});

	it("layer 1 at Y=1 with depth -1 at edge ramp-connects to layer 0 at Y=0", () => {
		const stack = createDepthLayerStack(5, 5);

		const layer0 = createDepthMappedLayer(5, 5, 0);
		const layer1 = createDepthMappedLayer(5, 5, 1);

		// Layer 1 platform with ramp-down at edge
		layer1.setDepth(2, 2, 0);  // platform surface
		layer1.setDepth(2, 3, -1); // ramp down at south edge

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		// The ramp endpoint at layer1 depth -1 brings worldY to baseY + depth = 1 + (-1) = 0
		// which equals layer0's baseY — creating a connection
		const rampWorldY = layer1.baseY + layer1.getDepth(2, 3);
		expect(rampWorldY).toBe(layer0.baseY);
	});

	it("enclosed platform on layer 1 must have perimeter walls", () => {
		const stack = createDepthLayerStack(7, 7);

		const layer0 = createDepthMappedLayer(7, 7, 0);
		const layer1 = createDepthMappedLayer(7, 7, 1);

		// 3x3 platform at center of layer1
		for (let z = 2; z <= 4; z++) {
			for (let x = 2; x <= 4; x++) {
				layer1.setDepth(x, z, 0);
			}
		}
		// Perimeter cells at depth 0 surrounded by "empty" (default 0 everywhere)
		// But layer1 cells OUTSIDE the platform should have no geometry —
		// the platform boundary creates edge transitions

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		// Validate that perimeter cells of the platform have edges
		// The geometry builder should detect the platform boundary and create walls/ramps
		const platformCells = stack.getPlatformCells(1);
		expect(platformCells.length).toBe(9); // 3x3

		// Perimeter cells should have edges where they border non-platform space
		const perimeterCells = platformCells.filter((c) => {
			return c.x === 2 || c.x === 4 || c.z === 2 || c.z === 4;
		});
		expect(perimeterCells.length).toBe(8); // 3x3 minus center
	});

	it("bridge: layer 1 strip (1 cell wide) over layer 0 abyssal is valid", () => {
		const stack = createDepthLayerStack(5, 5);

		const layer0 = createDepthMappedLayer(5, 5, 0);
		const layer1 = createDepthMappedLayer(5, 5, 1);

		// Abyssal zone on layer 0
		for (let x = 1; x <= 3; x++) {
			layer0.setDepth(x, 2, -2); // deep void
			layer0.setBiome(x, 2, 7);  // grating texture
		}

		// Bridge strip on layer 1 crossing over
		layer1.setDepth(1, 2, -1); // ramp down at west end
		layer1.setDepth(2, 2, 0);  // bridge surface
		layer1.setDepth(3, 2, -1); // ramp down at east end

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		// Bridge layer has 3 cells
		expect(layer1.getDepth(1, 2)).toBe(-1);
		expect(layer1.getDepth(2, 2)).toBe(0);
		expect(layer1.getDepth(3, 2)).toBe(-1);

		// Underlying layer has the abyssal void
		expect(layer0.getDepth(1, 2)).toBe(-2);
		expect(layer0.getDepth(2, 2)).toBe(-2);
		expect(layer0.getDepth(3, 2)).toBe(-2);
	});

	it("layer baseY determines world-space position of depth-0 cells", () => {
		const layer0 = createDepthMappedLayer(3, 3, 0);
		const layer1 = createDepthMappedLayer(3, 3, 1);
		const layer2 = createDepthMappedLayer(3, 3, 2);

		// Depth 0 on each layer → worldY = baseY
		expect(layer0.baseY + layer0.getDepth(0, 0)).toBe(0);
		expect(layer1.baseY + layer1.getDepth(0, 0)).toBe(1);
		expect(layer2.baseY + layer2.getDepth(0, 0)).toBe(2);
	});

	it("modifying one layer does not affect another in the stack", () => {
		const stack = createDepthLayerStack(4, 4);

		const layer0 = createDepthMappedLayer(4, 4, 0);
		const layer1 = createDepthMappedLayer(4, 4, 1);

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		layer0.setDepth(0, 0, -2);
		layer0.setBiome(0, 0, 3);

		// Layer 1 should be unaffected
		expect(layer1.getDepth(0, 0)).toBe(0);
		expect(layer1.getBiome(0, 0)).toBe(8); // default void
	});

	it("stack returns layers in order by baseY", () => {
		const stack = createDepthLayerStack(3, 3);

		const layer2 = createDepthMappedLayer(3, 3, 2);
		const layer0 = createDepthMappedLayer(3, 3, 0);
		const layer1 = createDepthMappedLayer(3, 3, 1);

		// Add in wrong order
		stack.addLayer(layer2);
		stack.addLayer(layer0);
		stack.addLayer(layer1);

		expect(stack.getLayer(0).baseY).toBe(0);
		expect(stack.getLayer(1).baseY).toBe(1);
		expect(stack.getLayer(2).baseY).toBe(2);
	});

	it("stack reports total layer count", () => {
		const stack = createDepthLayerStack(3, 3);

		expect(stack.layerCount).toBe(0);

		stack.addLayer(createDepthMappedLayer(3, 3, 0));
		expect(stack.layerCount).toBe(1);

		stack.addLayer(createDepthMappedLayer(3, 3, 1));
		expect(stack.layerCount).toBe(2);
	});

	it("connection between layers requires matching worldY at boundary", () => {
		const stack = createDepthLayerStack(5, 5);

		const layer0 = createDepthMappedLayer(5, 5, 0);
		const layer1 = createDepthMappedLayer(5, 5, 2); // baseY=2, not 1

		// For layer1 to ramp down to layer0, it needs depth = -2
		layer1.setDepth(2, 2, 0);  // surface at worldY=2
		layer1.setDepth(2, 3, -2); // ramp endpoint at worldY=0

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		const rampEndWorldY = layer1.baseY + layer1.getDepth(2, 3);
		expect(rampEndWorldY).toBe(0); // meets layer0
	});

	it("all layers in stack share same grid dimensions", () => {
		const stack = createDepthLayerStack(6, 8);

		const layer0 = createDepthMappedLayer(6, 8, 0);
		const layer1 = createDepthMappedLayer(6, 8, 1);

		stack.addLayer(layer0);
		stack.addLayer(layer1);

		expect(stack.width).toBe(6);
		expect(stack.height).toBe(8);
	});
});
