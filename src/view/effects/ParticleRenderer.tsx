/**
 * ParticleRenderer — R3F component that renders all active particles.
 *
 * Uses THREE.Points with instanced BufferGeometry for performance.
 * Consumes visual effect events each frame and spawns appropriate particles.
 * Particle types: sparks (combat), smoke (destruction), dust (movement),
 * energy (hacking), and material cubes (harvest).
 *
 * Brand colors:
 * - Cyan (#00ffff) = player/tech/hacking
 * - Amber (#f6c56a) = infrastructure/power/fabrication
 * - Restrained red (#cc4444) = threat/damage
 * - White (#ffffff) = flashes/impacts
 *
 * Ported from pending/rendering/particles/ParticleRenderer.tsx — depends only on
 * effectEvents + ParticlePool (both in this directory).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
	drainEffects,
	type EffectEvent,
	type ParticleConfig,
	ParticlePool,
} from "../../rendering";

const MAX_PARTICLES = 2048;

/** Color constants matching brand palette */
const COLOR_CYAN = { r: 0, g: 1, b: 1 };
const COLOR_AMBER = { r: 0.965, g: 0.773, b: 0.416 };
const COLOR_RED = { r: 0.8, g: 0.267, b: 0.267 };
const COLOR_WHITE = { r: 1, g: 1, b: 1 };
const COLOR_GRAY = { r: 0.5, g: 0.5, b: 0.5 };

function randomSpread(base: number, spread: number): number {
	return base + (Math.random() - 0.5) * spread * 2;
}

function hexToRGB(hex: number): { r: number; g: number; b: number } {
	return {
		r: ((hex >> 16) & 0xff) / 255,
		g: ((hex >> 8) & 0xff) / 255,
		b: (hex & 0xff) / 255,
	};
}

/**
 * Spawn particles for a combat hit event.
 */
function spawnCombatHit(pool: ParticlePool, event: EffectEvent): void {
	const count = 12;
	const color = event.color ? hexToRGB(event.color) : COLOR_RED;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 1.5 + Math.random() * 3;
		pool.emit({
			x: event.x + randomSpread(0, 0.3),
			y: event.y + 0.5 + Math.random() * 0.5,
			z: event.z + randomSpread(0, 0.3),
			vx: Math.cos(angle) * speed,
			vy: 1.5 + Math.random() * 2,
			vz: Math.sin(angle) * speed,
			r: color.r,
			g: color.g,
			b: color.b,
			lifetime: 0.4 + Math.random() * 0.3,
			size: 0.08 + Math.random() * 0.06,
			sizeEnd: 0.02,
			gravity: 0.8,
		});
	}
	// White flash particle
	pool.emit({
		x: event.x,
		y: event.y + 0.8,
		z: event.z,
		vx: 0,
		vy: 0.2,
		vz: 0,
		...COLOR_WHITE,
		lifetime: 0.15,
		size: 0.5,
		sizeEnd: 0.1,
		gravity: 0,
	});
}

/**
 * Spawn particles for a unit destruction event.
 */
function spawnDestruction(pool: ParticlePool, event: EffectEvent): void {
	// Explosion burst — large count
	const count = 30;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const elevation = Math.random() * Math.PI - Math.PI * 0.3;
		const speed = 2 + Math.random() * 4;
		const isFlame = Math.random() > 0.5;
		const color = isFlame ? COLOR_AMBER : COLOR_GRAY;
		pool.emit({
			x: event.x + randomSpread(0, 0.5),
			y: event.y + Math.random() * 1.2,
			z: event.z + randomSpread(0, 0.5),
			vx: Math.cos(angle) * Math.cos(elevation) * speed,
			vy: Math.sin(elevation) * speed + 2,
			vz: Math.sin(angle) * Math.cos(elevation) * speed,
			r: color.r,
			g: color.g,
			b: color.b,
			lifetime: 0.6 + Math.random() * 0.8,
			size: 0.1 + Math.random() * 0.15,
			sizeEnd: isFlame ? 0.02 : 0.2,
			gravity: isFlame ? 0.6 : 0.1,
		});
	}
	// Central flash
	pool.emit({
		x: event.x,
		y: event.y + 0.6,
		z: event.z,
		vx: 0,
		vy: 0,
		vz: 0,
		...COLOR_WHITE,
		lifetime: 0.25,
		size: 1.2,
		sizeEnd: 0.1,
		gravity: 0,
	});
}

/**
 * Spawn particles for harvest in-progress (structure dissolve).
 */
function spawnHarvestTick(pool: ParticlePool, event: EffectEvent): void {
	const count = 3;
	for (let i = 0; i < count; i++) {
		pool.emit({
			x: event.x + randomSpread(0, 0.6),
			y: event.y + Math.random() * 1.5,
			z: event.z + randomSpread(0, 0.6),
			vx: randomSpread(0, 0.3),
			vy: 0.5 + Math.random() * 0.8,
			vz: randomSpread(0, 0.3),
			...COLOR_AMBER,
			lifetime: 0.8 + Math.random() * 0.5,
			size: 0.06 + Math.random() * 0.04,
			sizeEnd: 0.01,
			gravity: -0.1, // Float upward
		});
	}
}

/**
 * Spawn particles for harvest completion (material cubes absorb).
 */
function spawnHarvestComplete(pool: ParticlePool, event: EffectEvent): void {
	const count = 15;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		pool.emit({
			x: event.x + randomSpread(0, 0.4),
			y: event.y + 0.2 + Math.random() * 0.3,
			z: event.z + randomSpread(0, 0.4),
			vx: Math.cos(angle) * 0.5,
			vy: 1.5 + Math.random() * 1.5,
			vz: Math.sin(angle) * 0.5,
			...COLOR_AMBER,
			lifetime: 1.0 + Math.random() * 0.5,
			size: 0.12 + Math.random() * 0.08,
			sizeEnd: 0.03,
			gravity: -0.3,
		});
	}
}

/**
 * Spawn particles for hacking beam (energy sparks along beam path).
 */
function spawnHackProgress(pool: ParticlePool, event: EffectEvent): void {
	if (event.targetX == null || event.targetZ == null) return;
	const tx = event.targetX;
	const tz = event.targetZ;
	const ty = event.targetY ?? 0.8;

	const count = 4;
	for (let i = 0; i < count; i++) {
		const t = Math.random();
		const px = event.x + (tx - event.x) * t;
		const py = event.y + (ty - event.y) * t;
		const pz = event.z + (tz - event.z) * t;
		pool.emit({
			x: px + randomSpread(0, 0.15),
			y: py + randomSpread(0, 0.15),
			z: pz + randomSpread(0, 0.15),
			vx: randomSpread(0, 0.3),
			vy: randomSpread(0.2, 0.3),
			vz: randomSpread(0, 0.3),
			...COLOR_CYAN,
			lifetime: 0.3 + Math.random() * 0.2,
			size: 0.05 + Math.random() * 0.03,
			sizeEnd: 0.01,
			gravity: 0,
		});
	}
}

/**
 * Spawn particles for hack completion (capture flash).
 */
function spawnHackComplete(pool: ParticlePool, event: EffectEvent): void {
	const count = 20;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 1 + Math.random() * 2;
		pool.emit({
			x: event.x + randomSpread(0, 0.2),
			y: event.y + 0.5 + Math.random() * 0.5,
			z: event.z + randomSpread(0, 0.2),
			vx: Math.cos(angle) * speed,
			vy: 1 + Math.random() * 2,
			vz: Math.sin(angle) * speed,
			...COLOR_CYAN,
			lifetime: 0.5 + Math.random() * 0.4,
			size: 0.1 + Math.random() * 0.05,
			sizeEnd: 0.02,
			gravity: 0.3,
		});
	}
	// Bright flash
	pool.emit({
		x: event.x,
		y: event.y + 0.8,
		z: event.z,
		vx: 0,
		vy: 0,
		vz: 0,
		...COLOR_WHITE,
		lifetime: 0.2,
		size: 0.8,
		sizeEnd: 0.1,
		gravity: 0,
	});
}

/**
 * Spawn particles for construction stage transition.
 */
function spawnConstructionStage(pool: ParticlePool, event: EffectEvent): void {
	const count = 10;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		pool.emit({
			x: event.x + Math.cos(angle) * 0.8,
			y: event.y + Math.random() * 0.5,
			z: event.z + Math.sin(angle) * 0.8,
			vx: Math.cos(angle) * 0.3,
			vy: 0.5 + Math.random() * 1,
			vz: Math.sin(angle) * 0.3,
			...COLOR_AMBER,
			lifetime: 0.6 + Math.random() * 0.4,
			size: 0.05 + Math.random() * 0.04,
			sizeEnd: 0.01,
			gravity: 0.2,
		});
	}
}

/**
 * Spawn generic spark burst.
 */
function spawnSparks(pool: ParticlePool, event: EffectEvent): void {
	const count = 8;
	const color = event.color ? hexToRGB(event.color) : COLOR_AMBER;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 1 + Math.random() * 2;
		pool.emit({
			x: event.x + randomSpread(0, 0.1),
			y: event.y + 0.3,
			z: event.z + randomSpread(0, 0.1),
			vx: Math.cos(angle) * speed,
			vy: 1 + Math.random() * 2.5,
			vz: Math.sin(angle) * speed,
			r: color.r,
			g: color.g,
			b: color.b,
			lifetime: 0.3 + Math.random() * 0.4,
			size: 0.04 + Math.random() * 0.03,
			sizeEnd: 0.01,
			gravity: 1.0,
		});
	}
}

/**
 * Spawn smoke puff.
 */
function spawnSmoke(pool: ParticlePool, event: EffectEvent): void {
	const count = 6;
	for (let i = 0; i < count; i++) {
		pool.emit({
			x: event.x + randomSpread(0, 0.3),
			y: event.y + 0.2 + Math.random() * 0.5,
			z: event.z + randomSpread(0, 0.3),
			vx: randomSpread(0, 0.2),
			vy: 0.3 + Math.random() * 0.5,
			vz: randomSpread(0, 0.2),
			...COLOR_GRAY,
			lifetime: 1.0 + Math.random() * 1.0,
			size: 0.15 + Math.random() * 0.1,
			sizeEnd: 0.4,
			gravity: -0.05,
		});
	}
}

/**
 * Spawn dust puff.
 */
function spawnDust(pool: ParticlePool, event: EffectEvent): void {
	const count = 4;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		pool.emit({
			x: event.x + Math.cos(angle) * 0.3,
			y: event.y + 0.05,
			z: event.z + Math.sin(angle) * 0.3,
			vx: Math.cos(angle) * 0.5,
			vy: 0.1 + Math.random() * 0.3,
			vz: Math.sin(angle) * 0.5,
			r: 0.6,
			g: 0.55,
			b: 0.45,
			lifetime: 0.5 + Math.random() * 0.5,
			size: 0.08 + Math.random() * 0.06,
			sizeEnd: 0.2,
			gravity: 0.05,
		});
	}
}

function processEvent(pool: ParticlePool, event: EffectEvent): void {
	switch (event.type) {
		case "combat_hit":
			spawnCombatHit(pool, event);
			break;
		case "combat_destroy":
			spawnDestruction(pool, event);
			break;
		case "harvest_tick":
			spawnHarvestTick(pool, event);
			break;
		case "harvest_complete":
			spawnHarvestComplete(pool, event);
			break;
		case "hack_beam":
		case "hack_progress":
			spawnHackProgress(pool, event);
			break;
		case "hack_complete":
			spawnHackComplete(pool, event);
			break;
		case "construction_stage":
			spawnConstructionStage(pool, event);
			break;
		case "sparks":
			spawnSparks(pool, event);
			break;
		case "smoke":
			spawnSmoke(pool, event);
			break;
		case "dust":
			spawnDust(pool, event);
			break;
	}
}

export function ParticleRenderer() {
	const poolRef = useRef<ParticlePool | null>(null);
	if (!poolRef.current) {
		poolRef.current = new ParticlePool(MAX_PARTICLES);
	}

	const { geometry, posAttr, colorAttr, sizeAttr } = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(MAX_PARTICLES * 3);
		const colors = new Float32Array(MAX_PARTICLES * 3);
		const sizes = new Float32Array(MAX_PARTICLES);

		const posAttribute = new THREE.BufferAttribute(positions, 3);
		posAttribute.setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute("position", posAttribute);

		const colorAttribute = new THREE.BufferAttribute(colors, 3);
		colorAttribute.setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute("color", colorAttribute);

		const sizeAttribute = new THREE.BufferAttribute(sizes, 1);
		sizeAttribute.setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute("size", sizeAttribute);

		geo.setDrawRange(0, 0);

		return {
			geometry: geo,
			posAttr: posAttribute,
			colorAttr: colorAttribute,
			sizeAttr: sizeAttribute,
		};
	}, []);

	const materialRef = useRef<THREE.PointsMaterial>(null);

	useFrame((_, delta) => {
		const pool = poolRef.current;
		if (!pool) return;

		// Process queued events
		const events = drainEffects();
		for (const event of events) {
			processEvent(pool, event);
		}

		// Update physics
		pool.update(Math.min(delta, 0.05));

		// Sync to buffer geometry
		const positions = posAttr.array as Float32Array;
		const colors = colorAttr.array as Float32Array;
		const sizes = sizeAttr.array as Float32Array;

		let writeIdx = 0;
		for (let i = 0; i < pool.capacity; i++) {
			if (pool.alive[i] === 0) continue;

			const idx3 = writeIdx * 3;
			positions[idx3] = pool.posX[i];
			positions[idx3 + 1] = pool.posY[i];
			positions[idx3 + 2] = pool.posZ[i];

			const opacity = pool.getOpacity(i);
			colors[idx3] = pool.colorR[i] * opacity;
			colors[idx3 + 1] = pool.colorG[i] * opacity;
			colors[idx3 + 2] = pool.colorB[i] * opacity;

			sizes[writeIdx] = pool.getCurrentSize(i) * 30; // scale to pixel size

			writeIdx++;
		}

		geometry.setDrawRange(0, writeIdx);
		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		sizeAttr.needsUpdate = true;
	});

	return (
		<points geometry={geometry}>
			<pointsMaterial
				ref={materialRef}
				vertexColors
				transparent
				opacity={1}
				depthWrite={false}
				blending={THREE.AdditiveBlending}
				sizeAttenuation
			/>
		</points>
	);
}
