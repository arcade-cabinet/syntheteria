/**
 * OreDepositRenderer — renders ore deposit entities using PBR materials.
 *
 * Each deposit is a dodecahedron (organic rock shape) with PBR material
 * matching its ore type. Uses the same material resolution system as cubes
 * for visual consistency (scrap_iron cube came from a scrap_iron deposit).
 *
 * Deposits with zero quantity are rendered as depleted (darkened, shrunken).
 * Physics colliders are registered via the raw Rapier PhysicsWorld module.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { registerColliderEntity } from "../input/raycastUtils";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { getAllDeposits, type OreDepositData } from "../systems/oreSpawner";
import { resolveCubeMaterial } from "./materials/CubeMaterialProvider";

// ─── Constants ───────────────────────────────────────────────────────────

/** Base visual radius for deposits (scaled by colliderRadius) */
const BASE_SCALE = 0.8;

/** Depleted deposits shrink to this fraction of their original size */
const DEPLETED_SCALE = 0.3;

// ─── Depleted material cache ─────────────────────────────────────────────

const depletedMaterial = new THREE.MeshStandardMaterial({
	color: "#333333",
	roughness: 0.9,
	metalness: 0.1,
});

// ─── Physics collider registration ───────────────────────────────────────

const registeredColliders = new Set<string>();

function ensureCollider(deposit: OreDepositData): void {
	if (registeredColliders.has(deposit.id)) return;
	if (!isPhysicsInitialized()) return;

	const r = deposit.colliderRadius;
	const yCenter = deposit.position.y + r * 0.5;

	const collider = addStaticBox(
		deposit.position.x,
		yCenter,
		deposit.position.z,
		r,
		r * 0.7,
		r,
	);

	if (collider) {
		registerColliderEntity(collider.handle, deposit.id);
	}

	registeredColliders.add(deposit.id);
}

// ─── Shared geometry ─────────────────────────────────────────────────────

let sharedGeo: THREE.DodecahedronGeometry | null = null;

function getDodecahedronGeo(): THREE.DodecahedronGeometry {
	if (!sharedGeo) {
		sharedGeo = new THREE.DodecahedronGeometry(1, 1);
	}
	return sharedGeo;
}

// ─── Individual deposit mesh ─────────────────────────────────────────────

function DepositMesh({ deposit }: { deposit: OreDepositData }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const depleted = deposit.quantity <= 0;
	const scale = depleted
		? deposit.colliderRadius * DEPLETED_SCALE
		: deposit.colliderRadius * BASE_SCALE;

	// Resolve PBR material for this ore type (falls back to flat color if textures unavailable)
	const material = depleted
		? depletedMaterial
		: resolveCubeMaterial(deposit.type);

	useFrame(() => {
		ensureCollider(deposit);
	});

	const yPos = deposit.position.y + deposit.colliderRadius * 0.5;

	return (
		<mesh
			ref={meshRef}
			position={[deposit.position.x, yPos, deposit.position.z]}
			scale={[scale, scale * 0.7, scale]}
			geometry={getDodecahedronGeo()}
			material={material}
			userData={{
				entityId: deposit.id,
				entityType: "oreDeposit",
			}}
			castShadow
			receiveShadow
		/>
	);
}

// ─── Main renderer ───────────────────────────────────────────────────────

export function OreDepositRenderer() {
	const [snapshots, setSnapshots] = useState<OreDepositData[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const deposits = getAllDeposits();

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
