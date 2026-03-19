/**
 * UnitRenderer — Layer 6: robot units as GLB models.
 *
 * Uses drei useGLTF + Clone — proper R3F declarative pattern.
 * Each unit is its own sub-component with useFrame for movement lerping.
 * Fog of war gated — enemy units on unexplored tiles are hidden.
 *
 * Mark III-V visual effects (GAME_DESIGN.md §7):
 *   Mark III: Faction-color accent glow (point light)
 *   Mark IV:  Orbiting particle trail (emissive points)
 *   Mark V:   15% scale increase + intensified glow + particles
 */

import { Clone, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import { playSfx } from "../audio/sfx";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../ecs/traits/unit";
import {
	FACTION_COLORS,
	getAllRobotModelUrls,
	resolveRobotModelUrl,
} from "./modelPaths";
import { buildExploredSet, isTileExplored } from "./tileVisibility";

// Preload all robot models
for (const url of getAllRobotModelUrls()) {
	useGLTF.preload(url);
}

// ─── Single unit model ───────────────────────────────────────────────────────

function UnitModel({
	url,
	x,
	z,
	factionColor,
	markScale,
}: {
	url: string;
	x: number;
	z: number;
	factionColor: number;
	markScale: number;
}) {
	const { scene } = useGLTF(url);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		// Fill ~90% of tile so robots are prominent on the board
		const s = maxExtent > 0 ? (TILE_SIZE_M * 1.4) / maxExtent : 1;
		return { scale: s * markScale, yOffset: -box.min.y * s * markScale };
	}, [scene, markScale]);

	return (
		<Clone
			object={scene}
			position={[x * TILE_SIZE_M, yOffset + 0.1, z * TILE_SIZE_M]}
			scale={scale}
			castShadow
		/>
	);
}

// ─── Fallback box mesh for units when GLB fails ─────────────────────────────

function UnitBox({ x, z, color }: { x: number; z: number; color: number }) {
	return (
		<mesh position={[x * TILE_SIZE_M, 0.5, z * TILE_SIZE_M]} castShadow>
			<boxGeometry args={[0.8, 1.0, 0.8]} />
			<meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
		</mesh>
	);
}

// ─── Readiness ring — emissive CYAN ring under units with AP remaining ──────
//
// Diegetic palette (GAME_DESIGN.md Section 9):
//   Cyan = signal, focus, selection, intelligence glow, machine cognition
//   The readiness ring is uniform cyan for ALL factions — it represents
//   machine operational status, not faction identity.

/** Ring radius as fraction of tile. Slightly larger than the unit footprint. */
const RING_OUTER_RADIUS = TILE_SIZE_M * 0.45;
const RING_INNER_RADIUS = TILE_SIZE_M * 0.38;
const RING_Y = 0.15; // above terrain surface after elevation displacement

/** Diegetic cyan — machine cognition / readiness. */
const READINESS_CYAN = 0x00ccff;

function ReadinessRing({
	x,
	z,
	ap,
	maxAp,
}: {
	x: number;
	z: number;
	ap: number;
	maxAp: number;
}) {
	const meshRef = useRef<THREE.Mesh>(null);

	// Pulse animation — subtle breathing effect
	useFrame((state) => {
		if (!meshRef.current) return;
		const mat = meshRef.current.material as THREE.MeshStandardMaterial;
		const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
		mat.opacity = pulse;
		// Brighter when full AP, dimmer when partially spent
		mat.emissiveIntensity = maxAp > 0 ? 0.6 + (ap / maxAp) * 0.8 : 0.6;
	});

	return (
		<mesh
			ref={meshRef}
			position={[x * TILE_SIZE_M, RING_Y, z * TILE_SIZE_M]}
			rotation={[-Math.PI / 2, 0, 0]}
		>
			<ringGeometry args={[RING_INNER_RADIUS, RING_OUTER_RADIUS, 32]} />
			<meshStandardMaterial
				color={0x000000}
				emissive={READINESS_CYAN}
				emissiveIntensity={1.0}
				transparent
				opacity={0.5}
				depthWrite={false}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}

// ─── Mark III: Faction-color accent glow ────────────────────────────────────

function MarkAccentGlow({
	x,
	z,
	factionColor,
	markLevel,
}: {
	x: number;
	z: number;
	factionColor: number;
	markLevel: number;
}) {
	// Intensity increases at Mark V
	const intensity = markLevel >= 5 ? 2.5 : 1.5;

	return (
		<pointLight
			position={[x * TILE_SIZE_M, 1.2, z * TILE_SIZE_M]}
			color={factionColor}
			intensity={intensity}
			distance={TILE_SIZE_M * 2.5}
			decay={2}
		/>
	);
}

// ─── Mark IV: Orbiting particle trail ──────────────────────────────────────

const PARTICLE_COUNT = 6;

/** Shared geometry for particle trail — created once, reused. */
function useParticleGeometry() {
	return useMemo(() => {
		const positions = new Float32Array(PARTICLE_COUNT * 3);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		return geo;
	}, []);
}

function MarkParticleTrail({
	x,
	z,
	factionColor,
}: {
	x: number;
	z: number;
	factionColor: number;
}) {
	const pointsRef = useRef<THREE.Points>(null);
	const geo = useParticleGeometry();

	useFrame((state) => {
		if (!pointsRef.current) return;
		const t = state.clock.elapsedTime;
		const positions = geo.attributes.position!.array as Float32Array;
		const cx = x * TILE_SIZE_M;
		const cz = z * TILE_SIZE_M;

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + t * 1.2;
			const radius = TILE_SIZE_M * 0.5;
			const yBob = 0.8 + Math.sin(t * 2 + i * 1.3) * 0.3;
			positions[i * 3] = cx + Math.cos(angle) * radius;
			positions[i * 3 + 1] = yBob;
			positions[i * 3 + 2] = cz + Math.sin(angle) * radius;
		}
		geo.attributes.position!.needsUpdate = true;
	});

	return (
		<points ref={pointsRef} geometry={geo}>
			<pointsMaterial
				color={factionColor}
				size={0.08}
				transparent
				opacity={0.7}
				depthWrite={false}
				sizeAttenuation
			/>
		</points>
	);
}

// ─── Main renderer ───────────────────────────────────────────────────────────

type UnitRendererProps = {
	world: World;
};

interface UnitSnapshot {
	eid: number;
	tileX: number;
	tileZ: number;
	factionId: string;
	url: string;
	color: number;
	/** Current AP — drives readiness glow ring. */
	ap: number;
	maxAp: number;
	/** Mark level 1-5 — drives visual effects at III+. */
	markLevel: number;
}

export function UnitRenderer({ world }: UnitRendererProps) {
	// Rebuild unit list each frame would be expensive — rebuild on key changes
	// For now, rebuild every 200ms (units don't move that often in turn-based)
	const unitsRef = useRef<UnitSnapshot[]>([]);
	const lastUpdate = useRef(0);

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastUpdate.current < 0.2) return;
		lastUpdate.current = now;

		const explored = buildExploredSet(world);
		const units: UnitSnapshot[] = [];

		for (const entity of world.query(UnitPos, UnitFaction, UnitVisual)) {
			const pos = entity.get(UnitPos);
			const faction = entity.get(UnitFaction);
			const visual = entity.get(UnitVisual);
			if (!pos || !faction || !visual) continue;

			// Fog gate — hide enemy units on unexplored tiles
			if (faction.factionId !== "player" && !isTileExplored(explored, pos.tileX, pos.tileZ)) continue;

			// Use move destination if in motion
			let x = pos.tileX;
			let z = pos.tileZ;
			if (entity.has(UnitMove)) {
				const move = entity.get(UnitMove);
				if (move) {
					const t = move.progress;
					x = move.fromX + (move.toX - move.fromX) * t;
					z = move.fromZ + (move.toZ - move.fromZ) * t;
				}
			}

			// Read AP for readiness glow
			const stats = entity.get(UnitStats);
			const ap = stats?.ap ?? 0;
			const maxAp = stats?.maxAp ?? 0;

			// Read mark level for visual effects
			let markLevel = 1;
			if (entity.has(UnitXP)) {
				const xpData = entity.get(UnitXP);
				if (xpData) markLevel = xpData.markLevel;
			}

			units.push({
				eid: entity.id(),
				tileX: x,
				tileZ: z,
				factionId: faction.factionId,
				url: resolveRobotModelUrl(visual.modelId),
				color: FACTION_COLORS[faction.factionId] ?? 0x888888,
				ap,
				maxAp,
				markLevel,
			});
		}

		unitsRef.current = units;
	});

	// Render from latest snapshot
	const units = unitsRef.current;

	return (
		<>
			{units.map((u) => {
				// Mark V: 15% scale increase
				const markScale = u.markLevel >= 5 ? 1.15 : 1.0;

				return (
					<Suspense key={u.eid} fallback={<UnitBox x={u.tileX} z={u.tileZ} color={u.color} />}>
						<UnitModel url={u.url} x={u.tileX} z={u.tileZ} factionColor={u.color} markScale={markScale} />
						{u.ap > 0 && (
							<ReadinessRing
								x={u.tileX}
								z={u.tileZ}
								ap={u.ap}
								maxAp={u.maxAp}
							/>
						)}
						{/* Mark III+: Faction-color accent glow */}
						{u.markLevel >= 3 && (
							<MarkAccentGlow
								x={u.tileX}
								z={u.tileZ}
								factionColor={u.color}
								markLevel={u.markLevel}
							/>
						)}
						{/* Mark IV+: Orbiting particle trail */}
						{u.markLevel >= 4 && (
							<MarkParticleTrail
								x={u.tileX}
								z={u.tileZ}
								factionColor={u.color}
							/>
						)}
					</Suspense>
				);
			})}
		</>
	);
}
