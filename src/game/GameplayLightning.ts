/**
 * GameplayLightning — BabylonJS tube-based lightning strikes on the labyrinth.
 *
 * Random lightning bolts strike from sky to ground at random positions within
 * view radius. GlowLayer creates the visual bloom. Frequency is tied to
 * the epoch's lightningInterval definition.
 *
 * Not a React component — initialized imperatively in GameCanvas.
 */

import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import { getEpochVisual } from "../config/epochVisualDefs";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Duration of a lightning bolt in milliseconds. */
const BOLT_DURATION_MS = 200;

/** Height from which lightning strikes. */
const BOLT_SKY_Y = 40;

/** Number of segments for the jagged bolt path. */
const BOLT_SEGMENTS = 8;

/** Horizontal jitter per segment (meters). */
const BOLT_JITTER = 1.5;

// ─── State ──────────────────────────────────────────────────────────────────

export interface LightningState {
	scene: Scene;
	glowLayer: GlowLayer;
	boltMaterial: StandardMaterial;
	activeBolt: Mesh | null;
	nextStrikeMs: number;
	cameraTargetFn: () => { x: number; z: number } | null;
	disposed: boolean;
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Initialize the gameplay lightning system.
 *
 * @param scene BabylonJS scene
 * @param getCameraTarget Function that returns current camera target position
 * @returns State bag — pass to updateLightning and disposeLightning
 */
export function initLightning(
	scene: Scene,
	getCameraTarget: () => { x: number; z: number } | null,
): LightningState {
	// GlowLayer for bloom on emissive meshes
	const glowLayer = new GlowLayer("glow", scene, {
		mainTextureFixedSize: 256,
		blurKernelSize: 32,
	});
	glowLayer.intensity = 0.6;

	// Shared bolt material — bright cyan, fully emissive
	const boltMaterial = new StandardMaterial("lightning-bolt-mat", scene);
	boltMaterial.diffuseColor = Color3.Black();
	boltMaterial.emissiveColor = new Color3(0.7, 0.9, 1.0);
	boltMaterial.specularColor = Color3.Black();
	boltMaterial.alpha = 0.9;

	return {
		scene,
		glowLayer,
		boltMaterial,
		activeBolt: null,
		nextStrikeMs: randomInterval(1),
		cameraTargetFn: getCameraTarget,
		disposed: false,
	};
}

// ─── Per-frame update ───────────────────────────────────────────────────────

/**
 * Call each frame to manage lightning bolt lifecycle.
 * Creates bolts at random intervals, removes them after BOLT_DURATION_MS.
 */
export function updateLightning(state: LightningState, epoch: number): void {
	if (state.disposed) return;

	const now = performance.now();

	// Remove expired bolt
	if (state.activeBolt && now > state.nextStrikeMs) {
		state.activeBolt.dispose();
		state.activeBolt = null;
		// Schedule next strike
		state.nextStrikeMs = now + randomInterval(epoch);
	}

	// Create new bolt if it's time
	if (!state.activeBolt && now >= state.nextStrikeMs) {
		const target = state.cameraTargetFn();
		if (target) {
			createBolt(state, target.x, target.z, epoch);
			state.nextStrikeMs = now + BOLT_DURATION_MS;
		}
	}
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export function disposeLightning(state: LightningState): void {
	state.disposed = true;
	if (state.activeBolt) {
		state.activeBolt.dispose();
		state.activeBolt = null;
	}
	state.boltMaterial.dispose();
	state.glowLayer.dispose();
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Random interval between strikes (ms) based on epoch lightningInterval.
 */
function randomInterval(epoch: number): number {
	const visual = getEpochVisual(epoch);
	const interval = visual.lightningInterval;

	if (!interval) {
		// No lightning for this epoch — return a very long interval
		return 999999;
	}

	const [minSec, maxSec] = interval;
	const seconds = minSec + Math.random() * (maxSec - minSec);
	return seconds * 1000;
}

/**
 * Create a jagged lightning bolt from sky to ground near (cx, cz).
 */
function createBolt(
	state: LightningState,
	cx: number,
	cz: number,
	_epoch: number,
): void {
	// Strike position: random offset from camera center within 30 units
	const strikeX = cx + (Math.random() - 0.5) * 60;
	const strikeZ = cz + (Math.random() - 0.5) * 60;

	// Build jagged path from sky to ground
	const path: Vector3[] = [];
	for (let i = 0; i <= BOLT_SEGMENTS; i++) {
		const t = i / BOLT_SEGMENTS;
		const y = BOLT_SKY_Y * (1 - t);
		const jitterX =
			i === 0 || i === BOLT_SEGMENTS
				? 0
				: (Math.random() - 0.5) * BOLT_JITTER * 2;
		const jitterZ =
			i === 0 || i === BOLT_SEGMENTS
				? 0
				: (Math.random() - 0.5) * BOLT_JITTER * 2;
		path.push(new Vector3(strikeX + jitterX, y, strikeZ + jitterZ));
	}

	// Create tube mesh following the jagged path
	const bolt = MeshBuilder.CreateTube(
		"lightning-bolt",
		{
			path,
			radius: 0.08,
			tessellation: 6,
			updatable: false,
		},
		state.scene,
	);
	bolt.material = state.boltMaterial;
	bolt.isPickable = false;

	state.activeBolt = bolt;
}
