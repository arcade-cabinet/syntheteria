/**
 * oceanRenderer — deep water waves + roboformed grating for abyssal_platform tiles.
 *
 * Two visual layers:
 *
 * 1. VOID_PIT tiles (open ocean): animated deep water plane with gentle vertex
 *    displacement (subtle waves). Sits just above the basic water in terrainRenderer.
 *
 * 2. abyssal_platform tiles (passable elevation -1, roboformed ocean): metallic
 *    grating mesh with canvas-generated crosshatch texture, blue underlighting,
 *    and shadow casting onto the deep water below.
 *
 * Pattern: createOceanRenderer(scene, board) → called in WorldScene.create().
 *          updateOcean(time) → called every frame in WorldScene.update().
 * NO React — pure Three.js.
 */

import * as THREE from "three";
import type { GeneratedBoard } from "../../../board";
import { TILE_SIZE, tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Deep water plane sits above terrainRenderer's water (-0.6) but below terrain (0). */
const DEEP_WATER_Y = -0.55;
const WAVE_AMPLITUDE = 0.06;
const WAVE_SPEED = 0.0008;
/** Subdivisions per tile for the water plane (more = smoother waves). */
const WATER_SEGMENTS_PER_TILE = 3;

/** Grating sits at passable elevation -1. */
const GRATING_Y = -0.4;
const GRATING_THICKNESS = 0.05;

/** Blue underlight below grating. */
const UNDERLIGHT_COLOR = 0x001144;
const UNDERLIGHT_INTENSITY = 1.5;
const UNDERLIGHT_DISTANCE = 4;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _waterMesh: THREE.Mesh | null = null;
let _waterOriginalY: Float32Array | null = null;
let _waterBoardWidth = 0;
let _waterBoardHeight = 0;

// ---------------------------------------------------------------------------
// Canvas-generated grating texture
// ---------------------------------------------------------------------------

function createGratingTexture(): THREE.CanvasTexture {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	// Dark metallic background
	ctx.fillStyle = "#1a1a2e";
	ctx.fillRect(0, 0, size, size);

	// Grid lines — bright metallic
	ctx.strokeStyle = "#4a4a6a";
	ctx.lineWidth = 3;

	const spacing = size / 8;
	// Horizontal lines
	for (let y = spacing; y < size; y += spacing) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(size, y);
		ctx.stroke();
	}
	// Vertical lines
	for (let x = spacing; x < size; x += spacing) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, size);
		ctx.stroke();
	}

	// Diagonal crosshatch for extra detail
	ctx.strokeStyle = "#33334d";
	ctx.lineWidth = 1;
	for (let i = -size; i < size * 2; i += spacing * 2) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i + size, size);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(i + size, 0);
		ctx.lineTo(i, size);
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(1, 1);
	return tex;
}

// ---------------------------------------------------------------------------
// Build animated deep water plane (covers all VOID_PIT tiles)
// ---------------------------------------------------------------------------

function buildDeepWaterPlane(board: GeneratedBoard): THREE.Mesh {
	const { width, height } = board.config;
	_waterBoardWidth = width;
	_waterBoardHeight = height;

	const segsX = width * WATER_SEGMENTS_PER_TILE;
	const segsZ = height * WATER_SEGMENTS_PER_TILE;
	const geo = new THREE.PlaneGeometry(
		width * TILE_SIZE,
		height * TILE_SIZE,
		segsX,
		segsZ,
	);
	geo.rotateX(-Math.PI / 2);
	geo.translate(
		(width * TILE_SIZE) / 2,
		DEEP_WATER_Y,
		(height * TILE_SIZE) / 2,
	);

	// Store original Y positions for wave animation
	const posAttr = geo.attributes.position;
	_waterOriginalY = new Float32Array(posAttr.count);
	for (let i = 0; i < posAttr.count; i++) {
		_waterOriginalY[i] = posAttr.getY(i);
	}

	const mat = new THREE.MeshStandardMaterial({
		color: 0x001833,
		emissive: 0x000811,
		roughness: 0.05,
		metalness: 0.2,
		transparent: true,
		opacity: 0.85,
		flatShading: true,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	return mesh;
}

// ---------------------------------------------------------------------------
// Build grating meshes for abyssal_platform tiles
// ---------------------------------------------------------------------------

function buildGratingMeshes(scene: THREE.Scene, board: GeneratedBoard): void {
	const { width, height } = board.config;
	const gratingTexture = createGratingTexture();

	const gratingMat = new THREE.MeshStandardMaterial({
		map: gratingTexture,
		metalness: 0.8,
		roughness: 0.3,
		flatShading: true,
	});

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile) continue;

			// Abyssal platform = passable, elevation -1, roboformed ocean grating
			if (tile.floorType !== "wetland") continue;

			const pos = tileToWorld(x, z);

			// Grating plane — thin flat box for thickness
			const gratingGeo = new THREE.BoxGeometry(
				TILE_SIZE * 0.95,
				GRATING_THICKNESS,
				TILE_SIZE * 0.95,
			);
			const gratingMesh = new THREE.Mesh(gratingGeo, gratingMat);
			gratingMesh.position.set(pos.x, GRATING_Y, pos.z);
			gratingMesh.castShadow = true;
			gratingMesh.receiveShadow = true;
			scene.add(gratingMesh);

			// Blue underlight below grating
			const light = new THREE.PointLight(
				UNDERLIGHT_COLOR,
				UNDERLIGHT_INTENSITY,
				UNDERLIGHT_DISTANCE,
			);
			light.position.set(pos.x, GRATING_Y - 0.3, pos.z);
			scene.add(light);
		}
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create deep water plane and grating meshes.
 * Call once in WorldScene.create().
 */
export function createOceanRenderer(
	scene: THREE.Scene,
	board: GeneratedBoard,
): void {
	// Animated deep water
	_waterMesh = buildDeepWaterPlane(board);
	scene.add(_waterMesh);

	// Metallic grating over abyssal_platform tiles
	buildGratingMeshes(scene, board);
}

/**
 * Animate deep water vertex displacement (gentle waves).
 * Call every frame from WorldScene.update().
 */
export function updateOcean(time: number): void {
	if (!_waterMesh || !_waterOriginalY) return;

	const geo = _waterMesh.geometry as THREE.BufferGeometry;
	const posAttr = geo.attributes.position;

	for (let i = 0; i < posAttr.count; i++) {
		const x = posAttr.getX(i);
		const z = posAttr.getZ(i);
		const baseY = _waterOriginalY[i];

		// Two overlapping sine waves for organic motion
		const wave1 = Math.sin(x * 0.8 + time * WAVE_SPEED) * WAVE_AMPLITUDE;
		const wave2 =
			Math.sin(z * 0.6 + time * WAVE_SPEED * 0.7 + 1.3) * WAVE_AMPLITUDE * 0.6;

		posAttr.setY(i, baseY + wave1 + wave2);
	}

	posAttr.needsUpdate = true;
	geo.computeVertexNormals();
}
