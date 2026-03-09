/**
 * Renders all conveyor belts in the world.
 *
 * Each belt is a flat box with metallic side rails, a direction arrow,
 * and an animated scrolling surface. Carried items are shown as small
 * colored boxes interpolated along the belt based on itemProgress.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getTerrainHeight } from "../ecs/terrain";
import type { BeltDirection, Entity } from "../ecs/types";
import { belts } from "../ecs/world";

/** Direction rotation (Y-axis) for pointing arrows */
const DIRECTION_ROTATIONS: Record<BeltDirection, number> = {
	north: 0,
	south: Math.PI,
	east: Math.PI / 2,
	west: -Math.PI / 2,
};

/** Direction vectors for item interpolation */
const DIRECTION_VECTORS: Record<BeltDirection, { x: number; z: number }> = {
	north: { x: 0, z: -1 },
	south: { x: 0, z: 1 },
	east: { x: 1, z: 0 },
	west: { x: -1, z: 0 },
};

/** UV scroll direction (opposite of movement so texture appears to move with items) */
const UV_SCROLL_DIR: Record<BeltDirection, { u: number; v: number }> = {
	north: { u: 0, v: 1 },
	south: { u: 0, v: -1 },
	east: { u: -1, v: 0 },
	west: { u: 1, v: 0 },
};

/**
 * Arrow geometry — a simple triangle pointing in +Z, rotated per direction.
 */
function createArrowGeometry(): THREE.BufferGeometry {
	const shape = new THREE.Shape();
	shape.moveTo(0, 0.3);
	shape.lineTo(-0.2, -0.15);
	shape.lineTo(0.2, -0.15);
	shape.closePath();

	const geo = new THREE.ShapeGeometry(shape);
	// Rotate so it lies flat on XZ plane pointing -Z (north)
	geo.rotateX(-Math.PI / 2);
	return geo;
}

function BeltSegment({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const surfaceRef = useRef<THREE.Mesh>(null);
	const itemRef = useRef<THREE.Mesh>(null);

	const belt = entity.belt!;
	const pos = entity.worldPosition!;

	const arrowGeo = useMemo(() => createArrowGeometry(), []);

	const surfaceMaterial = useMemo(() => {
		const mat = new THREE.MeshStandardMaterial({
			color: 0x333333,
			metalness: 0.7,
			roughness: 0.4,
		});
		return mat;
	}, []);

	const rotation = DIRECTION_ROTATIONS[belt.direction];
	const scrollDir = UV_SCROLL_DIR[belt.direction];

	useFrame((_state, delta) => {
		if (!groupRef.current) return;

		// Position the belt at terrain height
		const y = getTerrainHeight(pos.x, pos.z);
		groupRef.current.position.set(pos.x, y, pos.z);

		// Animate UV offset for scrolling surface effect
		if (surfaceMaterial.map) {
			surfaceMaterial.map.offset.x += scrollDir.u * belt.speed * delta * 0.5;
			surfaceMaterial.map.offset.y += scrollDir.v * belt.speed * delta * 0.5;
		}

		// Update carried item position
		if (itemRef.current) {
			if (belt.carrying !== null) {
				itemRef.current.visible = true;
				const dir = DIRECTION_VECTORS[belt.direction];
				// Interpolate from -0.5 to +0.5 along direction
				const offset = belt.itemProgress - 0.5;
				itemRef.current.position.set(dir.x * offset, 0.15, dir.z * offset);
			} else {
				itemRef.current.visible = false;
			}
		}
	});

	return (
		<group ref={groupRef}>
			{/* Belt surface */}
			<mesh ref={surfaceRef} position={[0, 0.05, 0]} material={surfaceMaterial}>
				<boxGeometry args={[1, 0.1, 1]} />
			</mesh>

			{/* Left rail */}
			<mesh position={[-0.45, 0.1, 0]}>
				<boxGeometry args={[0.1, 0.1, 1]} />
				<meshStandardMaterial
					color={0x666666}
					metalness={0.8}
					roughness={0.3}
				/>
			</mesh>

			{/* Right rail */}
			<mesh position={[0.45, 0.1, 0]}>
				<boxGeometry args={[0.1, 0.1, 1]} />
				<meshStandardMaterial
					color={0x666666}
					metalness={0.8}
					roughness={0.3}
				/>
			</mesh>

			{/* Direction arrow */}
			<mesh
				geometry={arrowGeo}
				position={[0, 0.12, 0]}
				rotation={[0, rotation, 0]}
			>
				<meshBasicMaterial color={0x00ffaa} />
			</mesh>

			{/* Carried item (hidden when not carrying) */}
			<mesh ref={itemRef} position={[0, 0.15, 0]} visible={false}>
				<boxGeometry args={[0.3, 0.2, 0.3]} />
				<meshStandardMaterial color={0xffaa33} emissive={0x331100} />
			</mesh>
		</group>
	);
}

export function BeltRenderer() {
	const [beltCount, setBeltCount] = useState(0);

	useFrame(() => {
		// Track belt count to trigger re-render when belts are added/removed
		const currentCount = Array.from(belts).length;
		if (currentCount !== beltCount) {
			setBeltCount(currentCount);
		}
	});

	return (
		<>
			{Array.from(belts).map((entity) => (
				<BeltSegment key={entity.id} entity={entity} />
			))}
		</>
	);
}
