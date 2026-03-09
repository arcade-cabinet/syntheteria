/**
 * Procedural circuit board PBR material.
 *
 * Generates a dark PCB substrate with copper trace lines, T-junctions, and
 * solder pads. When powered, traces glow with a cyan-green emissive.
 *
 * Materials are cached by powered state.
 */

import * as THREE from "three";

const TEX_SIZE = 256;

const cache = new Map<string, THREE.MeshStandardMaterial>();

// ---------------------------------------------------------------------------
// Pseudo-random helpers
// ---------------------------------------------------------------------------

function hashInt(seed: number): number {
	let s = seed | 0;
	s = ((s >> 16) ^ s) * 0x45d9f3b;
	s = ((s >> 16) ^ s) * 0x45d9f3b;
	s = (s >> 16) ^ s;
	return (s & 0x7fffffff) / 0x7fffffff;
}

// ---------------------------------------------------------------------------
// Trace pattern generation
// ---------------------------------------------------------------------------

function drawTraces(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.strokeStyle = "#cc8833";
	ctx.lineWidth = 2;
	ctx.lineCap = "square";

	const padSize = 4;
	const traceCount = 40;

	// Draw random right-angle traces
	for (let i = 0; i < traceCount; i++) {
		const startX = Math.floor(hashInt(i * 3 + 1) * size);
		const startY = Math.floor(hashInt(i * 3 + 2) * size);
		const segments = 2 + Math.floor(hashInt(i * 3 + 3) * 4);

		ctx.beginPath();
		ctx.moveTo(startX, startY);

		let cx = startX;
		let cy = startY;
		let horizontal = hashInt(i * 7) > 0.5;

		for (let s = 0; s < segments; s++) {
			const length = 10 + Math.floor(hashInt(i * 11 + s * 5) * 50);

			if (horizontal) {
				cx += hashInt(i * 13 + s) > 0.5 ? length : -length;
			} else {
				cy += hashInt(i * 17 + s) > 0.5 ? length : -length;
			}

			// Clamp to canvas
			cx = Math.max(0, Math.min(size - 1, cx));
			cy = Math.max(0, Math.min(size - 1, cy));

			ctx.lineTo(cx, cy);
			horizontal = !horizontal;
		}

		ctx.stroke();
	}

	// Draw solder pads at trace intersections and endpoints
	ctx.fillStyle = "#ddaa44";
	for (let i = 0; i < 30; i++) {
		const px = Math.floor(hashInt(i * 23 + 100) * size);
		const py = Math.floor(hashInt(i * 29 + 200) * size);
		ctx.beginPath();
		ctx.arc(px, py, padSize, 0, Math.PI * 2);
		ctx.fill();
	}

	// Draw IC pads (small rectangles in a row)
	for (let i = 0; i < 4; i++) {
		const bx = Math.floor(hashInt(i * 37 + 300) * (size - 40)) + 20;
		const by = Math.floor(hashInt(i * 41 + 400) * (size - 20)) + 10;
		const pinCount = 4 + Math.floor(hashInt(i * 43 + 500) * 5);

		ctx.fillStyle = "#222222";
		ctx.fillRect(bx, by, pinCount * 6 + 4, 10);

		ctx.fillStyle = "#ccaa44";
		for (let p = 0; p < pinCount; p++) {
			ctx.fillRect(bx + 3 + p * 6, by - 2, 3, 3);
			ctx.fillRect(bx + 3 + p * 6, by + 9, 3, 3);
		}
	}
}

function generateAlbedoTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;

	// Dark PCB substrate
	ctx.fillStyle = "#1a2a1a";
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	// Add subtle substrate texture
	const imageData = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const grain = (Math.random() - 0.5) * 8;
		data[i] += grain;
		data[i + 1] += grain;
		data[i + 2] += grain;
	}
	ctx.putImageData(imageData, 0, 0);

	// Draw copper traces
	drawTraces(ctx, TEX_SIZE);

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function generateEmissiveTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;

	// Black base (no emission)
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	// Draw traces in emissive cyan-green — same pattern as albedo
	ctx.strokeStyle = "#00ffaa";
	ctx.lineWidth = 2;
	ctx.lineCap = "square";

	const traceCount = 40;
	for (let i = 0; i < traceCount; i++) {
		const startX = Math.floor(hashInt(i * 3 + 1) * TEX_SIZE);
		const startY = Math.floor(hashInt(i * 3 + 2) * TEX_SIZE);
		const segments = 2 + Math.floor(hashInt(i * 3 + 3) * 4);

		ctx.beginPath();
		ctx.moveTo(startX, startY);

		let cx = startX;
		let cy = startY;
		let horizontal = hashInt(i * 7) > 0.5;

		for (let s = 0; s < segments; s++) {
			const length = 10 + Math.floor(hashInt(i * 11 + s * 5) * 50);

			if (horizontal) {
				cx += hashInt(i * 13 + s) > 0.5 ? length : -length;
			} else {
				cy += hashInt(i * 17 + s) > 0.5 ? length : -length;
			}

			cx = Math.max(0, Math.min(TEX_SIZE - 1, cx));
			cy = Math.max(0, Math.min(TEX_SIZE - 1, cy));

			ctx.lineTo(cx, cy);
			horizontal = !horizontal;
		}

		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create (or retrieve cached) a procedural circuit board PBR material.
 * When powered is true, traces glow with cyan-green emissive.
 */
export function createCircuitMaterial(
	powered = false,
): THREE.MeshStandardMaterial {
	const key = powered ? "powered" : "unpowered";
	const cached = cache.get(key);
	if (cached) return cached;

	const material = new THREE.MeshStandardMaterial({
		map: generateAlbedoTexture(),
		roughness: 0.7,
		metalness: 0.3,
	});

	if (powered) {
		material.emissiveMap = generateEmissiveTexture();
		material.emissive = new THREE.Color(0x00ffaa);
		material.emissiveIntensity = 0.8;
	}

	cache.set(key, material);
	return material;
}
