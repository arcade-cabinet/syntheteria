/**
 * Renders all wire entities as catenary curves (hanging cables) with
 * power-state-aware visual feedback.
 *
 * Power state visuals:
 *   - Powered: glowing blue/electric color with subtle pulse animation
 *   - Unpowered: dark grey, no animation
 *   - Overloaded (load > 0.9): red flicker + spark particles
 *
 * Signal wires: blue, thinner, independent of power state.
 *
 * Also renders a ghost wire preview during wire build mode.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Entity } from "../ecs/types";
import { wires, world } from "../ecs/world";
import { getWireFlow } from "../systems/powerRouting";
import { getWirePreview } from "../systems/wireBuilder";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

// Power wire colors by state
const COLOR_POWERED = new THREE.Color(0x4488ff); // electric blue
const COLOR_UNPOWERED = new THREE.Color(0x444444); // dark grey
const COLOR_OVERLOADED = new THREE.Color(0xff3322); // angry red
const COLOR_SIGNAL = new THREE.Color(0x4488ff); // signal blue

// Ghost wire colors
const COLOR_GHOST_VALID = new THREE.Color(0x00ff88); // green
const COLOR_GHOST_INVALID = new THREE.Color(0xff4444); // red

const POWER_RADIUS = 0.04;
const SIGNAL_RADIUS = 0.02;
const GHOST_RADIUS = 0.025;
const CATENARY_SEGMENTS = 20;
const SPARK_COUNT = 4;

/** Power flow threshold above which a wire is considered "carrying power" */
const POWERED_THRESHOLD = 0.05;
/** Load ratio above which a wire is considered "overloaded" */
const OVERLOAD_THRESHOLD = 0.9;

// Reusable color objects to avoid allocations in render loop
const _workingColor = new THREE.Color();

// ---------------------------------------------------------------------------
// Catenary curve
// ---------------------------------------------------------------------------

/**
 * Generate catenary curve points between two 3D positions.
 * Uses a parabolic approximation for the sag.
 */
function buildCatenaryPoints(
	from: THREE.Vector3,
	to: THREE.Vector3,
	sagAmount: number,
): THREE.Vector3[] {
	const points: THREE.Vector3[] = [];
	for (let i = 0; i <= CATENARY_SEGMENTS; i++) {
		const t = i / CATENARY_SEGMENTS;
		const x = THREE.MathUtils.lerp(from.x, to.x, t);
		const y = THREE.MathUtils.lerp(from.y, to.y, t);
		const z = THREE.MathUtils.lerp(from.z, to.z, t);
		// Parabolic sag: maximum at t=0.5, zero at endpoints
		const sag = -sagAmount * 4 * t * (1 - t);
		points.push(new THREE.Vector3(x, y + sag, z));
	}
	return points;
}

// ---------------------------------------------------------------------------
// Wire mesh component
// ---------------------------------------------------------------------------

function WireMesh({
	wireEntity,
}: {
	wireEntity: Entity & Required<Pick<Entity, "wire">>;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);

	const isPower = wireEntity.wire.wireType === "power";
	const radius = isPower ? POWER_RADIUS : SIGNAL_RADIUS;

	// Material that updates based on power state
	const materialRef = useRef<THREE.MeshStandardMaterial>(null);

	// Spark positions (reused each frame)
	const sparkPositions = useMemo(() => {
		return Array.from({ length: SPARK_COUNT }, () => new THREE.Vector3());
	}, []);

	// Cache last endpoint positions to avoid rebuilding geometry every frame
	const lastFromRef = useRef({ x: NaN, y: NaN, z: NaN });
	const lastToRef = useRef({ x: NaN, y: NaN, z: NaN });
	const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

	useFrame((state) => {
		const fromEntity = getEntityById(wireEntity.wire.fromEntityId);
		const toEntity = getEntityById(wireEntity.wire.toEntityId);

		if (
			!fromEntity?.worldPosition ||
			!toEntity?.worldPosition ||
			!meshRef.current
		) {
			if (meshRef.current) meshRef.current.visible = false;
			return;
		}

		const fx = fromEntity.worldPosition.x;
		const fy = fromEntity.worldPosition.y + 0.8;
		const fz = fromEntity.worldPosition.z;
		const tx = toEntity.worldPosition.x;
		const ty = toEntity.worldPosition.y + 0.8;
		const tz = toEntity.worldPosition.z;

		// Only rebuild geometry when endpoints have actually moved
		const lf = lastFromRef.current;
		const lt = lastToRef.current;
		const endpointsChanged =
			lf.x !== fx || lf.y !== fy || lf.z !== fz ||
			lt.x !== tx || lt.y !== ty || lt.z !== tz;

		if (endpointsChanged) {
			lf.x = fx; lf.y = fy; lf.z = fz;
			lt.x = tx; lt.y = ty; lt.z = tz;

			const from = new THREE.Vector3(fx, fy, fz);
			const to = new THREE.Vector3(tx, ty, tz);
			const length = from.distanceTo(to);
			const sagAmount = length * 0.15;
			const points = buildCatenaryPoints(from, to, sagAmount);
			curveRef.current = new THREE.CatmullRomCurve3(points);

			// Replace geometry
			const oldGeometry = meshRef.current.geometry;
			meshRef.current.geometry = new THREE.TubeGeometry(
				curveRef.current,
				CATENARY_SEGMENTS,
				radius,
				6,
				false,
			);
			oldGeometry.dispose();
		}

		meshRef.current.visible = true;

		// Determine power state for visual feedback
		const load = wireEntity.wire.currentLoad;
		const flow = isPower ? getWireFlow(wireEntity.id) : 0;

		if (materialRef.current) {
			const mat = materialRef.current;
			const elapsed = state.clock.elapsedTime;

			if (!isPower) {
				// Signal wires: static blue appearance, brightness from load
				mat.color.copy(COLOR_SIGNAL);
				mat.emissive.copy(COLOR_SIGNAL);
				mat.emissiveIntensity = load * 0.6;
			} else if (load > OVERLOAD_THRESHOLD) {
				// Overloaded: red flicker
				const flicker = 0.5 + 0.5 * Math.sin(elapsed * 12);
				_workingColor.copy(COLOR_OVERLOADED);
				mat.color.copy(_workingColor);
				mat.emissive.copy(_workingColor);
				mat.emissiveIntensity = 0.6 + flicker * 0.8;
			} else if (flow > POWERED_THRESHOLD) {
				// Powered: electric blue with subtle pulse
				const pulse = 0.3 + 0.15 * Math.sin(elapsed * 3);
				_workingColor.copy(COLOR_POWERED);
				mat.color.copy(_workingColor);
				mat.emissive.copy(_workingColor);
				mat.emissiveIntensity = pulse + load * 0.4;
			} else {
				// Unpowered: dark grey, no glow
				mat.color.copy(COLOR_UNPOWERED);
				mat.emissive.copy(COLOR_UNPOWERED);
				mat.emissiveIntensity = 0;
			}
		}

		// Spark particles when overloaded
		const overloaded = load > OVERLOAD_THRESHOLD;
		for (let i = 0; i < SPARK_COUNT; i++) {
			const sparkMesh = sparkRefs.current[i];
			if (!sparkMesh) continue;

			if (overloaded && curveRef.current) {
				// Place spark at random point along the curve
				const t = Math.random();
				const pos = curveRef.current.getPointAt(t);
				// Small random offset for visual variety
				pos.x += (Math.random() - 0.5) * 0.15;
				pos.y += (Math.random() - 0.5) * 0.15;
				pos.z += (Math.random() - 0.5) * 0.15;
				sparkMesh.position.copy(pos);
				sparkMesh.visible = Math.random() > 0.3; // Flicker effect
			} else {
				sparkMesh.visible = false;
			}
		}
	});

	return (
		<group>
			<mesh ref={meshRef}>
				<boxGeometry args={[0, 0, 0]} />
				<meshStandardMaterial
					ref={materialRef}
					color={COLOR_UNPOWERED}
					emissive={COLOR_UNPOWERED}
					emissiveIntensity={0}
					roughness={0.6}
					metalness={0.4}
				/>
			</mesh>
			{/* Spark particles for overloaded wires */}
			{sparkPositions.map((_, i) => (
				<mesh
					key={i}
					ref={(el) => {
						sparkRefs.current[i] = el;
					}}
					visible={false}
				>
					<sphereGeometry args={[0.03, 4, 4]} />
					<meshStandardMaterial
						color={0xffdd88}
						emissive={0xff4422}
						emissiveIntensity={2}
					/>
				</mesh>
			))}
		</group>
	);
}

// ---------------------------------------------------------------------------
// Ghost wire preview (shown during wire build mode)
// ---------------------------------------------------------------------------

function GhostWire() {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef<THREE.MeshStandardMaterial>(null);
	const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
	const lastFromRef = useRef({ x: NaN, y: NaN, z: NaN });
	const lastToRef = useRef({ x: NaN, y: NaN, z: NaN });
	const lastValid = useRef<boolean | null>(null);

	useFrame((state) => {
		const preview = getWirePreview();

		if (!preview || !meshRef.current) {
			if (meshRef.current) meshRef.current.visible = false;
			return;
		}

		const fx = preview.fromPosition.x;
		const fy = preview.fromPosition.y + 0.8;
		const fz = preview.fromPosition.z;
		const tx = preview.toPosition.x;
		const ty = preview.toPosition.y + 0.8;
		const tz = preview.toPosition.z;

		// Rebuild geometry when preview positions change
		const lf = lastFromRef.current;
		const lt = lastToRef.current;
		const changed =
			lf.x !== fx || lf.y !== fy || lf.z !== fz ||
			lt.x !== tx || lt.y !== ty || lt.z !== tz;

		if (changed) {
			lf.x = fx; lf.y = fy; lf.z = fz;
			lt.x = tx; lt.y = ty; lt.z = tz;

			const from = new THREE.Vector3(fx, fy, fz);
			const to = new THREE.Vector3(tx, ty, tz);
			const length = from.distanceTo(to);
			const sagAmount = length * 0.15;
			const points = buildCatenaryPoints(from, to, sagAmount);
			curveRef.current = new THREE.CatmullRomCurve3(points);

			const oldGeometry = meshRef.current.geometry;
			meshRef.current.geometry = new THREE.TubeGeometry(
				curveRef.current,
				CATENARY_SEGMENTS,
				GHOST_RADIUS,
				6,
				false,
			);
			oldGeometry.dispose();
		}

		meshRef.current.visible = true;

		// Update color based on validity
		if (materialRef.current) {
			const mat = materialRef.current;
			const ghostColor = preview.valid ? COLOR_GHOST_VALID : COLOR_GHOST_INVALID;

			if (lastValid.current !== preview.valid) {
				mat.color.copy(ghostColor);
				mat.emissive.copy(ghostColor);
				lastValid.current = preview.valid;
			}

			// Pulse opacity for ghost effect
			const pulse = 0.3 + 0.2 * Math.sin(state.clock.elapsedTime * 4);
			mat.opacity = pulse;
			mat.emissiveIntensity = pulse * 1.5;
		}
	});

	return (
		<mesh ref={meshRef} visible={false}>
			<boxGeometry args={[0, 0, 0]} />
			<meshStandardMaterial
				ref={materialRef}
				color={COLOR_GHOST_VALID}
				emissive={COLOR_GHOST_VALID}
				emissiveIntensity={0.5}
				transparent
				opacity={0.5}
				roughness={0.4}
				metalness={0.2}
				depthWrite={false}
			/>
		</mesh>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function WireRenderer() {
	const groupRef = useRef<THREE.Group>(null);
	const wireEntitiesRef = useRef<(Entity & Required<Pick<Entity, "wire">>)[]>([]);
	const [, setWireVersion] = useState(0);

	// Periodically sync wire list into ref; bump version only when list changes
	useFrame(() => {
		const current = Array.from(wires) as (Entity & Required<Pick<Entity, "wire">>)[];
		const cached = wireEntitiesRef.current;

		// Quick length check first, then compare ids
		let changed = current.length !== cached.length;
		if (!changed) {
			for (let i = 0; i < current.length; i++) {
				if (current[i].id !== cached[i].id) {
					changed = true;
					break;
				}
			}
		}

		if (changed) {
			wireEntitiesRef.current = current;
			setWireVersion((v) => v + 1);
		}
	});

	return (
		<group ref={groupRef}>
			{wireEntitiesRef.current.map((wireEntity) => (
				<WireMesh
					key={wireEntity.id}
					wireEntity={wireEntity}
				/>
			))}
			<GhostWire />
		</group>
	);
}
