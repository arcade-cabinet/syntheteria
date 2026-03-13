import * as THREE from "three";
import {
	MATERIAL_DEFINITIONS,
	_getMaterialCacheSize,
	applyMaterialDefinition,
	clearMaterialCache,
	createMaterial,
	getCityFamilyMaterial,
	getMaterial,
} from "./MaterialFactory";

beforeEach(() => {
	clearMaterialCache();
});

describe("MaterialFactory", () => {
	describe("MATERIAL_DEFINITIONS", () => {
		it("provides at least 10 built-in definitions", () => {
			expect(Object.keys(MATERIAL_DEFINITIONS).length).toBeGreaterThanOrEqual(10);
		});

		it("every definition has required PBR fields", () => {
			for (const [id, def] of Object.entries(MATERIAL_DEFINITIONS)) {
				expect(def.id).toBe(id);
				expect(typeof def.label).toBe("string");
				expect(typeof def.color).toBe("number");
				expect(typeof def.roughness).toBe("number");
				expect(typeof def.metalness).toBe("number");
				expect(def.roughness).toBeGreaterThanOrEqual(0);
				expect(def.roughness).toBeLessThanOrEqual(1);
				expect(def.metalness).toBeGreaterThanOrEqual(0);
				expect(def.metalness).toBeLessThanOrEqual(1);
			}
		});

		it("includes building, city, and indicator categories", () => {
			expect(MATERIAL_DEFINITIONS.building_base).toBeDefined();
			expect(MATERIAL_DEFINITIONS.city_wall).toBeDefined();
			expect(MATERIAL_DEFINITIONS.indicator_powered).toBeDefined();
			expect(MATERIAL_DEFINITIONS.placement_ghost).toBeDefined();
		});
	});

	describe("createMaterial", () => {
		it("returns MeshStandardMaterial with correct PBR properties", () => {
			const mat = createMaterial(MATERIAL_DEFINITIONS.building_base!);
			expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
			expect(mat.roughness).toBe(0.82);
			expect(mat.metalness).toBe(0.14);
		});

		it("applies emissive properties when defined", () => {
			const mat = createMaterial(MATERIAL_DEFINITIONS.indicator_powered!);
			expect(mat.emissive.getHex()).toBe(0x00ff00);
			expect(mat.emissiveIntensity).toBe(0.8);
		});

		it("sets transparency for transparent definitions", () => {
			const mat = createMaterial(MATERIAL_DEFINITIONS.placement_ghost!);
			expect(mat.transparent).toBe(true);
			expect(mat.opacity).toBe(0.3);
		});

		it("sets double-sided rendering when specified", () => {
			const mat = createMaterial(MATERIAL_DEFINITIONS.building_base!);
			expect(mat.side).toBe(THREE.DoubleSide);
		});

		it("caches materials by id", () => {
			const a = createMaterial(MATERIAL_DEFINITIONS.building_base!);
			const b = createMaterial(MATERIAL_DEFINITIONS.building_base!);
			expect(a).toBe(b);
			expect(_getMaterialCacheSize()).toBe(1);
		});
	});

	describe("getMaterial", () => {
		it("returns material for known id", () => {
			const mat = getMaterial("fabrication_hull");
			expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
			expect(mat!.roughness).toBe(0.72);
		});

		it("returns null for unknown id", () => {
			expect(getMaterial("nonexistent_material")).toBeNull();
		});
	});

	describe("getCityFamilyMaterial", () => {
		it("returns definition for known city families", () => {
			const families = [
				"floor",
				"wall",
				"door",
				"roof",
				"prop",
				"detail",
				"column",
				"stair",
				"utility",
			];
			for (const family of families) {
				const def = getCityFamilyMaterial(family);
				expect(def).not.toBeNull();
				expect(def!.id).toBe(`city_${family}`);
			}
		});

		it("returns null for unknown family", () => {
			expect(getCityFamilyMaterial("nonexistent")).toBeNull();
		});
	});

	describe("applyMaterialDefinition", () => {
		it("blends color toward definition base", () => {
			const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
			applyMaterialDefinition(mat, MATERIAL_DEFINITIONS.building_base!);
			// Color should be somewhere between white and the definition color
			expect(mat.color.r).toBeLessThan(1);
		});

		it("clamps roughness to definition maximum", () => {
			const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
			applyMaterialDefinition(mat, MATERIAL_DEFINITIONS.building_base!);
			expect(mat.roughness).toBeLessThanOrEqual(0.82);
		});

		it("raises metalness to definition minimum", () => {
			const mat = new THREE.MeshStandardMaterial({ metalness: 0.02 });
			applyMaterialDefinition(mat, MATERIAL_DEFINITIONS.building_base!);
			expect(mat.metalness).toBeGreaterThanOrEqual(0.14);
		});

		it("respects custom blend factor", () => {
			const mat1 = new THREE.MeshStandardMaterial({ color: 0xffffff });
			const mat2 = new THREE.MeshStandardMaterial({ color: 0xffffff });
			applyMaterialDefinition(mat1, MATERIAL_DEFINITIONS.building_base!, 0.1);
			applyMaterialDefinition(mat2, MATERIAL_DEFINITIONS.building_base!, 0.9);
			// Higher blend factor should move color closer to definition
			expect(mat2.color.r).toBeLessThan(mat1.color.r);
		});
	});

	describe("clearMaterialCache", () => {
		it("empties the cache", () => {
			createMaterial(MATERIAL_DEFINITIONS.building_base!);
			createMaterial(MATERIAL_DEFINITIONS.city_wall!);
			expect(_getMaterialCacheSize()).toBe(2);
			clearMaterialCache();
			expect(_getMaterialCacheSize()).toBe(0);
		});
	});
});
