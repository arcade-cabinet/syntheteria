/**
 * Normal map composer for runtime blending of base + detail + damage layers.
 *
 * Uses a WebGLRenderTarget and a custom ShaderMaterial to blend multiple
 * normal maps in tangent space. This enables runtime effects like:
 *   - Adding surface damage scratches on top of a base normal map
 *   - Blending weathering detail normals at variable intensity
 *   - Compositing high-frequency detail over low-frequency base normals
 *
 * Normal map blending follows the Reoriented Normal Mapping (RNM) technique
 * which correctly combines two normal maps in tangent space, avoiding the
 * artifacts of naive linear blending.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Composition shader — Reoriented Normal Mapping
// ---------------------------------------------------------------------------

const compositeVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const compositeFragmentShader = /* glsl */ `
uniform sampler2D baseNormal;
uniform sampler2D detailNormal;
uniform sampler2D damageNormal;

uniform float detailStrength;
uniform float damageStrength;

varying vec2 vUv;

// Decode a normal from a tangent-space normal map texture [0,1] -> [-1,1]
vec3 decodeNormal(vec4 texel) {
	return texel.rgb * 2.0 - 1.0;
}

// Encode a normal back to [0,1] for storage in a render target
vec3 encodeNormal(vec3 n) {
	return n * 0.5 + 0.5;
}

// Reoriented Normal Mapping blend — correctly combines two tangent-space
// normals without the flattening artifacts of linear or overlay blending.
// Reference: https://blog.selfshadow.com/publications/blending-in-detail/
vec3 rnmBlend(vec3 n1, vec3 n2) {
	vec3 t = n1 + vec3(0.0, 0.0, 1.0);
	vec3 u = n2 * vec3(-1.0, -1.0, 1.0);
	return normalize(t * dot(t, u) - u * t.z);
}

void main() {
	vec3 base = decodeNormal(texture2D(baseNormal, vUv));

	// Blend detail normal (lerp strength toward flat normal when strength < 1)
	vec3 detail = decodeNormal(texture2D(detailNormal, vUv));
	vec3 flatNormal = vec3(0.0, 0.0, 1.0);
	detail = mix(flatNormal, detail, detailStrength);

	vec3 result = rnmBlend(base, detail);

	// Blend damage normal on top if strength > 0
	if (damageStrength > 0.001) {
		vec3 damage = decodeNormal(texture2D(damageNormal, vUv));
		damage = mix(flatNormal, damage, damageStrength);
		result = rnmBlend(result, damage);
	}

	gl_FragColor = vec4(encodeNormal(result), 1.0);
}
`;

// ---------------------------------------------------------------------------
// Flat normal texture (128, 128, 255) — used as default when no map provided
// ---------------------------------------------------------------------------

let flatNormalTexture: THREE.Texture | null = null;

function getFlatNormalTexture(): THREE.Texture {
	if (flatNormalTexture) return flatNormalTexture;

	const size = 4;
	const data = new Uint8Array(size * size * 4);
	for (let i = 0; i < size * size; i++) {
		data[i * 4] = 128;
		data[i * 4 + 1] = 128;
		data[i * 4 + 2] = 255;
		data[i * 4 + 3] = 255;
	}

	flatNormalTexture = new THREE.DataTexture(data, size, size);
	flatNormalTexture.needsUpdate = true;
	flatNormalTexture.wrapS = THREE.RepeatWrapping;
	flatNormalTexture.wrapT = THREE.RepeatWrapping;
	return flatNormalTexture;
}

// ---------------------------------------------------------------------------
// Full-screen quad geometry (shared)
// ---------------------------------------------------------------------------

let fsQuad: THREE.Mesh | null = null;

function getFullscreenQuad(material: THREE.Material): THREE.Mesh {
	if (!fsQuad) {
		fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
		fsQuad.frustumCulled = false;
	} else {
		fsQuad.material = material;
	}
	return fsQuad;
}

// ---------------------------------------------------------------------------
// NormalMapComposer
// ---------------------------------------------------------------------------

export interface ComposerLayers {
	/** Base normal map texture (required) */
	base: THREE.Texture;
	/** Detail/micro-normal texture for surface grain (optional) */
	detail?: THREE.Texture;
	/** Damage/scratch normal texture (optional) */
	damage?: THREE.Texture;
}

export class NormalMapComposer {
	private renderTarget: THREE.WebGLRenderTarget;
	private compositeMaterial: THREE.ShaderMaterial;
	private scene: THREE.Scene;
	private camera: THREE.OrthographicCamera;

	/** Intensity of the detail normal layer (0 = none, 1 = full). */
	detailStrength = 0.5;

	/** Intensity of the damage normal layer (0 = none, 1 = full). */
	damageStrength = 0.0;

	/**
	 * @param resolution - Width and height of the composed normal map (default 256)
	 */
	constructor(resolution = 256) {
		this.renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		});

		const flat = getFlatNormalTexture();

		this.compositeMaterial = new THREE.ShaderMaterial({
			uniforms: {
				baseNormal: { value: flat },
				detailNormal: { value: flat },
				damageNormal: { value: flat },
				detailStrength: { value: this.detailStrength },
				damageStrength: { value: this.damageStrength },
			},
			vertexShader: compositeVertexShader,
			fragmentShader: compositeFragmentShader,
			depthTest: false,
			depthWrite: false,
		});

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		const quad = getFullscreenQuad(this.compositeMaterial);
		this.scene.add(quad);
	}

	/**
	 * Set the input normal map layers. Call this before compose().
	 */
	setLayers(layers: ComposerLayers): void {
		const flat = getFlatNormalTexture();
		this.compositeMaterial.uniforms.baseNormal.value = layers.base;
		this.compositeMaterial.uniforms.detailNormal.value = layers.detail ?? flat;
		this.compositeMaterial.uniforms.damageNormal.value = layers.damage ?? flat;
	}

	/**
	 * Render the composed normal map into the internal render target.
	 *
	 * @param renderer - The WebGL renderer to use for rendering
	 * @returns The render target's texture, ready to assign to a material's normalMap
	 */
	compose(renderer: THREE.WebGLRenderer): THREE.Texture {
		this.compositeMaterial.uniforms.detailStrength.value = this.detailStrength;
		this.compositeMaterial.uniforms.damageStrength.value = this.damageStrength;

		const currentRenderTarget = renderer.getRenderTarget();
		const currentAutoClear = renderer.autoClear;

		renderer.setRenderTarget(this.renderTarget);
		renderer.autoClear = true;
		renderer.render(this.scene, this.camera);

		renderer.setRenderTarget(currentRenderTarget);
		renderer.autoClear = currentAutoClear;

		return this.renderTarget.texture;
	}

	/**
	 * Get the output texture without re-rendering.
	 * Useful when you've already called compose() and just need the reference.
	 */
	getTexture(): THREE.Texture {
		return this.renderTarget.texture;
	}

	/**
	 * Dispose the render target, shader material, and scene resources.
	 */
	dispose(): void {
		this.renderTarget.dispose();
		this.compositeMaterial.dispose();

		// Remove the quad from the scene but don't dispose the shared geometry
		this.scene.clear();
	}
}
