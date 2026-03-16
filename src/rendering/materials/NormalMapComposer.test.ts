import * as THREE from "three";
import {
	composeNormalMap,
	composeNormalMapData,
	DETAIL_PRESETS,
} from "./NormalMapComposer";

describe("NormalMapComposer", () => {
	describe("composeNormalMapData", () => {
		it("returns pixel data with correct dimensions", () => {
			const result = composeNormalMapData({
				layers: ["panel_lines"],
				width: 64,
				height: 64,
			});
			expect(result.width).toBe(64);
			expect(result.height).toBe(64);
			expect(result.data.length).toBe(64 * 64 * 4);
		});

		it("uses default size when not specified", () => {
			const result = composeNormalMapData({ layers: ["scratches"] });
			expect(result.width).toBe(256);
			expect(result.height).toBe(256);
		});

		it("initializes flat normal base (128, 128, 255)", () => {
			const result = composeNormalMapData({ layers: [], width: 4, height: 4 });
			for (let i = 0; i < 4 * 4; i++) {
				expect(result.data[i * 4]).toBe(128); // R
				expect(result.data[i * 4 + 1]).toBe(128); // G
				expect(result.data[i * 4 + 2]).toBe(255); // B
				expect(result.data[i * 4 + 3]).toBe(255); // A
			}
		});

		it("panel_lines modify some pixels away from flat normal", () => {
			const flat = composeNormalMapData({
				layers: [],
				width: 64,
				height: 64,
				seed: 1,
			});
			const lined = composeNormalMapData({
				layers: ["panel_lines"],
				width: 64,
				height: 64,
				seed: 1,
			});
			let differences = 0;
			for (let i = 0; i < flat.data.length; i++) {
				if (flat.data[i] !== lined.data[i]) differences++;
			}
			expect(differences).toBeGreaterThan(0);
		});

		it("scratches modify pixels", () => {
			const result = composeNormalMapData({
				layers: ["scratches"],
				width: 64,
				height: 64,
				seed: 10,
				intensity: 0.8,
			});
			let nonFlat = 0;
			for (let i = 0; i < 64 * 64; i++) {
				if (result.data[i * 4] !== 128 || result.data[i * 4 + 1] !== 128) {
					nonFlat++;
				}
			}
			expect(nonFlat).toBeGreaterThan(0);
		});

		it("wear creates circular patches", () => {
			const result = composeNormalMapData({
				layers: ["wear"],
				width: 64,
				height: 64,
				seed: 20,
				intensity: 0.7,
			});
			let nonFlat = 0;
			for (let i = 0; i < 64 * 64; i++) {
				if (result.data[i * 4] !== 128 || result.data[i * 4 + 1] !== 128) {
					nonFlat++;
				}
			}
			expect(nonFlat).toBeGreaterThan(0);
		});

		it("rivets add bump perturbations", () => {
			const result = composeNormalMapData({
				layers: ["rivets"],
				width: 128,
				height: 128,
				seed: 30,
			});
			let nonFlat = 0;
			for (let i = 0; i < 128 * 128; i++) {
				if (result.data[i * 4] !== 128 || result.data[i * 4 + 1] !== 128) {
					nonFlat++;
				}
			}
			expect(nonFlat).toBeGreaterThan(0);
		});

		it("grime adds splotchy perturbations", () => {
			const result = composeNormalMapData({
				layers: ["grime"],
				width: 64,
				height: 64,
				seed: 40,
				intensity: 0.8,
			});
			let nonFlat = 0;
			for (let i = 0; i < 64 * 64; i++) {
				if (result.data[i * 4] !== 128 || result.data[i * 4 + 1] !== 128) {
					nonFlat++;
				}
			}
			expect(nonFlat).toBeGreaterThan(0);
		});

		it("same seed produces identical output", () => {
			const a = composeNormalMapData({
				layers: ["scratches", "panel_lines"],
				width: 32,
				height: 32,
				seed: 99,
			});
			const b = composeNormalMapData({
				layers: ["scratches", "panel_lines"],
				width: 32,
				height: 32,
				seed: 99,
			});
			expect(a.data).toEqual(b.data);
		});

		it("different seeds produce different output", () => {
			const a = composeNormalMapData({
				layers: ["scratches"],
				width: 32,
				height: 32,
				seed: 1,
			});
			const b = composeNormalMapData({
				layers: ["scratches"],
				width: 32,
				height: 32,
				seed: 999,
			});
			let same = true;
			for (let i = 0; i < a.data.length; i++) {
				if (a.data[i] !== b.data[i]) {
					same = false;
					break;
				}
			}
			expect(same).toBe(false);
		});

		it("multiple layers compose together", () => {
			const single = composeNormalMapData({
				layers: ["panel_lines"],
				width: 64,
				height: 64,
				seed: 1,
			});
			const multi = composeNormalMapData({
				layers: ["panel_lines", "scratches", "wear"],
				width: 64,
				height: 64,
				seed: 1,
			});
			let differences = 0;
			for (let i = 0; i < single.data.length; i++) {
				if (single.data[i] !== multi.data[i]) differences++;
			}
			expect(differences).toBeGreaterThan(0);
		});

		it("higher intensity produces stronger perturbations", () => {
			const low = composeNormalMapData({
				layers: ["scratches"],
				width: 64,
				height: 64,
				seed: 5,
				intensity: 0.1,
			});
			const high = composeNormalMapData({
				layers: ["scratches"],
				width: 64,
				height: 64,
				seed: 5,
				intensity: 0.9,
			});
			// Measure total deviation from flat (128)
			let lowDev = 0;
			let highDev = 0;
			for (let i = 0; i < 64 * 64; i++) {
				lowDev += Math.abs(low.data[i * 4]! - 128);
				highDev += Math.abs(high.data[i * 4]! - 128);
			}
			expect(highDev).toBeGreaterThan(lowDev);
		});
	});

	describe("composeNormalMap", () => {
		it("returns a THREE.DataTexture", () => {
			const tex = composeNormalMap({
				layers: ["panel_lines"],
				width: 32,
				height: 32,
			});
			expect(tex).toBeInstanceOf(THREE.DataTexture);
		});

		it("sets tiling wrapping mode", () => {
			const tex = composeNormalMap({
				layers: ["scratches"],
				width: 32,
				height: 32,
			});
			expect(tex.wrapS).toBe(THREE.RepeatWrapping);
			expect(tex.wrapT).toBe(THREE.RepeatWrapping);
		});

		it("generates mipmaps", () => {
			const tex = composeNormalMap({
				layers: ["wear"],
				width: 32,
				height: 32,
			});
			expect(tex.generateMipmaps).toBe(true);
		});
	});

	describe("DETAIL_PRESETS", () => {
		it("provides at least 4 named presets", () => {
			expect(Object.keys(DETAIL_PRESETS).length).toBeGreaterThanOrEqual(4);
		});

		it("every preset has non-empty layers", () => {
			for (const [_name, preset] of Object.entries(DETAIL_PRESETS)) {
				expect(preset.layers.length).toBeGreaterThan(0);
			}
		});

		it("industrial_floor includes panel_lines and scratches", () => {
			const preset = DETAIL_PRESETS.industrial_floor!;
			expect(preset.layers).toContain("panel_lines");
			expect(preset.layers).toContain("scratches");
		});

		it("each preset produces valid normal map data", () => {
			for (const preset of Object.values(DETAIL_PRESETS)) {
				const result = composeNormalMapData({
					...preset,
					width: 32,
					height: 32,
				});
				expect(result.data.length).toBe(32 * 32 * 4);
				// B channel should remain 255 (Z normal pointing out)
				for (let i = 0; i < 32 * 32; i++) {
					expect(result.data[i * 4 + 2]).toBe(255);
				}
			}
		});
	});
});
