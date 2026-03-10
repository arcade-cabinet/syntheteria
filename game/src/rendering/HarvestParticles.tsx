/**
 * HarvestParticles — spark particles emitted while harvesting an ore deposit.
 *
 * When the harvesting system is active, small bright sparks fly from the
 * deposit position toward the player camera. Color matches the ore type.
 * When not harvesting, the Points mesh is hidden (visible=false).
 *
 * Uses module-level geometry/material singletons to avoid per-frame allocation.
 * Driven entirely by useFrame — no React state, no reconciliation overhead.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getHarvestingState } from "../systems/harvesting";
import { getDeposit, ORE_TYPE_CONFIGS } from "../systems/oreSpawner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 16;
const MIN_LIFETIME = 0.3;
const MAX_LIFETIME = 0.5;
const SPEED_MIN = 2.0;
const SPEED_MAX = 4.0;
/** Lateral spread for randomized velocity */
const SPREAD = 1.5;

// ---------------------------------------------------------------------------
// Per-particle state (module-level, no per-frame allocation)
// ---------------------------------------------------------------------------

interface Particle {
	/** Current position */
	x: number;
	y: number;
	z: number;
	/** Velocity */
	vx: number;
	vy: number;
	vz: number;
	/** Time remaining before this particle dies */
	life: number;
	/** Max lifetime (for alpha fade) */
	maxLife: number;
	/** Whether this particle is alive */
	alive: boolean;
}

const particles: Particle[] = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
	particles.push({
		x: 0,
		y: 0,
		z: 0,
		vx: 0,
		vy: 0,
		vz: 0,
		life: 0,
		maxLife: 1,
		alive: false,
	});
}

/** Spawn accumulator — controls how many particles to emit per second */
let spawnAccumulator = 0;
const SPAWN_RATE = PARTICLE_COUNT / ((MIN_LIFETIME + MAX_LIFETIME) * 0.5);

// ---------------------------------------------------------------------------
// Module-level geometry + material singletons
// ---------------------------------------------------------------------------

let sharedGeometry: THREE.BufferGeometry | null = null;

function getGeometry(): THREE.BufferGeometry {
	if (!sharedGeometry) {
		sharedGeometry = new THREE.BufferGeometry();
		const positions = new Float32Array(PARTICLE_COUNT * 3);
		const colors = new Float32Array(PARTICLE_COUNT * 3);
		const sizes = new Float32Array(PARTICLE_COUNT);

		sharedGeometry.setAttribute(
			"position",
			new THREE.BufferAttribute(positions, 3),
		);
		sharedGeometry.setAttribute(
			"color",
			new THREE.BufferAttribute(colors, 3),
		);
		sharedGeometry.setAttribute(
			"size",
			new THREE.BufferAttribute(sizes, 1),
		);
	}
	return sharedGeometry;
}

let sharedMaterial: THREE.PointsMaterial | null = null;

function getMaterial(): THREE.PointsMaterial {
	if (!sharedMaterial) {
		sharedMaterial = new THREE.PointsMaterial({
			size: 0.08,
			vertexColors: true,
			transparent: true,
			opacity: 1.0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true,
		});
	}
	return sharedMaterial;
}

// ---------------------------------------------------------------------------
// Temp vectors (reused per frame)
// ---------------------------------------------------------------------------

const _depositPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _sparkColor = new THREE.Color();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function spawnParticle(
	p: Particle,
	depositX: number,
	depositY: number,
	depositZ: number,
	dirX: number,
	dirY: number,
	dirZ: number,
): void {
	// Start at deposit surface (slight random offset)
	p.x = depositX + (Math.random() - 0.5) * 0.6;
	p.y = depositY + Math.random() * 0.5;
	p.z = depositZ + (Math.random() - 0.5) * 0.6;

	// Velocity: mostly toward camera with lateral spread
	const speed = randomRange(SPEED_MIN, SPEED_MAX);
	p.vx = dirX * speed + (Math.random() - 0.5) * SPREAD;
	p.vy = dirY * speed + Math.random() * 1.5 + 0.5; // bias upward
	p.vz = dirZ * speed + (Math.random() - 0.5) * SPREAD;

	p.life = randomRange(MIN_LIFETIME, MAX_LIFETIME);
	p.maxLife = p.life;
	p.alive = true;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HarvestParticles() {
	const pointsRef = useRef<THREE.Points>(null);
	const { camera } = useThree();

	useFrame((_, delta) => {
		const points = pointsRef.current;
		if (!points) return;

		const harvestState = getHarvestingState();

		if (!harvestState || !harvestState.isActive) {
			// Not harvesting — hide and kill all particles
			points.visible = false;
			spawnAccumulator = 0;
			for (const p of particles) {
				p.alive = false;
			}
			return;
		}

		const deposit = getDeposit(harvestState.depositId);
		if (!deposit) {
			points.visible = false;
			return;
		}

		points.visible = true;

		// Resolve positions
		_depositPos.set(deposit.position.x, deposit.position.y, deposit.position.z);
		camera.getWorldPosition(_camPos);
		_toCamera.copy(_camPos).sub(_depositPos).normalize();

		// Resolve ore color
		const oreConfig = ORE_TYPE_CONFIGS[deposit.type];
		const oreColorHex = oreConfig?.color ?? "#ffffff";
		_sparkColor.set(oreColorHex);
		// Brighten the spark color for an emissive look
		_sparkColor.multiplyScalar(1.8);

		// Spawn new particles
		spawnAccumulator += delta * SPAWN_RATE;
		while (spawnAccumulator >= 1.0) {
			spawnAccumulator -= 1.0;

			// Find a dead particle to recycle
			for (const p of particles) {
				if (!p.alive) {
					spawnParticle(
						p,
						_depositPos.x,
						_depositPos.y,
						_depositPos.z,
						_toCamera.x,
						_toCamera.y,
						_toCamera.z,
					);
					break;
				}
			}
		}

		// Update particles and write into buffer attributes
		const geo = points.geometry;
		const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
		const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
		const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;

		const posArr = posAttr.array as Float32Array;
		const colArr = colAttr.array as Float32Array;
		const sizeArr = sizeAttr.array as Float32Array;

		const clampedDelta = Math.min(delta, 0.1);

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const p = particles[i];

			if (!p.alive) {
				// Park dead particles off-screen
				posArr[i * 3] = 0;
				posArr[i * 3 + 1] = -1000;
				posArr[i * 3 + 2] = 0;
				sizeArr[i] = 0;
				continue;
			}

			// Integrate
			p.x += p.vx * clampedDelta;
			p.y += p.vy * clampedDelta;
			p.z += p.vz * clampedDelta;

			// Gravity-like deceleration on Y
			p.vy -= 3.0 * clampedDelta;

			p.life -= clampedDelta;
			if (p.life <= 0) {
				p.alive = false;
				posArr[i * 3] = 0;
				posArr[i * 3 + 1] = -1000;
				posArr[i * 3 + 2] = 0;
				sizeArr[i] = 0;
				continue;
			}

			// Write position
			posArr[i * 3] = p.x;
			posArr[i * 3 + 1] = p.y;
			posArr[i * 3 + 2] = p.z;

			// Alpha fade via size — shrink as life runs out
			const t = p.life / p.maxLife;
			sizeArr[i] = 0.06 + t * 0.06;

			// Color (constant per ore type, written each frame for simplicity)
			colArr[i * 3] = _sparkColor.r;
			colArr[i * 3 + 1] = _sparkColor.g;
			colArr[i * 3 + 2] = _sparkColor.b;
		}

		posAttr.needsUpdate = true;
		colAttr.needsUpdate = true;
		sizeAttr.needsUpdate = true;
	});

	const geometry = getGeometry();
	const material = getMaterial();

	return <points ref={pointsRef} geometry={geometry} material={material} visible={false} />;
}
