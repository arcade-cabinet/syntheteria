import * as THREE from "three";

/**
 * Procedurally generates detail normal maps for adding surface wear, scratches,
 * panel lines, and rivet patterns to otherwise flat PBR surfaces.
 *
 * The composer works at the pixel level on an OffscreenCanvas, writing normal
 * vectors encoded in tangent space ([0,1] range → [-1,1] mapped). The resulting
 * texture can be applied as a `normalMap` or blended with an existing normal map
 * via Three.js normal map blending.
 */

export type DetailLayer =
	| "scratches"
	| "panel_lines"
	| "wear"
	| "rivets"
	| "grime";

export interface ComposerOptions {
	width?: number;
	height?: number;
	layers: DetailLayer[];
	seed?: number;
	intensity?: number;
}

const DEFAULT_SIZE = 256;
const DEFAULT_INTENSITY = 0.5;

/** Simple seeded PRNG (mulberry32) for reproducible detail maps. */
function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Draw horizontal and vertical panel lines that divide the surface into
 * rectangular panels, like welded metal sheets.
 */
function drawPanelLines(
	data: Uint8ClampedArray,
	w: number,
	h: number,
	rng: () => number,
	intensity: number,
): void {
	const lineWidth = Math.max(1, Math.round(w * 0.008));
	const panelCountH = 3 + Math.floor(rng() * 3);
	const panelCountV = 3 + Math.floor(rng() * 3);
	const depthByte = Math.round(128 - 60 * intensity);

	for (let i = 1; i < panelCountH; i++) {
		const y = Math.round((i / panelCountH) * h + (rng() - 0.5) * 4);
		for (let lw = 0; lw < lineWidth; lw++) {
			const row = y + lw;
			if (row < 0 || row >= h) continue;
			for (let x = 0; x < w; x++) {
				const idx = (row * w + x) * 4;
				data[idx + 1] = depthByte; // Green channel = Y normal
			}
		}
	}

	for (let i = 1; i < panelCountV; i++) {
		const x = Math.round((i / panelCountV) * w + (rng() - 0.5) * 4);
		for (let lw = 0; lw < lineWidth; lw++) {
			const col = x + lw;
			if (col < 0 || col >= w) continue;
			for (let y = 0; y < h; y++) {
				const idx = (y * w + col) * 4;
				data[idx] = depthByte; // Red channel = X normal
			}
		}
	}
}

/**
 * Draw random linear scratches across the surface.
 */
function drawScratches(
	data: Uint8ClampedArray,
	w: number,
	h: number,
	rng: () => number,
	intensity: number,
): void {
	const count = 8 + Math.floor(rng() * 12);
	const scratchDepth = Math.round(30 * intensity);

	for (let i = 0; i < count; i++) {
		let x = Math.floor(rng() * w);
		let y = Math.floor(rng() * h);
		const angle = rng() * Math.PI * 2;
		const dx = Math.cos(angle);
		const dy = Math.sin(angle);
		const length = 20 + Math.floor(rng() * (w * 0.4));

		for (let step = 0; step < length; step++) {
			const px = Math.round(x + dx * step);
			const py = Math.round(y + dy * step);
			if (px < 0 || px >= w || py < 0 || py >= h) break;
			const idx = (py * w + px) * 4;
			// Perturb normal along scratch direction
			data[idx] = Math.max(
				0,
				data[idx]! - Math.round(scratchDepth * Math.abs(dx)),
			);
			data[idx + 1] = Math.max(
				0,
				data[idx + 1]! - Math.round(scratchDepth * Math.abs(dy)),
			);
		}
	}
}

/**
 * Draw circular wear patches — simulates abrasion at high-contact areas.
 */
function drawWear(
	data: Uint8ClampedArray,
	w: number,
	h: number,
	rng: () => number,
	intensity: number,
): void {
	const patchCount = 3 + Math.floor(rng() * 5);
	const wearStrength = 20 * intensity;

	for (let i = 0; i < patchCount; i++) {
		const cx = Math.floor(rng() * w);
		const cy = Math.floor(rng() * h);
		const radius = 8 + Math.floor(rng() * (w * 0.15));

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > radius) continue;
				const px = cx + dx;
				const py = cy + dy;
				if (px < 0 || px >= w || py < 0 || py >= h) continue;

				const falloff = 1 - dist / radius;
				const perturbation = Math.round(
					wearStrength * falloff * (0.5 + rng() * 0.5),
				);
				const idx = (py * w + px) * 4;
				data[idx] = Math.max(0, data[idx]! - perturbation);
				data[idx + 1] = Math.max(0, data[idx + 1]! - perturbation);
			}
		}
	}
}

/**
 * Draw small circular rivet dots in a grid-ish pattern along panel edges.
 */
function drawRivets(
	data: Uint8ClampedArray,
	w: number,
	h: number,
	rng: () => number,
	intensity: number,
): void {
	const rivetRadius = Math.max(1, Math.round(w * 0.012));
	const spacing = Math.round(w * 0.08);
	const bumpStrength = Math.round(40 * intensity);

	for (let gy = spacing; gy < h; gy += spacing) {
		for (let gx = spacing; gx < w; gx += spacing) {
			// Jitter position slightly
			const cx = gx + Math.round((rng() - 0.5) * 4);
			const cy = gy + Math.round((rng() - 0.5) * 4);

			for (let dy = -rivetRadius; dy <= rivetRadius; dy++) {
				for (let dx = -rivetRadius; dx <= rivetRadius; dx++) {
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > rivetRadius) continue;
					const px = cx + dx;
					const py = cy + dy;
					if (px < 0 || px >= w || py < 0 || py >= h) continue;

					const bump = Math.round(bumpStrength * (1 - dist / rivetRadius));
					const idx = (py * w + px) * 4;
					// Push normal outward from rivet center
					const nx = dx === 0 ? 0 : dx / Math.abs(dx);
					const ny = dy === 0 ? 0 : dy / Math.abs(dy);
					data[idx] = clamp01((data[idx]! + bump * nx) / 255) * 255;
					data[idx + 1] = clamp01((data[idx + 1]! + bump * ny) / 255) * 255;
				}
			}
		}
	}
}

/**
 * Draw splotchy grime/dirt accumulation — darkens areas with random noise.
 */
function drawGrime(
	data: Uint8ClampedArray,
	w: number,
	h: number,
	rng: () => number,
	intensity: number,
): void {
	const patchCount = 4 + Math.floor(rng() * 6);
	const grimeStrength = 15 * intensity;

	for (let i = 0; i < patchCount; i++) {
		const cx = Math.floor(rng() * w);
		const cy = Math.floor(rng() * h);
		const radius = 12 + Math.floor(rng() * (w * 0.2));

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > radius) continue;
				const px = cx + dx;
				const py = cy + dy;
				if (px < 0 || px >= w || py < 0 || py >= h) continue;

				const falloff = 1 - dist / radius;
				const noise = rng() * grimeStrength * falloff;
				const idx = (py * w + px) * 4;
				data[idx] = Math.max(0, data[idx]! - Math.round(noise));
				data[idx + 1] = Math.max(0, data[idx + 1]! - Math.round(noise));
			}
		}
	}
}

const LAYER_RENDERERS: Record<
	DetailLayer,
	(
		data: Uint8ClampedArray,
		w: number,
		h: number,
		rng: () => number,
		intensity: number,
	) => void
> = {
	panel_lines: drawPanelLines,
	scratches: drawScratches,
	wear: drawWear,
	rivets: drawRivets,
	grime: drawGrime,
};

/**
 * Compose a detail normal map from the requested layers.
 * Returns raw RGBA pixel data suitable for creating a Three.js DataTexture.
 */
export function composeNormalMapData(options: ComposerOptions): {
	data: Uint8ClampedArray;
	width: number;
	height: number;
} {
	const w = options.width ?? DEFAULT_SIZE;
	const h = options.height ?? DEFAULT_SIZE;
	const intensity = options.intensity ?? DEFAULT_INTENSITY;
	const rng = mulberry32(options.seed ?? 42);

	// Initialize to flat normal (128, 128, 255, 255) = (0, 0, 1) in tangent space
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		data[i * 4] = 128; // R = normal X
		data[i * 4 + 1] = 128; // G = normal Y
		data[i * 4 + 2] = 255; // B = normal Z (pointing out)
		data[i * 4 + 3] = 255; // A = opaque
	}

	for (const layer of options.layers) {
		const renderer = LAYER_RENDERERS[layer];
		if (renderer) {
			renderer(data, w, h, rng, intensity);
		}
	}

	return { data, width: w, height: h };
}

/**
 * Create a Three.js DataTexture from composed normal map data.
 * The texture is configured for tiling and can be assigned directly to
 * `material.normalMap`.
 */
export function composeNormalMap(options: ComposerOptions): THREE.DataTexture {
	const { data, width, height } = composeNormalMapData(options);

	const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;

	return texture;
}

/** Pre-built detail presets for common surface types. */
export const DETAIL_PRESETS: Record<string, ComposerOptions> = {
	industrial_floor: {
		layers: ["panel_lines", "scratches", "wear"],
		intensity: 0.6,
		seed: 1,
	},
	machine_surface: {
		layers: ["panel_lines", "rivets", "scratches"],
		intensity: 0.5,
		seed: 2,
	},
	weathered_hull: {
		layers: ["scratches", "wear", "grime"],
		intensity: 0.7,
		seed: 3,
	},
	clean_panel: {
		layers: ["panel_lines", "rivets"],
		intensity: 0.3,
		seed: 4,
	},
	corridor_wear: {
		layers: ["scratches", "wear", "grime", "panel_lines"],
		intensity: 0.45,
		seed: 5,
	},
};
