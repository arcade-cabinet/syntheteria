/**
 * Renders all conveyor belts in the world using GLB conveyor models.
 *
 * Each belt segment uses the Kenney ConveyorKit `conveyor.glb` model,
 * rotated to match the belt direction. Carried items are shown as small
 * colored cubes interpolated along the belt surface.
 *
 * Belt tiers use different model variants:
 *   - basic: conveyor.glb (plain)
 *   - fast: conveyor-stripe.glb (striped marking)
 *   - express: conveyor-bars.glb (safety rails)
 *
 * Belt surface meshes (identified by name containing "belt" or "conveyor")
 * receive a procedural rubber texture from BeltMaterial.ts with animated
 * UV scrolling to convey motion. Rail/frame meshes keep the GLB's baked
 * materials.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getTerrainHeight } from "../ecs/terrain";
import type { BeltDirection, BeltTier, Entity } from "../ecs/types";
import { belts } from "../ecs/world";
import { createBeltMaterial, updateBeltUV } from "./materials/BeltMaterial";
import { resolveCubeMaterial } from "./materials/CubeMaterialProvider";

// ─── Model paths per tier ────────────────────────────────────────────────

const BELT_MODELS: Record<BeltTier, string> = {
	basic: "/models/conveyor/conveyor.glb",
	fast: "/models/conveyor/conveyor-stripe.glb",
	express: "/models/conveyor/conveyor-bars.glb",
};

/** Direction rotation (Y-axis) for pointing belt direction */
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

// ─── Belt segment with GLB model ─────────────────────────────────────────

/** Desired width of a belt segment in world units. */
const BELT_WORLD_SIZE = 1.0;

function computeBeltScale(scene: THREE.Object3D): number {
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const maxXZ = Math.max(size.x, size.z);
	return maxXZ > 0 ? BELT_WORLD_SIZE / maxXZ : 1;
}

function BeltSegment({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const itemRef = useRef<THREE.Mesh>(null);
	const elapsedRef = useRef(0);

	const belt = entity.belt!;
	const pos = entity.worldPosition!;
	const tier = belt.tier ?? "basic";

	const modelPath = BELT_MODELS[tier] ?? BELT_MODELS.basic;
	const { scene } = useGLTF(modelPath);

	const beltMaterial = useMemo(() => createBeltMaterial(), []);

	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeBeltScale(clone);
		clone.scale.setScalar(scale);
		// Apply scrolling belt material to the conveyor surface mesh
		clone.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				const name = child.name.toLowerCase();
				// Target the conveyor surface (not rails/frame). Common Kenney
				// ConveyorKit mesh names: "belt", "conveyor", or the largest mesh.
				if (name.includes("belt") || name.includes("conveyor")) {
					child.material = beltMaterial;
				}
			}
		});
		return clone;
	}, [scene, beltMaterial]);

	const rotation = DIRECTION_ROTATIONS[belt.direction];

	useFrame((_, delta) => {
		if (!groupRef.current) return;

		const y = getTerrainHeight(pos.x, pos.z);
		groupRef.current.position.set(pos.x, y, pos.z);

		// Animate belt surface scrolling
		elapsedRef.current += delta;
		updateBeltUV(beltMaterial, belt.speed ?? 1, elapsedRef.current);

		// Update carried item position
		if (itemRef.current) {
			if (belt.carrying !== null) {
				itemRef.current.visible = true;
				const dir = DIRECTION_VECTORS[belt.direction];
				const offset = belt.itemProgress - 0.5;
				itemRef.current.position.set(
					dir.x * offset,
					0.2,
					dir.z * offset,
				);
			} else {
				itemRef.current.visible = false;
			}
		}
	});

	// Resolve material for carried item
	const itemMaterial = belt.carrying
		? resolveCubeMaterial(belt.carrying)
		: undefined;

	return (
		<group ref={groupRef} rotation={[0, rotation, 0]}>
			<primitive object={cloned} />

			{/* Carried item (hidden when not carrying) */}
			<mesh
				ref={itemRef}
				position={[0, 0.2, 0]}
				visible={false}
				material={itemMaterial}
			>
				<boxGeometry args={[0.3, 0.2, 0.3]} />
			</mesh>
		</group>
	);
}

// ─── Main renderer ───────────────────────────────────────────────────────

export function BeltRenderer() {
	const [beltCount, setBeltCount] = useState(0);

	useFrame(() => {
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

// Preload all belt models
for (const path of Object.values(BELT_MODELS)) {
	useGLTF.preload(path);
}
