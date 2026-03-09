/**
 * Conveyor belt PBR material with animated UV scrolling.
 *
 * The belt surface is dark rubber with a cross-hatch tread pattern generated
 * as a normal map. Metallic side rails are provided as a separate material.
 *
 * Call `updateBeltUV` each frame to scroll the belt surface.
 */

import * as THREE from "three";

const TEX_SIZE = 256;

let beltMaterialCache: THREE.MeshStandardMaterial | null = null;
let railMaterialCache: THREE.MeshStandardMaterial | null = null;

// ---------------------------------------------------------------------------
// Texture generation
// ---------------------------------------------------------------------------

function generateBeltAlbedo(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;

	// Dark rubber base
	ctx.fillStyle = "#222222";
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	// Subtle rubber grain
	const imageData = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const grain = (Math.random() - 0.5) * 10;
		data[i] = Math.max(0, Math.min(255, data[i] + grain));
		data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
		data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
	}
	ctx.putImageData(imageData, 0, 0);

	// Tread lines — slightly lighter cross-hatch
	ctx.strokeStyle = "#333333";
	ctx.lineWidth = 2;
	const spacing = 16;

	// Diagonal lines in one direction
	for (let i = -TEX_SIZE; i < TEX_SIZE * 2; i += spacing) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i + TEX_SIZE, TEX_SIZE);
		ctx.stroke();
	}

	// Diagonal lines in opposite direction
	for (let i = -TEX_SIZE; i < TEX_SIZE * 2; i += spacing) {
		ctx.beginPath();
		ctx.moveTo(i + TEX_SIZE, 0);
		ctx.lineTo(i, TEX_SIZE);
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function generateBeltNormal(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = TEX_SIZE;
	canvas.height = TEX_SIZE;
	const ctx = canvas.getContext("2d")!;
	const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
	const data = imageData.data;

	// Flat normal base
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 128;
		data[i + 1] = 128;
		data[i + 2] = 255;
		data[i + 3] = 255;
	}

	// Cross-hatch tread pattern in normal map
	const spacing = 16;

	// Diagonal ridges — direction 1 (top-left to bottom-right)
	for (let i = -TEX_SIZE; i < TEX_SIZE * 2; i += spacing) {
		for (let t = 0; t < TEX_SIZE; t++) {
			const x = Math.floor(i + t);
			const y = t;
			if (x < 0 || x >= TEX_SIZE || y < 0 || y >= TEX_SIZE) continue;

			const idx = (y * TEX_SIZE + x) * 4;
			// Normal pointing perpendicular to the ridge direction
			data[idx] = 148; // slight x offset
			data[idx + 1] = 108; // slight y offset
			data[idx + 2] = 230;

			// Adjacent pixel for other side of ridge
			if (x + 1 < TEX_SIZE) {
				const idx2 = (y * TEX_SIZE + x + 1) * 4;
				data[idx2] = 108;
				data[idx2 + 1] = 148;
				data[idx2 + 2] = 230;
			}
		}
	}

	// Diagonal ridges — direction 2 (top-right to bottom-left)
	for (let i = -TEX_SIZE; i < TEX_SIZE * 2; i += spacing) {
		for (let t = 0; t < TEX_SIZE; t++) {
			const x = Math.floor(i + TEX_SIZE - t);
			const y = t;
			if (x < 0 || x >= TEX_SIZE || y < 0 || y >= TEX_SIZE) continue;

			const idx = (y * TEX_SIZE + x) * 4;
			data[idx] = 108;
			data[idx + 1] = 108;
			data[idx + 2] = 230;
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
 * Create (or retrieve cached) the conveyor belt surface material.
 */
export function createBeltMaterial(): THREE.MeshStandardMaterial {
	if (beltMaterialCache) return beltMaterialCache;

	beltMaterialCache = new THREE.MeshStandardMaterial({
		map: generateBeltAlbedo(),
		normalMap: generateBeltNormal(),
		normalScale: new THREE.Vector2(0.5, 0.5),
		roughness: 0.8,
		metalness: 0.1,
	});

	return beltMaterialCache;
}

/**
 * Create (or retrieve cached) the metallic side rail material.
 */
export function createRailMaterial(): THREE.MeshStandardMaterial {
	if (railMaterialCache) return railMaterialCache;

	railMaterialCache = new THREE.MeshStandardMaterial({
		color: 0x666666,
		metalness: 0.9,
		roughness: 0.25,
	});

	return railMaterialCache;
}

/**
 * Update the belt material UV offset to animate belt motion.
 * Call once per frame with the current clock time.
 *
 * @param material - The belt surface material (from createBeltMaterial)
 * @param speed    - Belt speed multiplier (tiles per second)
 * @param time     - Current elapsed time in seconds
 */
export function updateBeltUV(
	material: THREE.MeshStandardMaterial,
	speed: number,
	time: number,
): void {
	if (material.map) {
		material.map.offset.y = speed * time;
		material.map.offset.y -= Math.floor(material.map.offset.y); // wrap 0-1
	}
	if (material.normalMap) {
		material.normalMap.offset.y = speed * time;
		material.normalMap.offset.y -= Math.floor(material.normalMap.offset.y);
	}
}
