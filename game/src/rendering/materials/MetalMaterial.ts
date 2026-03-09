/**
 * Procedural rusted metal PBR material.
 *
 * Generates albedo, roughness, and normal textures on a Canvas at 256x256.
 * Three variants:
 *   - "clean"    — mostly silver-grey, minimal corrosion
 *   - "rusted"   — heavy orange-brown rust patches
 *   - "scorched" — dark charred surface with heat discoloration
 *
 * Materials are cached so they are created only once per variant.
 */

import * as THREE from "three";

const TEX_SIZE = 256;

// Material cache keyed by variant name
const cache = new Map<string, THREE.MeshStandardMaterial>();

// ---------------------------------------------------------------------------
// Noise helpers (simple sin/cos approximation of Perlin noise)
// ---------------------------------------------------------------------------

function pseudoNoise(x: number, y: number, seed: number): number {
	const a = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
	return a - Math.floor(a);
}

function smoothNoise(x: number, y: number, seed: number): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;

	const a = pseudoNoise(ix, iy, seed);
	const b = pseudoNoise(ix + 1, iy, seed);
	const c = pseudoNoise(ix, iy + 1, seed);
	const d = pseudoNoise(ix + 1, iy + 1, seed);

	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);

	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbmNoise(x: number, y: number, seed: number, octaves = 4): number {
	let value = 0;
	let amplitude = 0.5;
	let frequency = 1;
	for (let i = 0; i < octaves; i++) {
		value +=
			amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 17);
		amplitude *= 0.5;
		frequency *= 2;
	}
	return value;
}

// ---------------------------------------------------------------------------
// Texture generation
// ---------------------------------------------------------------------------

interface VariantColors {
	baseR: number;
	baseG: number;
	baseB: number;
	patchR: number;
	patchG: number;
	patchB: number;
	patchThreshold: number;
	roughnessClean: number;
	roughnessPatched: number;
}

const VARIANT_PARAMS: Record<string, VariantColors> = {
	clean: {
		baseR: 180,
		baseG: 185,
		baseB: 190,
		patchR: 160,
		patchG: 140,
		patchB: 120,
		patchThreshold: 0.75,
		roughnessClean: 0.3,
		roughnessPatched: 0.5,
	},
	rusted: {
		baseR: 160,
		baseG: 165,
		baseB: 170,
		patchR: 180,
		patchG: 100,
		patchB: 40,
		patchThreshold: 0.4,
		roughnessClean: 0.35,
		roughnessPatched: 0.9,
	},
	scorched: {
		baseR: 60,
		baseG: 55,
		baseB: 50,
		patchR: 90,
		patchG: 50,
		patchB: 30,
		patchThreshold: 0.45,
		roughnessClean: 0.5,
		roughnessPatched: 0.85,
	},
};

function generateAlbedoTexture(params: VariantColors): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;
	const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
	const data = imageData.data;

	for (let y = 0; y < TEX_SIZE; y++) {
		for (let x = 0; x < TEX_SIZE; x++) {
			const idx = (y * TEX_SIZE + x) * 4;
			const nx = (x / TEX_SIZE) * 8;
			const ny = (y / TEX_SIZE) * 8;

			const noise = fbmNoise(nx, ny, 42);
			const isPatched = noise > params.patchThreshold;

			// Add subtle variation
			const detail = pseudoNoise(x, y, 7) * 20 - 10;

			if (isPatched) {
				const blend =
					(noise - params.patchThreshold) / (1 - params.patchThreshold);
				data[idx] =
					params.baseR + (params.patchR - params.baseR) * blend + detail;
				data[idx + 1] =
					params.baseG + (params.patchG - params.baseG) * blend + detail * 0.5;
				data[idx + 2] =
					params.baseB + (params.patchB - params.baseB) * blend + detail * 0.3;
			} else {
				data[idx] = params.baseR + detail;
				data[idx + 1] = params.baseG + detail;
				data[idx + 2] = params.baseB + detail;
			}
			data[idx + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function generateRoughnessTexture(params: VariantColors): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;
	const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
	const data = imageData.data;

	for (let y = 0; y < TEX_SIZE; y++) {
		for (let x = 0; x < TEX_SIZE; x++) {
			const idx = (y * TEX_SIZE + x) * 4;
			const nx = (x / TEX_SIZE) * 8;
			const ny = (y / TEX_SIZE) * 8;

			const noise = fbmNoise(nx, ny, 42);
			const isPatched = noise > params.patchThreshold;
			const roughness = isPatched
				? params.roughnessPatched
				: params.roughnessClean;

			// Add fine grain
			const grain = pseudoNoise(x * 3, y * 3, 13) * 0.1;
			const value = Math.min(255, Math.max(0, (roughness + grain) * 255));
			data[idx] = value;
			data[idx + 1] = value;
			data[idx + 2] = value;
			data[idx + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function generateNormalTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;
	const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
	const data = imageData.data;

	// Base flat normal (128, 128, 255)
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 128;
		data[i + 1] = 128;
		data[i + 2] = 255;
		data[i + 3] = 255;
	}

	// Draw rivet pattern — rows of rivets every 32px
	const rivetSpacing = 32;
	const rivetRadius = 3;
	for (let ry = rivetSpacing; ry < TEX_SIZE; ry += rivetSpacing) {
		for (let rx = rivetSpacing; rx < TEX_SIZE; rx += rivetSpacing) {
			for (let dy = -rivetRadius; dy <= rivetRadius; dy++) {
				for (let dx = -rivetRadius; dx <= rivetRadius; dx++) {
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > rivetRadius) continue;

					const px = rx + dx;
					const py = ry + dy;
					if (px < 0 || px >= TEX_SIZE || py < 0 || py >= TEX_SIZE) continue;

					const idx = (py * TEX_SIZE + px) * 4;
					// Raised bump: normals point outward from center
					const nx = dx / rivetRadius;
					const ny = dy / rivetRadius;
					data[idx] = Math.floor(128 + nx * 80);
					data[idx + 1] = Math.floor(128 + ny * 80);
					data[idx + 2] = 200;
				}
			}
		}
	}

	// Draw horizontal seam lines every 64px
	for (let sy = 64; sy < TEX_SIZE; sy += 64) {
		for (let x = 0; x < TEX_SIZE; x++) {
			const idx = (sy * TEX_SIZE + x) * 4;
			data[idx + 1] = 100; // Slight downward normal
			data[idx + 2] = 230;
			if (sy + 1 < TEX_SIZE) {
				const idx2 = ((sy + 1) * TEX_SIZE + x) * 4;
				data[idx2 + 1] = 156; // Slight upward normal
				data[idx2 + 2] = 230;
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create (or retrieve cached) a procedural rusted metal PBR material.
 */
export function createMetalMaterial(
	variant: "clean" | "rusted" | "scorched" = "rusted",
): THREE.MeshStandardMaterial {
	const cached = cache.get(variant);
	if (cached) return cached;

	const params = VARIANT_PARAMS[variant];

	const material = new THREE.MeshStandardMaterial({
		map: generateAlbedoTexture(params),
		roughnessMap: generateRoughnessTexture(params),
		normalMap: generateNormalTexture(),
		metalness: 0.85,
		normalScale: new THREE.Vector2(0.6, 0.6),
	});

	cache.set(variant, material);
	return material;
}
