/**
 * Renders all wire entities as catenary curves (hanging cables).
 *
 * Power wires: amber/orange, thicker, glow when loaded.
 * Signal wires: blue, thinner.
 * Overloaded wires (currentLoad > 0.9) emit spark particles.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Entity } from "../ecs/types";
import { wires, world } from "../ecs/world";

/**
 * Find an entity by ID. Returns undefined if not found.
 */
function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

const COLOR_POWER = new THREE.Color(0xffaa44);
const COLOR_SIGNAL = new THREE.Color(0x4488ff);
const POWER_RADIUS = 0.04;
const SIGNAL_RADIUS = 0.02;
const CATENARY_SEGMENTS = 20;
const SPARK_COUNT = 4;

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

function WireMesh({
	wireEntity,
}: {
	wireEntity: Entity & Required<Pick<Entity, "wire">>;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);

	const isPower = wireEntity.wire.wireType === "power";
	const baseColor = isPower ? COLOR_POWER : COLOR_SIGNAL;
	const radius = isPower ? POWER_RADIUS : SIGNAL_RADIUS;

	// Material that updates emissive based on load
	const materialRef = useRef<THREE.MeshStandardMaterial>(null);

	// Spark positions (reused each frame)
	const sparkPositions = useMemo(() => {
		return Array.from({ length: SPARK_COUNT }, () => new THREE.Vector3());
	}, []);

	// Cache last endpoint positions to avoid rebuilding geometry every frame
	const lastFromRef = useRef({ x: NaN, y: NaN, z: NaN });
	const lastToRef = useRef({ x: NaN, y: NaN, z: NaN });
	const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

	useFrame(() => {
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

		// Update emissive based on load
		const load = wireEntity.wire.currentLoad;
		if (materialRef.current) {
			const emissiveIntensity = load * 0.8;
			materialRef.current.emissive.copy(baseColor);
			materialRef.current.emissiveIntensity = emissiveIntensity;
		}

		// Spark particles when overloaded
		const overloaded = load > 0.9;
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
					color={baseColor}
					emissive={baseColor}
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
						color={isPower ? 0xffdd88 : 0x88ccff}
						emissive={isPower ? 0xffaa44 : 0x4488ff}
						emissiveIntensity={2}
					/>
				</mesh>
			))}
		</group>
	);
}

export function WireRenderer() {
	const groupRef = useRef<THREE.Group>(null);
	const [wireCount, setWireCount] = useState(0);

	// Track wire count to trigger re-render when wires are added/removed
	useFrame(() => {
		const currentCount = Array.from(wires).length;
		if (currentCount !== wireCount) {
			setWireCount(currentCount);
		}
	});

	return (
		<group ref={groupRef}>
			{Array.from(wires).map((wireEntity) => (
				<WireMesh
					key={wireEntity.id}
					wireEntity={wireEntity as Entity & Required<Pick<Entity, "wire">>}
				/>
			))}
		</group>
	);
}
