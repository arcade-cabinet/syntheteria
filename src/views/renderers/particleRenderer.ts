/**
 * particleRenderer — Points-based particle system for combat effects, harvest sparks, etc.
 *
 * Uses THREE.Points with BufferGeometry + PointsMaterial.
 * Particles have position, velocity, and lifetime. Expired particles are recycled.
 *
 * Pure Three.js — no React dependency.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PARTICLES = 2048;
const DEFAULT_SIZE = 0.15;

// ---------------------------------------------------------------------------
// Internal particle state (SoA layout for cache-friendly updates)
// ---------------------------------------------------------------------------

const positions = new Float32Array(MAX_PARTICLES * 3);
const velocities = new Float32Array(MAX_PARTICLES * 3);
const colors = new Float32Array(MAX_PARTICLES * 3);
const lifetimes = new Float32Array(MAX_PARTICLES); // remaining lifetime in seconds
const maxLifetimes = new Float32Array(MAX_PARTICLES); // initial lifetime (for alpha fade)
let aliveCount = 0;

// ---------------------------------------------------------------------------
// Three.js objects
// ---------------------------------------------------------------------------

let points: THREE.Points | null = null;
let geometry: THREE.BufferGeometry | null = null;

const tmpColor = new THREE.Color();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the Points object and add it to the scene.
 * Call once during scene setup.
 */
export function createParticleRenderer(scene: THREE.Scene): void {
	geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(positions, 3),
	);
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

	// Draw range starts at 0 — no particles alive yet
	geometry.setDrawRange(0, 0);

	const material = new THREE.PointsMaterial({
		size: DEFAULT_SIZE,
		vertexColors: true,
		transparent: true,
		opacity: 0.9,
		depthWrite: false,
		sizeAttenuation: true,
	});

	points = new THREE.Points(geometry, material);
	points.frustumCulled = false; // particles move freely
	scene.add(points);
}

/**
 * Spawn a burst of particles at a world position.
 */
export function spawnParticles(
	x: number,
	y: number,
	z: number,
	color: number,
	count: number,
): void {
	tmpColor.setHex(color);

	for (let i = 0; i < count; i++) {
		if (aliveCount >= MAX_PARTICLES) break;

		const idx = aliveCount;
		const i3 = idx * 3;

		// Position — slight random spread around origin
		positions[i3] = x + (Math.random() - 0.5) * 0.3;
		positions[i3 + 1] = y + (Math.random() - 0.5) * 0.3;
		positions[i3 + 2] = z + (Math.random() - 0.5) * 0.3;

		// Velocity — outward burst with upward bias
		velocities[i3] = (Math.random() - 0.5) * 2.0;
		velocities[i3 + 1] = Math.random() * 1.5 + 0.5;
		velocities[i3 + 2] = (Math.random() - 0.5) * 2.0;

		// Color
		colors[i3] = tmpColor.r;
		colors[i3 + 1] = tmpColor.g;
		colors[i3 + 2] = tmpColor.b;

		// Lifetime: 0.4 – 1.2 seconds
		const lt = 0.4 + Math.random() * 0.8;
		lifetimes[idx] = lt;
		maxLifetimes[idx] = lt;

		aliveCount++;
	}
}

/**
 * Advance particle simulation by `delta` seconds.
 * Removes expired particles by swap-and-pop.
 */
export function updateParticles(delta: number): void {
	if (!geometry) return;

	let i = 0;
	while (i < aliveCount) {
		lifetimes[i] -= delta;

		if (lifetimes[i] <= 0) {
			// Swap with last alive particle
			const last = aliveCount - 1;
			if (i !== last) {
				const i3 = i * 3;
				const l3 = last * 3;

				positions[i3] = positions[l3];
				positions[i3 + 1] = positions[l3 + 1];
				positions[i3 + 2] = positions[l3 + 2];

				velocities[i3] = velocities[l3];
				velocities[i3 + 1] = velocities[l3 + 1];
				velocities[i3 + 2] = velocities[l3 + 2];

				colors[i3] = colors[l3];
				colors[i3 + 1] = colors[l3 + 1];
				colors[i3 + 2] = colors[l3 + 2];

				lifetimes[i] = lifetimes[last];
				maxLifetimes[i] = maxLifetimes[last];
			}
			aliveCount--;
			// Don't increment i — re-check the swapped particle
			continue;
		}

		// Integrate position
		const i3 = i * 3;
		positions[i3] += velocities[i3] * delta;
		positions[i3 + 1] += velocities[i3 + 1] * delta;
		positions[i3 + 2] += velocities[i3 + 2] * delta;

		// Gravity
		velocities[i3 + 1] -= 3.0 * delta;

		i++;
	}

	// Update GPU buffers
	const posAttr = geometry.attributes.position as THREE.BufferAttribute;
	posAttr.needsUpdate = true;
	const colAttr = geometry.attributes.color as THREE.BufferAttribute;
	colAttr.needsUpdate = true;

	geometry.setDrawRange(0, aliveCount);
}
