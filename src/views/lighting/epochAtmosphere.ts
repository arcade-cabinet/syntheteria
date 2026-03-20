/**
 * epochAtmosphere — visual atmosphere shifts per epoch.
 *
 * Each epoch should FEEL different. This module adjusts lighting, fog density,
 * ambient color, and adds atmospheric effects (point lights, storm hints)
 * based on the current epoch number.
 *
 * Epoch 1 (Emergence):     Calm, low fog, warm amber ambient
 * Epoch 2 (Expansion):     Standard, medium fog, cooler tones
 * Epoch 3 (Consolidation): Intensified sun, tighter fog, storm particles begin
 * Epoch 4 (Convergence):   Dramatic shifts, dense fog, magenta/red point lights
 * Epoch 5 (Transcendence): Heavy fog, pulsing lights, wormhole glow in sky
 *
 * Pure Three.js — no ECS or React dependency.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Epoch atmosphere definitions
// ---------------------------------------------------------------------------

interface EpochAtmosphereParams {
	/** Ambient light color. */
	readonly ambientColor: number;
	/** Ambient light intensity. */
	readonly ambientIntensity: number;
	/** Directional (sun) light color. */
	readonly sunColor: number;
	/** Directional (sun) light intensity. */
	readonly sunIntensity: number;
	/** Fog color. */
	readonly fogColor: number;
	/** FogExp2 density. */
	readonly fogDensity: number;
	/** Scene background color. */
	readonly backgroundColor: number;
	/** Optional accent point lights to add. */
	readonly accentLights: readonly AccentLightDef[];
}

interface AccentLightDef {
	readonly color: number;
	readonly intensity: number;
	readonly distance: number;
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

const EPOCH_PARAMS: readonly EpochAtmosphereParams[] = [
	// Epoch 1 — Emergence: Calm, warm amber hints, low fog
	{
		ambientColor: 0x2d2820,
		ambientIntensity: 0.6,
		sunColor: 0xccbb99,
		sunIntensity: 0.7,
		fogColor: 0x0a0805,
		fogDensity: 0.008,
		backgroundColor: 0x060504,
		accentLights: [
			{ color: 0xffaa44, intensity: 0.3, distance: 60, x: 0, y: 8, z: 0 },
		],
	},
	// Epoch 2 — Expansion: Standard, cooler tones, medium fog
	{
		ambientColor: 0x223344,
		ambientIntensity: 0.6,
		sunColor: 0xaaccff,
		sunIntensity: 0.8,
		fogColor: 0x050a0f,
		fogDensity: 0.012,
		backgroundColor: 0x050a0f,
		accentLights: [],
	},
	// Epoch 3 — Consolidation: Intensified light, tighter fog, storm hints
	{
		ambientColor: 0x1a2a3a,
		ambientIntensity: 0.5,
		sunColor: 0xbbddff,
		sunIntensity: 1.0,
		fogColor: 0x080e14,
		fogDensity: 0.015,
		backgroundColor: 0x060c12,
		accentLights: [
			// Subtle blue-white flickers hinting at approaching storm
			{
				color: 0x6688cc,
				intensity: 0.5,
				distance: 50,
				x: -20,
				y: 15,
				z: -20,
			},
			{
				color: 0x4466aa,
				intensity: 0.4,
				distance: 40,
				x: 30,
				y: 12,
				z: 25,
			},
		],
	},
	// Epoch 4 — Convergence: Dramatic, dense fog, magenta/red point lights
	{
		ambientColor: 0x1a1525,
		ambientIntensity: 0.45,
		sunColor: 0x9999bb,
		sunIntensity: 0.9,
		fogColor: 0x0a0610,
		fogDensity: 0.02,
		backgroundColor: 0x08050e,
		accentLights: [
			{
				color: 0xcc3366,
				intensity: 0.8,
				distance: 60,
				x: -15,
				y: 10,
				z: -15,
			},
			{
				color: 0xff2244,
				intensity: 0.6,
				distance: 50,
				x: 25,
				y: 8,
				z: 20,
			},
			{
				color: 0xaa1155,
				intensity: 0.5,
				distance: 40,
				x: 0,
				y: 15,
				z: -30,
			},
		],
	},
	// Epoch 5 — Transcendence: Extreme atmosphere, heavy fog, pulsing wormhole glow
	{
		ambientColor: 0x120820,
		ambientIntensity: 0.4,
		sunColor: 0x7766aa,
		sunIntensity: 0.7,
		fogColor: 0x0c0618,
		fogDensity: 0.025,
		backgroundColor: 0x0a0515,
		accentLights: [
			// Wormhole glow — intense violet/cyan overhead
			{
				color: 0x8844ff,
				intensity: 1.2,
				distance: 80,
				x: 0,
				y: 30,
				z: 0,
			},
			// Magenta pulsar
			{
				color: 0xff22aa,
				intensity: 0.9,
				distance: 60,
				x: -20,
				y: 10,
				z: -10,
			},
			// Cyan storm edge
			{
				color: 0x22ccff,
				intensity: 0.7,
				distance: 50,
				x: 20,
				y: 12,
				z: 15,
			},
			// Red danger glow
			{
				color: 0xff3322,
				intensity: 0.6,
				distance: 40,
				x: -10,
				y: 5,
				z: 25,
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Tag for tracking epoch-specific lights
// ---------------------------------------------------------------------------

const EPOCH_LIGHT_TAG = "epoch-atmosphere-light";
const EPOCH_AMBIENT_TAG = "epoch-atmosphere-ambient";
const EPOCH_SUN_TAG = "epoch-atmosphere-sun";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let currentEpochNumber = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply epoch-specific atmosphere to the scene.
 *
 * Adjusts ambient light, directional sun, fog, background, and accent lights.
 * Safe to call every turn — only rebuilds if the epoch has actually changed.
 *
 * @param scene — Three.js scene to modify
 * @param epoch — epoch number (1-5)
 */
export function applyEpochAtmosphere(scene: THREE.Scene, epoch: number): void {
	const clamped = Math.max(1, Math.min(5, Math.floor(epoch)));
	if (clamped === currentEpochNumber) return;
	currentEpochNumber = clamped;

	const params = EPOCH_PARAMS[clamped - 1];

	// --- Remove previous epoch lights ---
	removeTaggedChildren(scene, EPOCH_LIGHT_TAG);
	removeTaggedChildren(scene, EPOCH_AMBIENT_TAG);
	removeTaggedChildren(scene, EPOCH_SUN_TAG);

	// --- Background ---
	scene.background = new THREE.Color(params.backgroundColor);

	// --- Fog ---
	scene.fog = new THREE.FogExp2(params.fogColor, params.fogDensity);

	// --- Ambient light ---
	const ambient = new THREE.AmbientLight(
		params.ambientColor,
		params.ambientIntensity,
	);
	ambient.userData.tag = EPOCH_AMBIENT_TAG;
	scene.add(ambient);

	// --- Directional sun ---
	const sun = new THREE.DirectionalLight(params.sunColor, params.sunIntensity);
	sun.position.set(10, 50, 20);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -40;
	sun.shadow.camera.right = 40;
	sun.shadow.camera.top = 40;
	sun.shadow.camera.bottom = -40;
	sun.userData.tag = EPOCH_SUN_TAG;
	scene.add(sun);

	// --- Accent point lights ---
	for (const def of params.accentLights) {
		const light = new THREE.PointLight(def.color, def.intensity, def.distance);
		light.position.set(def.x, def.y, def.z);
		light.userData.tag = EPOCH_LIGHT_TAG;
		scene.add(light);
	}
}

/**
 * Get the current epoch number that the atmosphere is configured for.
 * Returns 0 if no epoch has been applied yet.
 */
export function getCurrentAtmosphereEpoch(): number {
	return currentEpochNumber;
}

/**
 * Reset internal state. Useful for game restart or testing.
 */
export function resetEpochAtmosphere(): void {
	currentEpochNumber = 0;
}

/**
 * Get the atmosphere parameters for a given epoch (for testing/inspection).
 */
export function getEpochAtmosphereParams(epoch: number): EpochAtmosphereParams {
	const clamped = Math.max(1, Math.min(5, Math.floor(epoch)));
	return EPOCH_PARAMS[clamped - 1];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function removeTaggedChildren(scene: THREE.Scene, tag: string): void {
	const toRemove: THREE.Object3D[] = [];
	for (const child of scene.children) {
		if (child.userData.tag === tag) {
			toRemove.push(child);
		}
	}
	for (const obj of toRemove) {
		scene.remove(obj);
	}
}
