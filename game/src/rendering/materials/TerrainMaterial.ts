/**
 * Procedural terrain PBR materials for different machine-planet zones.
 *
 * Variants:
 *   - "foundry"   — corroded metal plating, dark grey with orange rust
 *   - "slag"      — rough volcanic texture, dark brown with heat-glow cracks
 *   - "cable"     — dense linear cable cross-section patterns, copper/black
 *   - "processor" — flat circuit-like patterns, green-black substrate
 *
 * Each generates a MeshStandardMaterial with appropriate albedo, roughness,
 * and emissive maps. Materials are cached per zone.
 */

import * as THREE from "three";

const TEX_SIZE = 256;

const cache = new Map<string, THREE.MeshStandardMaterial>();

// ---------------------------------------------------------------------------
// Noise helpers
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
// Foundry zone — corroded metal plating
// ---------------------------------------------------------------------------

function generateFoundryMaterial(): THREE.MeshStandardMaterial {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;
	const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
	const data = imageData.data;

	for (let y = 0; y < TEX_SIZE; y++) {
		for (let x = 0; x < TEX_SIZE; x++) {
			const idx = (y * TEX_SIZE + x) * 4;
			const nx = (x / TEX_SIZE) * 6;
			const ny = (y / TEX_SIZE) * 6;

			const noise = fbmNoise(nx, ny, 33);
			const rust = noise > 0.45;

			// Plate seam grid every ~64px
			const onSeamX = x % 64 < 2;
			const onSeamY = y % 64 < 2;
			const onSeam = onSeamX || onSeamY;

			if (onSeam) {
				data[idx] = 30;
				data[idx + 1] = 30;
				data[idx + 2] = 30;
			} else if (rust) {
				const blend = (noise - 0.45) / 0.55;
				data[idx] = 80 + blend * 100;
				data[idx + 1] = 60 + blend * 30;
				data[idx + 2] = 30;
			} else {
				const grain = pseudoNoise(x, y, 5) * 15;
				data[idx] = 70 + grain;
				data[idx + 1] = 72 + grain;
				data[idx + 2] = 75 + grain;
			}
			data[idx + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	const albedo = new THREE.CanvasTexture(canvas);
	albedo.wrapS = THREE.RepeatWrapping;
	albedo.wrapT = THREE.RepeatWrapping;

	return new THREE.MeshStandardMaterial({
		map: albedo,
		roughness: 0.75,
		metalness: 0.6,
	});
}

// ---------------------------------------------------------------------------
// Slag zone — volcanic with heat-glow cracks
// ---------------------------------------------------------------------------

function generateSlagMaterial(): THREE.MeshStandardMaterial {
	// Albedo
	const albedoCanvas = document.createElement("canvas");
	albedoCanvas.width = TEX_SIZE;
	albedoCanvas.height = TEX_SIZE;
	const albedoCtx = albedoCanvas.getContext("2d")!;
	const albedoImageData = albedoCtx.createImageData(TEX_SIZE, TEX_SIZE);
	const albedoData = albedoImageData.data;

	// Emissive (heat-glow cracks)
	const emCanvas = document.createElement("canvas");
	emCanvas.width = TEX_SIZE;
	emCanvas.height = TEX_SIZE;
	const emCtx = emCanvas.getContext("2d")!;
	const emImageData = emCtx.createImageData(TEX_SIZE, TEX_SIZE);
	const emData = emImageData.data;

	for (let y = 0; y < TEX_SIZE; y++) {
		for (let x = 0; x < TEX_SIZE; x++) {
			const idx = (y * TEX_SIZE + x) * 4;
			const nx = (x / TEX_SIZE) * 10;
			const ny = (y / TEX_SIZE) * 10;

			const noise = fbmNoise(nx, ny, 77);
			const crackNoise = fbmNoise(nx * 2, ny * 2, 88, 3);

			// Crack threshold — thin bright lines
			const isCrack = crackNoise > 0.58 && crackNoise < 0.62;

			// Dark brown base with roughness variation
			const grain = pseudoNoise(x, y, 11) * 12;
			albedoData[idx] = 55 + noise * 25 + grain;
			albedoData[idx + 1] = 35 + noise * 15 + grain * 0.5;
			albedoData[idx + 2] = 20 + noise * 10;
			albedoData[idx + 3] = 255;

			// Emissive: orange-red glow in cracks
			if (isCrack) {
				emData[idx] = 255;
				emData[idx + 1] = 100;
				emData[idx + 2] = 20;
			} else {
				emData[idx] = 0;
				emData[idx + 1] = 0;
				emData[idx + 2] = 0;
			}
			emData[idx + 3] = 255;
		}
	}

	albedoCtx.putImageData(albedoImageData, 0, 0);
	emCtx.putImageData(emImageData, 0, 0);

	const albedoTex = new THREE.CanvasTexture(albedoCanvas);
	albedoTex.wrapS = THREE.RepeatWrapping;
	albedoTex.wrapT = THREE.RepeatWrapping;

	const emTex = new THREE.CanvasTexture(emCanvas);
	emTex.wrapS = THREE.RepeatWrapping;
	emTex.wrapT = THREE.RepeatWrapping;

	return new THREE.MeshStandardMaterial({
		map: albedoTex,
		emissiveMap: emTex,
		emissive: new THREE.Color(0xff6414),
		emissiveIntensity: 0.6,
		roughness: 0.95,
		metalness: 0.1,
	});
}

// ---------------------------------------------------------------------------
// Cable zone — dense linear cable cross-sections
// ---------------------------------------------------------------------------

function generateCableMaterial(): THREE.MeshStandardMaterial {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;

	// Black base
	ctx.fillStyle = "#111111";
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	// Draw dense horizontal and vertical cable runs
	const cableColors = [
		"#cc7733",
		"#aa5522",
		"#dd8844",
		"#bb6633",
		"#222222",
		"#333333",
	];
	const cableWidth = 4;
	const gap = 2;
	const stride = cableWidth + gap;

	// Horizontal cables (main layer)
	for (let y = 0; y < TEX_SIZE; y += stride) {
		const colorIdx = Math.floor(pseudoNoise(0, y, 99) * cableColors.length);
		ctx.fillStyle = cableColors[colorIdx];
		ctx.fillRect(0, y, TEX_SIZE, cableWidth);

		// Cable highlight (top edge)
		ctx.fillStyle = "#eebb66";
		ctx.fillRect(0, y, TEX_SIZE, 1);
	}

	// Vertical cable bundles in some areas
	for (let i = 0; i < 6; i++) {
		const bx = Math.floor(pseudoNoise(i, 0, 55) * (TEX_SIZE - 30));
		const bw = 10 + Math.floor(pseudoNoise(i, 1, 55) * 20);

		for (let x = bx; x < bx + bw; x += stride) {
			const colorIdx = Math.floor(pseudoNoise(x, 0, 77) * cableColors.length);
			ctx.fillStyle = cableColors[colorIdx];
			ctx.fillRect(x, 0, cableWidth, TEX_SIZE);
		}
	}

	// Cable cross-section circles (cut ends)
	for (let i = 0; i < 15; i++) {
		const cx = Math.floor(pseudoNoise(i, 0, 123) * TEX_SIZE);
		const cy = Math.floor(pseudoNoise(i, 1, 123) * TEX_SIZE);
		const r = 3 + Math.floor(pseudoNoise(i, 2, 123) * 4);

		// Insulation
		ctx.fillStyle = "#333333";
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Copper core
		ctx.fillStyle = "#cc8844";
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
		ctx.fill();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;

	return new THREE.MeshStandardMaterial({
		map: tex,
		roughness: 0.6,
		metalness: 0.4,
	});
}

// ---------------------------------------------------------------------------
// Processor zone — circuit-like substrate
// ---------------------------------------------------------------------------

function generateProcessorMaterial(): THREE.MeshStandardMaterial {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;

	// Green-black substrate
	ctx.fillStyle = "#0a1a0a";
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	// Grid lines (faint green)
	ctx.strokeStyle = "#1a3a1a";
	ctx.lineWidth = 1;
	const gridSpacing = 16;
	for (let x = 0; x < TEX_SIZE; x += gridSpacing) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, TEX_SIZE);
		ctx.stroke();
	}
	for (let y = 0; y < TEX_SIZE; y += gridSpacing) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(TEX_SIZE, y);
		ctx.stroke();
	}

	// Trace lines (brighter green)
	ctx.strokeStyle = "#2a5a2a";
	ctx.lineWidth = 2;
	for (let i = 0; i < 25; i++) {
		const sx = Math.floor(pseudoNoise(i, 0, 200) * TEX_SIZE);
		const sy = Math.floor(pseudoNoise(i, 1, 200) * TEX_SIZE);

		ctx.beginPath();
		ctx.moveTo(sx, sy);

		let cx = sx;
		let cy = sy;
		let horiz = pseudoNoise(i, 2, 200) > 0.5;
		const segs = 2 + Math.floor(pseudoNoise(i, 3, 200) * 4);

		for (let s = 0; s < segs; s++) {
			const len = 15 + Math.floor(pseudoNoise(i * 7, s, 200) * 40);
			if (horiz) {
				cx += pseudoNoise(i, s + 10, 200) > 0.5 ? len : -len;
			} else {
				cy += pseudoNoise(i, s + 20, 200) > 0.5 ? len : -len;
			}
			cx = Math.max(0, Math.min(TEX_SIZE, cx));
			cy = Math.max(0, Math.min(TEX_SIZE, cy));
			ctx.lineTo(cx, cy);
			horiz = !horiz;
		}
		ctx.stroke();
	}

	// Small component pads
	ctx.fillStyle = "#3a6a3a";
	for (let i = 0; i < 20; i++) {
		const px = Math.floor(pseudoNoise(i, 0, 300) * TEX_SIZE);
		const py = Math.floor(pseudoNoise(i, 1, 300) * TEX_SIZE);
		ctx.fillRect(px - 2, py - 2, 4, 4);
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;

	return new THREE.MeshStandardMaterial({
		map: tex,
		roughness: 0.65,
		metalness: 0.25,
	});
}

// ---------------------------------------------------------------------------
// Zone generator lookup
// ---------------------------------------------------------------------------

const ZONE_GENERATORS: Record<string, () => THREE.MeshStandardMaterial> = {
	foundry: generateFoundryMaterial,
	slag: generateSlagMaterial,
	cable: generateCableMaterial,
	processor: generateProcessorMaterial,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create (or retrieve cached) a terrain material for the given zone type.
 *
 * @param zone - One of: "foundry", "slag", "cable", "processor"
 * @returns A configured MeshStandardMaterial with procedural textures
 */
export function createTerrainMaterial(
	zone: string,
): THREE.MeshStandardMaterial {
	const cached = cache.get(zone);
	if (cached) return cached;

	const generator = ZONE_GENERATORS[zone];
	if (!generator) {
		// Fallback: plain grey
		const fallback = new THREE.MeshStandardMaterial({
			color: 0x555555,
			roughness: 0.8,
			metalness: 0.3,
		});
		cache.set(zone, fallback);
		return fallback;
	}

	const material = generator();
	cache.set(zone, material);
	return material;
}
