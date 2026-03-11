/**
 * Tests for HolographicShader — material creation and uniform update.
 *
 * Three.js is mocked to isolate shader logic from WebGL.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockTexture {
	dispose = jest.fn();
}

class MockShaderMaterial {
	uniforms: Record<string, { value: unknown }>;
	transparent: boolean;
	depthWrite: boolean;
	side: number;

	constructor(opts: {
		uniforms: Record<string, { value: unknown }>;
		vertexShader: string;
		fragmentShader: string;
		transparent: boolean;
		depthWrite: boolean;
		side: number;
	}) {
		this.uniforms = opts.uniforms;
		this.transparent = opts.transparent;
		this.depthWrite = opts.depthWrite;
		this.side = opts.side;
	}
}

jest.mock("three", () => ({
	Texture: MockTexture,
	ShaderMaterial: MockShaderMaterial,
	DoubleSide: 2,
}));

import {
	createHolographicMaterial,
	updateHolographicMaterial,
} from "../HolographicShader";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createHolographicMaterial", () => {
	it("returns a ShaderMaterial", () => {
		const mat = createHolographicMaterial();
		expect(mat).toBeInstanceOf(MockShaderMaterial);
	});

	it("is transparent and writes no depth", () => {
		const mat = createHolographicMaterial();
		expect(mat.transparent).toBe(true);
		expect(mat.depthWrite).toBe(false);
	});

	it("has all required uniforms", () => {
		const mat = createHolographicMaterial();
		expect(mat.uniforms.time).toBeDefined();
		expect(mat.uniforms.opacity).toBeDefined();
		expect(mat.uniforms.flickerSeed).toBeDefined();
		expect(mat.uniforms.baseTexture).toBeDefined();
	});

	it("initial time uniform is 0", () => {
		const mat = createHolographicMaterial();
		expect(mat.uniforms.time.value).toBe(0.0);
	});

	it("initial opacity uniform is 1", () => {
		const mat = createHolographicMaterial();
		expect(mat.uniforms.opacity.value).toBe(1.0);
	});

	it("initial flickerSeed is a number", () => {
		const mat = createHolographicMaterial();
		expect(typeof mat.uniforms.flickerSeed.value).toBe("number");
	});

	it("uses provided baseTexture", () => {
		const tex = new MockTexture();
		const mat = createHolographicMaterial(tex as never);
		expect(mat.uniforms.baseTexture.value).toBe(tex);
	});

	it("creates a default Texture when no baseTexture provided", () => {
		const mat = createHolographicMaterial();
		expect(mat.uniforms.baseTexture.value).toBeInstanceOf(MockTexture);
	});

	it("is DoubleSide", () => {
		const mat = createHolographicMaterial();
		expect(mat.side).toBe(2); // THREE.DoubleSide
	});
});

describe("updateHolographicMaterial", () => {
	it("updates time uniform", () => {
		const mat = createHolographicMaterial();
		updateHolographicMaterial(mat, 1.5, 0.8, 0.42);
		expect(mat.uniforms.time.value).toBe(1.5);
	});

	it("updates opacity uniform", () => {
		const mat = createHolographicMaterial();
		updateHolographicMaterial(mat, 0, 0.5, 0);
		expect(mat.uniforms.opacity.value).toBe(0.5);
	});

	it("updates flickerSeed uniform", () => {
		const mat = createHolographicMaterial();
		updateHolographicMaterial(mat, 0, 1, 0.77);
		expect(mat.uniforms.flickerSeed.value).toBe(0.77);
	});

	it("handles zero values", () => {
		const mat = createHolographicMaterial();
		updateHolographicMaterial(mat, 0, 0, 0);
		expect(mat.uniforms.time.value).toBe(0);
		expect(mat.uniforms.opacity.value).toBe(0);
		expect(mat.uniforms.flickerSeed.value).toBe(0);
	});

	it("can be called multiple times", () => {
		const mat = createHolographicMaterial();
		updateHolographicMaterial(mat, 1, 1, 1);
		updateHolographicMaterial(mat, 2, 0.5, 0.3);
		expect(mat.uniforms.time.value).toBe(2);
	});
});
