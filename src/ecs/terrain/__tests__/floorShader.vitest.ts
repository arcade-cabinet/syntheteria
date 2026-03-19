/**
 * Layer 2 (biome textures) — floorShader unit tests.
 *
 * Tests the ShaderMaterial factory: correct uniforms, fog values,
 * and curvature constant. The GLSL itself is tested visually in the
 * browser tests (tests/components/TerrainBiomes.browser.test.tsx).
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
	makeFloorShaderMaterial,
	updateFloorShaderChronometry,
} from "../floorShader";

describe("makeFloorShaderMaterial", () => {
	it("returns a THREE.ShaderMaterial", () => {
		const mat = makeFloorShaderMaterial("test-seed");
		expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
		mat.dispose();
	});

	it("has a uSeed uniform derived from the seed string", () => {
		const mat1 = makeFloorShaderMaterial("seed-A");
		const mat2 = makeFloorShaderMaterial("seed-B");
		expect(typeof mat1.uniforms.uSeed.value).toBe("number");
		// Different seeds → different float values
		expect(mat1.uniforms.uSeed.value).not.toBe(mat2.uniforms.uSeed.value);
		mat1.dispose();
		mat2.dispose();
	});

	it("same seed always produces same uSeed float", () => {
		const m1 = makeFloorShaderMaterial("deterministic");
		const m2 = makeFloorShaderMaterial("deterministic");
		expect(m1.uniforms.uSeed.value).toBe(m2.uniforms.uSeed.value);
		m1.dispose();
		m2.dispose();
	});

	it("uBoardCenter defaults to (0, 0)", () => {
		const mat = makeFloorShaderMaterial("seed");
		const center = mat.uniforms.uBoardCenter.value as THREE.Vector2;
		expect(center.x).toBe(0);
		expect(center.y).toBe(0);
		mat.dispose();
	});

	it("uBoardCenter reflects passed boardCenterX / boardCenterZ", () => {
		const mat = makeFloorShaderMaterial("seed", 16, 24);
		const center = mat.uniforms.uBoardCenter.value as THREE.Vector2;
		expect(center.x).toBe(16);
		expect(center.y).toBe(24);
		mat.dispose();
	});

	it("uCurve is a positive non-zero value (planet curvature enabled)", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.uniforms.uCurve.value).toBeGreaterThan(0);
		mat.dispose();
	});

	it("has fog: true so Three.js scene fog applies automatically", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.fog).toBe(true);
		mat.dispose();
	});

	it("uses FrontSide only (no backface wasted draw)", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.side).toBe(THREE.FrontSide);
		mat.dispose();
	});

	it("has both vertex and fragment shaders defined", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.vertexShader.length).toBeGreaterThan(50);
		expect(mat.fragmentShader.length).toBeGreaterThan(50);
		mat.dispose();
	});

	it("uSunDir uniform is a THREE.Vector3", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.uniforms.uSunDir.value).toBeInstanceOf(THREE.Vector3);
		mat.dispose();
	});

	it("uSunColor uniform is a THREE.Color", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.uniforms.uSunColor.value).toBeInstanceOf(THREE.Color);
		mat.dispose();
	});

	it("uSunDir is fixed at near-zenith (perpetual daylight — no day/night cycle)", () => {
		// Under the dome, lighting is fixed. dayAngle is ignored for board lighting.
		const m1 = makeFloorShaderMaterial("seed", 0, 0);
		const m2 = makeFloorShaderMaterial("seed", 0, 0);
		const dir1 = m1.uniforms.uSunDir.value as THREE.Vector3;
		const dir2 = m2.uniforms.uSunDir.value as THREE.Vector3;
		// Both should be the same fixed zenith direction
		expect(dir1.y).toBeGreaterThan(0.9); // near vertical
		expect(dir1.x).toBeCloseTo(dir2.x, 3);
		expect(dir1.y).toBeCloseTo(dir2.y, 3);
		expect(dir1.z).toBeCloseTo(dir2.z, 3);
		m1.dispose();
		m2.dispose();
	});

	it("updateFloorShaderChronometry is a no-op (perpetual daylight)", () => {
		const mat = makeFloorShaderMaterial("seed", 0, 0);
		const before = (mat.uniforms.uSunDir.value as THREE.Vector3).clone();
		updateFloorShaderChronometry(mat, Math.PI / 2, 0.5);
		const after = mat.uniforms.uSunDir.value as THREE.Vector3;
		// Should not have changed — lighting is fixed
		expect(after.x).toBeCloseTo(before.x, 5);
		expect(after.y).toBeCloseTo(before.y, 5);
		expect(after.z).toBeCloseTo(before.z, 5);
		mat.dispose();
	});

	it("fragment shader references uSunDir and uSunColor uniforms", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.fragmentShader).toContain("uSunDir");
		expect(mat.fragmentShader).toContain("uSunColor");
		mat.dispose();
	});

	it("vertex shader references 'elevation' attribute for height mapping", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.vertexShader).toContain("attribute float elevation");
		mat.dispose();
	});

	it("fragment shader uses floorIndex attribute for per-tile atlas sampling", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.fragmentShader).toContain("vFloorIndex");
		expect(mat.fragmentShader).toContain("atlasUV");
		mat.dispose();
	});

	it("fragment shader uses Three.js fog includes", () => {
		const mat = makeFloorShaderMaterial("seed");
		expect(mat.fragmentShader).toContain("fog_pars_fragment");
		expect(mat.fragmentShader).toContain("fog_fragment");
		mat.dispose();
	});
});
