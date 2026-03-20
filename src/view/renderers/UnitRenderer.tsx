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
import { playSfx } from "../../audio";
import { ELEVATION_STEP_M, TILE_SIZE_M } from "../../board";
import {
	FACTION_COLORS,
	getAllRobotModelUrls,
	isUnitDetected,
	resolveRobotModelUrl,
	sphereModelPlacement,
} from "../../rendering";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../../traits";
import { ModelErrorBoundary } from "../ModelErrorBoundary";

// Lazy preload to avoid circular dep at module init
let _robotPreloaded = false;
function ensureRobotModelsPreloaded() {
	if (_robotPreloaded) return;
	_robotPreloaded = true;
	for (const url of getAllRobotModelUrls()) {
		useGLTF.preload(url);
	}
}

// ─── Single unit model ───────────────────────────────────────────────────────

// Faction tint REMOVED — models render with their original textures.
// Faction identity is shown via the translucent ground disc (FactionDisc).

function UnitModel({
	url,
	x,
	z,
	elevationY = 0,
	factionColor,
	markScale,
	isSelected,
	isCult,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	url: string;
	x: number;
	z: number;
	elevationY?: number;
	factionColor: number;
	markScale: number;
	isSelected?: boolean;
	isCult?: boolean;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const { scene } = useGLTF(url);
	const groupRef = useRef<THREE.Group>(null);
	const cloneRef = useRef<THREE.Group>(null);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 1.4) / maxExtent : 1;
		return { scale: s * markScale, yOffset: -box.min.y * s * markScale };
	}, [scene, markScale]);

	// Wall-E style procedural animation — bounce + wiggle, no Blender needed
	useFrame((state) => {
		if (!cloneRef.current) return;
		const t = state.clock.elapsedTime;
		// Unique phase offset per unit so they don't all bob in sync
		const phase = (x * 13.7 + z * 7.3) % (Math.PI * 2);

		if (isCult) {
			// Cult units: erratic jitter — unsettling, alien movement
			const jitterY =
				Math.sin(t * 8 + phase) * 0.03 + Math.sin(t * 13 + phase * 2) * 0.02;
			const jitterRot = Math.sin(t * 6 + phase) * 0.05;
			cloneRef.current.position.y += jitterY;
			cloneRef.current.rotation.z = jitterRot;
		} else if (isSelected) {
			// Selected: faster, more energetic bob — "ready for orders"
			const bob = Math.sin(t * 4 + phase) * 0.06;
			const wiggle = Math.sin(t * 3 + phase) * 0.03;
			cloneRef.current.position.y += bob;
			cloneRef.current.rotation.y += wiggle;
		} else {
			// Idle: gentle bob — alive, breathing, Wall-E style
			const bob = Math.sin(t * 1.5 + phase) * 0.03;
			const tilt = Math.sin(t * 0.8 + phase * 0.5) * 0.015;
			cloneRef.current.position.y += bob;
			cloneRef.current.rotation.z = tilt;
		}
	});

	if (useSphere && boardWidth && boardHeight) {
		const sp = sphereModelPlacement(
			x,
			z,
			boardWidth,
			boardHeight,
			yOffset + elevationY + 0.1,
		);
		return (
			<group ref={groupRef}>
				<Clone
					ref={cloneRef}
					object={scene}
					position={sp.position}
					quaternion={sp.quaternion}
					scale={scale}
					castShadow
				/>
			</group>
		);
	}

	return (
		<group ref={groupRef}>
			<Clone
				ref={cloneRef}
				object={scene}
				position={[
					x * TILE_SIZE_M,
					yOffset + elevationY + 0.1,
					z * TILE_SIZE_M,
				]}
				scale={scale}
				castShadow
			/>
		</group>
	);
}

// ─── Fallback box mesh for units when GLB fails ─────────────────────────────

function UnitBox({
	x,
	z,
	color,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	x: number;
	z: number;
	color: number;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const pos: [number, number, number] =
		useSphere && boardWidth && boardHeight
			? sphereModelPlacement(x, z, boardWidth, boardHeight, 0.5).position
			: [x * TILE_SIZE_M, 0.5, z * TILE_SIZE_M];
	return (
		<mesh position={pos} castShadow>
			<boxGeometry args={[0.8, 1.0, 0.8]} />
			<meshStandardMaterial
				color={color}
				emissive={color}
				emissiveIntensity={0.3}
			/>
		</mesh>
	);
}

// ─── Faction disc — translucent emissive circle under each unit ──────────────
//
// Shows faction color as a glowing ground disc. Visible on hover/select.
// HP segments at the top arc, specialty bar at the bottom arc.
// Always-visible at low opacity; full opacity + HP bars on hover/select.

const DISC_RADIUS = TILE_SIZE_M * 0.6;
const DISC_Y = 0.04; // just above terrain surface

/** HP bar color — green when healthy, red when critical. */
const HP_HIGH = 0x44ff88;
const HP_LOW = 0xff4444;

/**
 * Faction identity disc with HP indicator.
 * - Always visible at low opacity (faction identification at a glance)
 * - Brightens on selection with HP segments shown
 */
function FactionDisc({
	x,
	z,
	factionColor,
	hp,
	maxHp,
	isSelected,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	x: number;
	z: number;
	factionColor: number;
	hp: number;
	maxHp: number;
	isSelected?: boolean;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const discRef = useRef<THREE.Mesh>(null);
	const hpRef = useRef<THREE.Mesh>(null);

	// HP ratio determines arc coverage and color
	const hpRatio = maxHp > 0 ? hp / maxHp : 1;
	// HP arc: full circle at top, shrinks as HP drops
	const hpArc = hpRatio * Math.PI * 2;
	const hpColor = hpRatio > 0.5 ? HP_HIGH : HP_LOW;

	// Animate opacity — low idle glow, brighter when selected
	useFrame((state) => {
		if (!discRef.current) return;
		const mat = discRef.current.material as THREE.MeshStandardMaterial;
		const t = state.clock.elapsedTime;
		const pulse = Math.sin(t * 2) * 0.05;

		if (isSelected) {
			mat.opacity = 0.5 + pulse;
			mat.emissiveIntensity = 1.2;
		} else {
			mat.opacity = 0.2 + pulse;
			mat.emissiveIntensity = 0.6;
		}

		// HP ring always visible when selected
		if (hpRef.current) {
			const hpMat = hpRef.current.material as THREE.MeshStandardMaterial;
			hpMat.opacity = isSelected ? 0.8 : 0;
		}
	});

	const sp =
		useSphere && boardWidth && boardHeight
			? sphereModelPlacement(x, z, boardWidth, boardHeight, DISC_Y)
			: null;

	const pos: [number, number, number] = sp
		? sp.position
		: [x * TILE_SIZE_M, DISC_Y, z * TILE_SIZE_M];
	const quat = sp ? sp.quaternion : undefined;
	const rot: [number, number, number] | undefined = sp
		? undefined
		: [-Math.PI / 2, 0, 0];

	return (
		<group>
			{/* Base faction disc — translucent circle with faction color */}
			<mesh
				ref={discRef}
				position={pos}
				quaternion={quat}
				rotation={rot}
				renderOrder={10}
			>
				<circleGeometry args={[DISC_RADIUS, 32]} />
				<meshStandardMaterial
					color={0x000000}
					emissive={factionColor}
					emissiveIntensity={0.6}
					transparent
					opacity={0.2}
					depthWrite={false}
					depthTest={false}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* HP arc — top half, shrinks as HP drops, green→red */}
			<mesh
				ref={hpRef}
				position={pos}
				quaternion={quat}
				rotation={rot}
				renderOrder={11}
			>
				<ringGeometry
					args={[
						DISC_RADIUS * 0.85,
						DISC_RADIUS * 0.95,
						24,
						1,
						Math.PI / 2 - hpArc / 2, // start at top, centered
						hpArc,
					]}
				/>
				<meshStandardMaterial
					color={0x000000}
					emissive={hpColor}
					emissiveIntensity={1.5}
					transparent
					opacity={0}
					depthWrite={false}
					depthTest={false}
					side={THREE.DoubleSide}
				/>
			</mesh>
		</group>
	);
}

// ─── Mark III: Faction-color accent glow ────────────────────────────────────

function MarkAccentGlow({
	x,
	z,
	factionColor,
	markLevel,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	x: number;
	z: number;
	factionColor: number;
	markLevel: number;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	// Intensity increases at Mark V
	const intensity = markLevel >= 5 ? 2.5 : 1.5;

	const pos: [number, number, number] =
		useSphere && boardWidth && boardHeight
			? sphereModelPlacement(x, z, boardWidth, boardHeight, 1.2).position
			: [x * TILE_SIZE_M, 1.2, z * TILE_SIZE_M];

	return (
		<pointLight
			position={pos}
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
	useSphere,
	boardWidth,
	boardHeight,
}: {
	x: number;
	z: number;
	factionColor: number;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const pointsRef = useRef<THREE.Points>(null);
	const geo = useParticleGeometry();

	useFrame((state) => {
		if (!pointsRef.current) return;
		const t = state.clock.elapsedTime;
		const positions = geo.attributes.position!.array as Float32Array;

		if (useSphere && boardWidth && boardHeight) {
			// On sphere: orbit particles around the sphere-surface center point
			const center = sphereModelPlacement(
				x,
				z,
				boardWidth,
				boardHeight,
				0,
			).position;
			const normal = new THREE.Vector3(...center).normalize();
			// Build tangent frame on sphere surface
			const tangent = new THREE.Vector3(-normal.z, 0, normal.x).normalize();
			if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
			const bitangent = new THREE.Vector3().crossVectors(normal, tangent);

			for (let i = 0; i < PARTICLE_COUNT; i++) {
				const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + t * 1.2;
				const orbitR = TILE_SIZE_M * 0.5;
				const heightOffset = 0.8 + Math.sin(t * 2 + i * 1.3) * 0.3;
				const px =
					center[0] +
					tangent.x * Math.cos(angle) * orbitR +
					bitangent.x * Math.sin(angle) * orbitR +
					normal.x * heightOffset;
				const py =
					center[1] +
					tangent.y * Math.cos(angle) * orbitR +
					bitangent.y * Math.sin(angle) * orbitR +
					normal.y * heightOffset;
				const pz =
					center[2] +
					tangent.z * Math.cos(angle) * orbitR +
					bitangent.z * Math.sin(angle) * orbitR +
					normal.z * heightOffset;
				positions[i * 3] = px;
				positions[i * 3 + 1] = py;
				positions[i * 3 + 2] = pz;
			}
		} else {
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
	selectedUnitId?: number | null;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

interface UnitSnapshot {
	eid: number;
	tileX: number;
	tileZ: number;
	/** World-space Y offset from tile elevation (interpolated during ramp traversal). */
	elevationY: number;
	factionId: string;
	url: string;
	color: number;
	/** Current AP — drives readiness glow ring. */
	ap: number;
	maxAp: number;
	/** Current HP — drives faction disc HP arc. */
	hp: number;
	maxHp: number;
	/** Mark level 1-5 — drives visual effects at III+. */
	markLevel: number;
}

export function UnitRenderer({
	world,
	selectedUnitId,
	useSphere,
	boardWidth,
	boardHeight,
}: UnitRendererProps) {
	ensureRobotModelsPreloaded();
	// Rebuild unit list each frame would be expensive — rebuild on key changes
	// For now, rebuild every 200ms (units don't move that often in turn-based)
	const unitsRef = useRef<UnitSnapshot[]>([]);
	const lastUpdate = useRef(0);

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastUpdate.current < 0.2) return;
		lastUpdate.current = now;

		// Collect player unit positions + scan ranges for unit detection
		const playerScanners: Array<{ x: number; z: number; range: number }> = [];
		for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
			const f = e.get(UnitFaction);
			if (!f || (f.factionId !== "player" && f.factionId !== "")) continue;
			const p = e.get(UnitPos);
			const s = e.get(UnitStats);
			if (!p || !s) continue;
			playerScanners.push({ x: p.tileX, z: p.tileZ, range: s.scanRange });
		}

		const units: UnitSnapshot[] = [];

		for (const entity of world.query(UnitPos, UnitFaction, UnitVisual)) {
			const pos = entity.get(UnitPos);
			const faction = entity.get(UnitFaction);
			const visual = entity.get(UnitVisual);
			if (!pos || !faction || !visual) continue;

			// Scan range gate — hide enemy units not within any player unit's scan range
			if (
				faction.factionId !== "player" &&
				faction.factionId !== "" &&
				!isUnitDetected(pos.tileX, pos.tileZ, playerScanners)
			)
				continue;

			// Use move destination if in motion — interpolate X, Z, and elevation Y
			let x = pos.tileX;
			let z = pos.tileZ;
			let elevationY = 0;
			if (entity.has(UnitMove)) {
				const move = entity.get(UnitMove);
				if (move) {
					const t = move.progress;
					x = move.fromX + (move.toX - move.fromX) * t;
					z = move.fromZ + (move.toZ - move.fromZ) * t;
					// Interpolate Y based on elevation difference between source and destination
					const fromY = move.fromElevation * ELEVATION_STEP_M;
					const toY = move.toElevation * ELEVATION_STEP_M;
					elevationY = fromY + (toY - fromY) * t;
				}
			}

			// Read AP and HP for faction disc
			const stats = entity.get(UnitStats);
			const ap = stats?.ap ?? 0;
			const maxAp = stats?.maxAp ?? 0;
			const hp = stats?.hp ?? 10;
			const maxHp = stats?.maxHp ?? 10;

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
				elevationY,
				factionId: faction.factionId,
				url: resolveRobotModelUrl(visual.modelId),
				color: FACTION_COLORS[faction.factionId] ?? 0x888888,
				ap,
				maxAp,
				hp,
				maxHp,
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
					<ModelErrorBoundary key={u.eid} name={u.url}>
						<Suspense
							fallback={
								<UnitBox
									x={u.tileX}
									z={u.tileZ}
									color={u.color}
									useSphere={useSphere}
									boardWidth={boardWidth}
									boardHeight={boardHeight}
								/>
							}
						>
							<UnitModel
								url={u.url}
								x={u.tileX}
								z={u.tileZ}
								elevationY={u.elevationY}
								factionColor={u.color}
								markScale={markScale}
								isCult={
									u.factionId.startsWith("static_") ||
									u.factionId.startsWith("null_") ||
									u.factionId.startsWith("lost_")
								}
								useSphere={useSphere}
								boardWidth={boardWidth}
								boardHeight={boardHeight}
							/>
							<FactionDisc
								x={u.tileX}
								z={u.tileZ}
								factionColor={u.color}
								hp={u.hp}
								maxHp={u.maxHp}
								isSelected={u.eid === selectedUnitId}
								useSphere={useSphere}
								boardWidth={boardWidth}
								boardHeight={boardHeight}
							/>
							{/* Mark III+: Faction-color accent glow */}
							{u.markLevel >= 3 && (
								<MarkAccentGlow
									x={u.tileX}
									z={u.tileZ}
									factionColor={u.color}
									markLevel={u.markLevel}
									useSphere={useSphere}
									boardWidth={boardWidth}
									boardHeight={boardHeight}
								/>
							)}
							{/* Mark IV+: Orbiting particle trail */}
							{u.markLevel >= 4 && (
								<MarkParticleTrail
									x={u.tileX}
									z={u.tileZ}
									factionColor={u.color}
									useSphere={useSphere}
									boardWidth={boardWidth}
									boardHeight={boardHeight}
								/>
							)}
						</Suspense>
					</ModelErrorBoundary>
				);
			})}
		</>
	);
}
