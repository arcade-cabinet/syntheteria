/**
 * Tests for fogShader — exported GLSL shader strings.
 *
 * No Three.js needed — pure string exports.
 */

import { fogVertexShader, fogFragmentShader } from "../fogShader";

describe("fogVertexShader", () => {
	it("is a non-empty string", () => {
		expect(typeof fogVertexShader).toBe("string");
		expect(fogVertexShader.length).toBeGreaterThan(0);
	});

	it("declares vUv varying", () => {
		expect(fogVertexShader).toContain("varying vec2 vUv");
	});

	it("sets gl_Position", () => {
		expect(fogVertexShader).toContain("gl_Position");
	});

	it("assigns vUv from uv attribute", () => {
		expect(fogVertexShader).toContain("vUv = uv");
	});

	it("contains a main function", () => {
		expect(fogVertexShader).toContain("void main()");
	});
});

describe("fogFragmentShader", () => {
	it("is a non-empty string", () => {
		expect(typeof fogFragmentShader).toBe("string");
		expect(fogFragmentShader.length).toBeGreaterThan(0);
	});

	it("declares fogTexture uniform", () => {
		expect(fogFragmentShader).toContain("uniform sampler2D fogTexture");
	});

	it("declares exploredDarkness uniform", () => {
		expect(fogFragmentShader).toContain("uniform float exploredDarkness");
	});

	it("declares edgeBlendSize uniform", () => {
		expect(fogFragmentShader).toContain("uniform float edgeBlendSize");
	});

	it("declares texelSize uniform", () => {
		expect(fogFragmentShader).toContain("uniform vec2 texelSize");
	});

	it("samples fogTexture", () => {
		expect(fogFragmentShader).toContain("texture2D(fogTexture");
	});

	it("sets gl_FragColor", () => {
		expect(fogFragmentShader).toContain("gl_FragColor");
	});

	it("contains a main function", () => {
		expect(fogFragmentShader).toContain("void main()");
	});

	it("blends between unexplored, explored, and visible states", () => {
		expect(fogFragmentShader).toContain("exploredDarkness");
		expect(fogFragmentShader).toContain("mix(");
	});

	it("discards fully transparent fragments", () => {
		expect(fogFragmentShader).toContain("discard");
	});
});
