/**
 * DamageVFX — spark bursts on hit + smoke particles on low-health units.
 *
 * Driven by the eventBus `damage_taken` event. When a hit is registered:
 *   - A spark burst is emitted at the unit's world position
 *   - Orange/red sparks fly outward and fall with gravity
 *
 * Smoke is emitted continuously from units where all components are broken
 * (fully destroyed but not yet removed from the world), creating a persistent
 * visual indicator of a disabled unit.
 *
 * Uses the same module-level particle pool pattern as HarvestParticles
 * (fixed pool size, no per-frame allocation, useFrame-driven integration).
 *
 * Mount inside <Canvas> in GameScene.
 *
 * Pure utility functions (computeSparkVelocity, computeSmokeVelocity) are
 * exported for unit tests.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { units } from "../ecs/world";
import { subscribe } from "../systems/eventBus";

// ---------------------------------------------------------------------------
// Constants (from config/rendering.json via inline defaults)
// ---------------------------------------------------------------------------

const SPARK_COUNT = 48;
const SMOKE_COUNT = 32;

const SPARK_SPEED_MIN = 1.5;
const SPARK_SPEED_MAX = 4.0;
const SPARK_LIFETIME_MIN = 0.15;
const SPARK_LIFETIME_MAX = 0.35;
const SPARK_GRAVITY = 6.0;

const SMOKE_SPEED_MIN = 0.3;
const SMOKE_SPEED_MAX = 0.7;
const SMOKE_LIFETIME_MIN = 1.0;
const SMOKE_LIFETIME_MAX = 2.0;
const SMOKE_SPAWN_RATE = 4; // particles per second per damaged unit

// ---------------------------------------------------------------------------
// Particle types (module-level, no per-frame allocation)
// ---------------------------------------------------------------------------

interface Particle {
	x: number; y: number; z: number;
	vx: number; vy: number; vz: number;
	life: number;
	maxLife: number;
	alive: boolean;
}

function makePool(count: number): Particle[] {
	const pool: Particle[] = [];
	for (let i = 0; i < count; i++) {
		pool.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, alive: false });
	}
	return pool;
}

const sparks: Particle[] = makePool(SPARK_COUNT);
const smoke: Particle[] = makePool(SMOKE_COUNT);

let smokeAccumulator = 0;

// ---------------------------------------------------------------------------
// Pending spawn queue — filled by event subscriptions, consumed by useFrame
// ---------------------------------------------------------------------------

interface SparkSpawn {
	x: number; y: number; z: number;
}

const pendingSparkSpawns: SparkSpawn[] = [];

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Compute randomized velocity for a spark particle.
 * Sparks fly outward in a hemisphere with slight upward bias.
 */
export function computeSparkVelocity(
	rng: () => number,
): { vx: number; vy: number; vz: number } {
	const theta = rng() * Math.PI * 2;
	const phi = rng() * Math.PI * 0.5; // upper hemisphere only
	const speed = SPARK_SPEED_MIN + rng() * (SPARK_SPEED_MAX - SPARK_SPEED_MIN);
	return {
		vx: Math.cos(theta) * Math.sin(phi) * speed,
		vy: Math.cos(phi) * speed + rng() * 1.0, // extra upward bias
		vz: Math.sin(theta) * Math.sin(phi) * speed,
	};
}

/**
 * Compute randomized velocity for a smoke particle.
 * Smoke rises slowly with gentle lateral drift.
 */
export function computeSmokeVelocity(
	rng: () => number,
): { vx: number; vy: number; vz: number } {
	const speed = SMOKE_SPEED_MIN + rng() * (SMOKE_SPEED_MAX - SMOKE_SPEED_MIN);
	return {
		vx: (rng() - 0.5) * 0.4,
		vy: speed,
		vz: (rng() - 0.5) * 0.4,
	};
}

/**
 * Find the world position of a unit entity by ID.
 * Returns null if the unit is not in the world.
 */
export function findUnitPosition(
	entityId: string,
): { x: number; y: number; z: number } | null {
	for (const entity of units) {
		if (entity.id === entityId) {
			return entity.worldPosition;
		}
	}
	return null;
}

/**
 * Get all unit entity IDs where every component is broken.
 */
export function getDestroyedUnitIds(): string[] {
	const ids: string[] = [];
	for (const entity of units) {
		if (entity.unit.components.length > 0 &&
			entity.unit.components.every((c) => !c.functional)) {
			ids.push(entity.id);
		}
	}
	return ids;
}

// ---------------------------------------------------------------------------
// Particle spawn helpers
// ---------------------------------------------------------------------------

function spawnSparks(x: number, y: number, z: number): void {
	let count = 0;
	const targetCount = 6 + Math.floor(Math.random() * 4); // 6-9 sparks per hit

	for (const p of sparks) {
		if (!p.alive && count < targetCount) {
			p.x = x + (Math.random() - 0.5) * 0.2;
			p.y = y + 0.5 + Math.random() * 0.5;
			p.z = z + (Math.random() - 0.5) * 0.2;

			const vel = computeSparkVelocity(Math.random);
			p.vx = vel.vx;
			p.vy = vel.vy;
			p.vz = vel.vz;

			p.life = SPARK_LIFETIME_MIN + Math.random() * (SPARK_LIFETIME_MAX - SPARK_LIFETIME_MIN);
			p.maxLife = p.life;
			p.alive = true;
			count++;
		}
	}
}

function spawnSmoke(x: number, y: number, z: number): void {
	for (const p of smoke) {
		if (!p.alive) {
			p.x = x + (Math.random() - 0.5) * 0.4;
			p.y = y + 0.8 + Math.random() * 0.3;
			p.z = z + (Math.random() - 0.5) * 0.4;

			const vel = computeSmokeVelocity(Math.random);
			p.vx = vel.vx;
			p.vy = vel.vy;
			p.vz = vel.vz;

			p.life = SMOKE_LIFETIME_MIN + Math.random() * (SMOKE_LIFETIME_MAX - SMOKE_LIFETIME_MIN);
			p.maxLife = p.life;
			p.alive = true;
			return;
		}
	}
}

// ---------------------------------------------------------------------------
// Geometry + material singletons
// ---------------------------------------------------------------------------

let sparkGeometry: THREE.BufferGeometry | null = null;
let sparkMaterial: THREE.PointsMaterial | null = null;
let smokeGeometry: THREE.BufferGeometry | null = null;
let smokeMaterial: THREE.PointsMaterial | null = null;

function getSparkGeometry(): THREE.BufferGeometry {
	if (!sparkGeometry) {
		sparkGeometry = new THREE.BufferGeometry();
		sparkGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
		sparkGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
		sparkGeometry.setAttribute("size", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT), 1));
	}
	return sparkGeometry;
}

function getSparkMaterial(): THREE.PointsMaterial {
	if (!sparkMaterial) {
		sparkMaterial = new THREE.PointsMaterial({
			size: 0.07,
			vertexColors: true,
			transparent: true,
			opacity: 1.0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true,
		});
	}
	return sparkMaterial;
}

function getSmokeGeometry(): THREE.BufferGeometry {
	if (!smokeGeometry) {
		smokeGeometry = new THREE.BufferGeometry();
		smokeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3));
		smokeGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3));
		smokeGeometry.setAttribute("size", new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT), 1));
	}
	return smokeGeometry;
}

function getSmokeMaterial(): THREE.PointsMaterial {
	if (!smokeMaterial) {
		smokeMaterial = new THREE.PointsMaterial({
			size: 0.25,
			vertexColors: true,
			transparent: true,
			opacity: 0.6,
			blending: THREE.NormalBlending,
			depthWrite: false,
			sizeAttenuation: true,
		});
	}
	return smokeMaterial;
}

// ---------------------------------------------------------------------------
// Color helpers (reused per-frame)
// ---------------------------------------------------------------------------

const _sparkColor = new THREE.Color();
const _smokeColor = new THREE.Color();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DamageVFX() {
	const sparkPointsRef = useRef<THREE.Points>(null);
	const smokePointsRef = useRef<THREE.Points>(null);

	// Subscribe to damage_taken events — queue spark spawns for the next frame
	useEffect(() => {
		const unsubscribe = subscribe("damage_taken", (event) => {
			// Find the target unit's position
			const pos = findUnitPosition(event.targetId);
			if (pos) {
				pendingSparkSpawns.push({ x: pos.x, y: pos.y, z: pos.z });
			}
		});
		return unsubscribe;
	}, []);

	useFrame((_, delta) => {
		const clampedDelta = Math.min(delta, 0.1);

		// ── Process pending spark spawns from events ──────────────────────
		while (pendingSparkSpawns.length > 0) {
			const spawn = pendingSparkSpawns.shift();
			if (spawn) {
				spawnSparks(spawn.x, spawn.y, spawn.z);
			}
		}

		// ── Spawn smoke on destroyed units ────────────────────────────────
		const destroyedIds = getDestroyedUnitIds();
		if (destroyedIds.length > 0) {
			smokeAccumulator += delta * SMOKE_SPAWN_RATE * destroyedIds.length;
			while (smokeAccumulator >= 1.0) {
				smokeAccumulator -= 1.0;
				const idx = Math.floor(Math.random() * destroyedIds.length);
				const pos = findUnitPosition(destroyedIds[idx]);
				if (pos) {
					spawnSmoke(pos.x, pos.y, pos.z);
				}
			}
		} else {
			smokeAccumulator = 0;
		}

		// ── Update spark particles ─────────────────────────────────────────
		if (sparkPointsRef.current) {
			const geo = sparkPointsRef.current.geometry;
			const posArr = (geo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
			const colArr = (geo.getAttribute("color") as THREE.BufferAttribute).array as Float32Array;
			const sizeArr = (geo.getAttribute("size") as THREE.BufferAttribute).array as Float32Array;

			let anyAlive = false;

			for (let i = 0; i < SPARK_COUNT; i++) {
				const p = sparks[i];
				if (!p.alive) {
					posArr[i * 3 + 1] = -1000;
					sizeArr[i] = 0;
					continue;
				}

				p.vx *= 0.85; // drag
				p.vz *= 0.85;
				p.vy -= SPARK_GRAVITY * clampedDelta;
				p.x += p.vx * clampedDelta;
				p.y += p.vy * clampedDelta;
				p.z += p.vz * clampedDelta;
				p.life -= clampedDelta;

				if (p.life <= 0) {
					p.alive = false;
					posArr[i * 3 + 1] = -1000;
					sizeArr[i] = 0;
					continue;
				}

				anyAlive = true;
				posArr[i * 3] = p.x;
				posArr[i * 3 + 1] = p.y;
				posArr[i * 3 + 2] = p.z;

				const t = p.life / p.maxLife;
				sizeArr[i] = 0.04 + t * 0.05;
				// Orange at start → red at end
				_sparkColor.setHSL(0.06 - (1 - t) * 0.04, 1.0, 0.5 + t * 0.2);
				colArr[i * 3] = _sparkColor.r;
				colArr[i * 3 + 1] = _sparkColor.g;
				colArr[i * 3 + 2] = _sparkColor.b;
			}

			sparkPointsRef.current.visible = anyAlive;
			if (anyAlive) {
				(geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
				(geo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
				(geo.getAttribute("size") as THREE.BufferAttribute).needsUpdate = true;
			}
		}

		// ── Update smoke particles ─────────────────────────────────────────
		if (smokePointsRef.current) {
			const geo = smokePointsRef.current.geometry;
			const posArr = (geo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
			const colArr = (geo.getAttribute("color") as THREE.BufferAttribute).array as Float32Array;
			const sizeArr = (geo.getAttribute("size") as THREE.BufferAttribute).array as Float32Array;

			let anyAlive = false;

			for (let i = 0; i < SMOKE_COUNT; i++) {
				const p = smoke[i];
				if (!p.alive) {
					posArr[i * 3 + 1] = -1000;
					sizeArr[i] = 0;
					continue;
				}

				p.x += p.vx * clampedDelta;
				p.y += p.vy * clampedDelta;
				p.z += p.vz * clampedDelta;
				// Smoke decelerates and widens
				p.vx *= 0.98;
				p.vz *= 0.98;
				p.life -= clampedDelta;

				if (p.life <= 0) {
					p.alive = false;
					posArr[i * 3 + 1] = -1000;
					sizeArr[i] = 0;
					continue;
				}

				anyAlive = true;
				posArr[i * 3] = p.x;
				posArr[i * 3 + 1] = p.y;
				posArr[i * 3 + 2] = p.z;

				const t = p.life / p.maxLife;
				// Grows larger and fades out
				sizeArr[i] = 0.15 + (1 - t) * 0.4;
				// Dark gray → lighter gray as smoke rises
				const brightness = 0.3 + (1 - t) * 0.25;
				_smokeColor.setRGB(brightness, brightness, brightness);
				colArr[i * 3] = _smokeColor.r;
				colArr[i * 3 + 1] = _smokeColor.g;
				colArr[i * 3 + 2] = _smokeColor.b;
			}

			smokePointsRef.current.visible = anyAlive;
			if (anyAlive) {
				(geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
				(geo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
				(geo.getAttribute("size") as THREE.BufferAttribute).needsUpdate = true;
			}
		}
	});

	return (
		<>
			<points
				ref={sparkPointsRef}
				geometry={getSparkGeometry()}
				material={getSparkMaterial()}
				visible={false}
			/>
			<points
				ref={smokePointsRef}
				geometry={getSmokeGeometry()}
				material={getSmokeMaterial()}
				visible={false}
			/>
		</>
	);
}
