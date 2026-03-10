/**
 * OreDepositRenderer — renders ore deposit entities as sphere/rock meshes.
 *
 * Reads from oreSpawner.getAllDeposits() each frame and renders each deposit
 * as a dodecahedron with a material color matching the ORE_TYPE_CONFIGS.
 * The mesh has userData.entityId set for raycast selection by
 * ObjectSelectionSystem.
 *
 * Deposits with zero quantity are rendered as depleted (dark, small).
 * Physics colliders are registered via the raw Rapier PhysicsWorld module
 * (addStaticBox approximation — sphere collider not available in the
 * current API, so we use a box that roughly matches the deposit radius).
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { getAllDeposits, type OreDepositData } from "../systems/oreSpawner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base visual radius for deposits (scaled by colliderRadius) */
const BASE_SCALE = 0.8;

/** Depleted deposits shrink to this fraction of their original size */
const DEPLETED_SCALE = 0.3;

// ---------------------------------------------------------------------------
// Physics collider registration (one-time per deposit)
// ---------------------------------------------------------------------------

const registeredColliders = new Set<string>();

function ensureCollider(deposit: OreDepositData): void {
	if (registeredColliders.has(deposit.id)) return;
	if (!isPhysicsInitialized()) return;

	const r = deposit.colliderRadius;
	const yCenter = deposit.position.y + r * 0.5;

	// Approximate sphere collider with a cube of half-extents = radius
	addStaticBox(deposit.position.x, yCenter, deposit.position.z, r, r * 0.7, r);

	registeredColliders.add(deposit.id);
}

// ---------------------------------------------------------------------------
// Individual deposit mesh
// ---------------------------------------------------------------------------

interface DepositMeshProps {
	deposit: OreDepositData;
}

function DepositMesh({ deposit }: DepositMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const color = deposit.color;
	const depleted = deposit.quantity <= 0;
	const scale = depleted
		? deposit.colliderRadius * DEPLETED_SCALE
		: deposit.colliderRadius * BASE_SCALE;

	// Register physics collider on mount
	useEffect(() => {
		ensureCollider(deposit);
	}, [deposit]);

	const yPos = deposit.position.y + deposit.colliderRadius * 0.5;

	return (
		<mesh
			ref={meshRef}
			position={[deposit.position.x, yPos, deposit.position.z]}
			scale={[scale, scale * 0.7, scale]}
			userData={{
				entityId: deposit.id,
				entityType: "oreDeposit",
			}}
			castShadow
			receiveShadow
		>
			<dodecahedronGeometry args={[1, 1]} />
			<meshStandardMaterial
				color={depleted ? "#333333" : color}
				roughness={0.85}
				metalness={depleted ? 0.1 : 0.4}
				emissive={depleted ? "#000000" : color}
				emissiveIntensity={depleted ? 0 : 0.05}
			/>
		</mesh>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function OreDepositRenderer() {
	const [snapshots, setSnapshots] = useState<OreDepositData[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const deposits = getAllDeposits();

		// Build a hash to detect changes without re-rendering every frame
		const hash = deposits
			.map(
				(d) =>
					`${d.id}:${d.quantity.toFixed(0)}:${d.position.x.toFixed(1)},${d.position.z.toFixed(1)}`,
			)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setSnapshots([...deposits]);
		}
	});

	return (
		<>
			{snapshots.map((deposit) => (
				<DepositMesh key={deposit.id} deposit={deposit} />
			))}
		</>
	);
}
