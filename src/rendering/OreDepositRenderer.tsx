/**
 * OreDepositRenderer — renders ore deposit entities using OreDepositGenerator.
 *
 * Each deposit is rendered as a procedurally generated THREE.Group produced by
 * OreDepositGenerator. The generator returns type-specific shapes:
 *
 *   rock       — noise-displaced sphere boulders
 *   scrap_iron — panel fragments, bent chunks, broken machinery pieces
 *   copper     — oxidised host rock with emerging veins and patina patches
 *   silicon    — translucent octahedron/tetrahedron crystal clusters
 *   titanium   — dodecahedral/icosahedral faceted metallic chunks
 *   (others)   — rock fallback with type-appropriate materials
 *
 * Geometry caching: a THREE.Group is generated once per (oreType, size) pair
 * then deep-cloned for each entity instance — the same pattern used by
 * BuildingRenderer. This avoids re-running the generator every frame.
 *
 * Scale: getDepletionScale() shrinks the deposit mesh as ore is extracted,
 * providing visual feedback that the vein is being consumed.
 *
 * Physics colliders: registered once per entity via addStaticBox +
 * registerColliderEntity, lazy-initialised on the first frame after Rapier
 * is ready.
 *
 * Change detection: the deposit list is hashed each frame; React state only
 * updates when the hash changes to avoid re-rendering every frame.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { registerColliderEntity } from "../input/raycastUtils";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { getAllDeposits, type OreDepositData } from "../systems/oreSpawner";
import {
	disposeDepositGroup,
	generateOreDeposit,
	getDepletionScale,
	type DepositSize,
} from "./procgen/OreDepositGenerator";

// ---------------------------------------------------------------------------
// Depleted material (shared, stable reference)
// ---------------------------------------------------------------------------

const depletedMaterial = new THREE.MeshStandardMaterial({
	color: "#333333",
	roughness: 0.9,
	metalness: 0.1,
});

// ---------------------------------------------------------------------------
// Deposit size classification
// ---------------------------------------------------------------------------

/**
 * Map a collider radius to a DepositSize bucket.
 * Radii below 0.6 → small; 0.6–1.2 → medium; above → large.
 */
function classifySize(colliderRadius: number): DepositSize {
	if (colliderRadius < 0.6) return "small";
	if (colliderRadius < 1.2) return "medium";
	return "large";
}

// ---------------------------------------------------------------------------
// Geometry cache — shared THREE.Group per (oreType, size)
// ---------------------------------------------------------------------------

const groupCache = new Map<string, THREE.Group>();

function getCachedGroup(oreType: string, size: DepositSize): THREE.Group {
	const key = `${oreType}::${size}`;
	const cached = groupCache.get(key);
	if (cached) return cached;

	// Derive a stable seed from the cache key so the same ore type always
	// produces the same base shape, regardless of spawn order.
	let seed = 0;
	for (let i = 0; i < key.length; i++) {
		seed = ((seed << 5) - seed + key.charCodeAt(i)) | 0;
	}
	seed = Math.abs(seed);

	const group = generateOreDeposit(oreType, seed, size);
	groupCache.set(key, group);
	return group;
}

/**
 * Dispose all cached deposit groups and clear the cache.
 * Exported for use in tests and world-reset scenarios.
 */
export function clearDepositGeometryCache(): void {
	for (const group of groupCache.values()) {
		disposeDepositGroup(group);
	}
	groupCache.clear();
}

// ---------------------------------------------------------------------------
// Collider registry
// ---------------------------------------------------------------------------

const registeredColliders = new Set<string>();

function ensureCollider(deposit: OreDepositData): void {
	if (registeredColliders.has(deposit.id)) return;
	if (!isPhysicsInitialized()) return;

	const r = deposit.colliderRadius;
	// Centre the box collider mid-height so it sits on the ground plane.
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

/** Reset collider tracking. Exported for test cleanup. */
export function clearDepositColliderRegistry(): void {
	registeredColliders.clear();
}

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

interface DepositSnapshot {
	id: string;
	type: string;
	size: DepositSize;
	quantity: number;
	maxQuantity: number;
	colliderRadius: number;
	x: number;
	y: number;
	z: number;
}

function snapshotDeposit(deposit: OreDepositData): DepositSnapshot {
	return {
		id: deposit.id,
		type: deposit.type,
		size: classifySize(deposit.colliderRadius),
		quantity: deposit.quantity,
		// OreDepositData does not store maxQuantity; approximate from current
		// quantity (treated as full on first sight) using the collider radius
		// as a proxy. The depleted-scale curve handles all intermediate states
		// gracefully even if maxQuantity drifts.
		maxQuantity: deposit.quantity,
		colliderRadius: deposit.colliderRadius,
		x: deposit.position.x,
		y: deposit.position.y,
		z: deposit.position.z,
	};
}

// ---------------------------------------------------------------------------
// Max-quantity tracker (module-level — updated on first encounter per id)
// ---------------------------------------------------------------------------

/**
 * Tracks the maximum observed quantity for each deposit id.
 * Because OreDepositData has no maxQuantity field, we record the first
 * (largest) value we see so that getDepletionScale stays accurate.
 */
const maxQuantityById = new Map<string, number>();

function getMaxQuantity(id: string, currentQuantity: number): number {
	const stored = maxQuantityById.get(id);
	if (stored === undefined || currentQuantity > stored) {
		maxQuantityById.set(id, currentQuantity);
		return currentQuantity;
	}
	return stored;
}

/** Reset max-quantity tracking. Exported for test cleanup. */
export function clearDepositMaxQuantityTracking(): void {
	maxQuantityById.clear();
}

// ---------------------------------------------------------------------------
// Per-deposit mesh component
// ---------------------------------------------------------------------------

function DepositMesh({ deposit }: { deposit: OreDepositData }) {
	const groupRef = useRef<THREE.Group>(null);
	const depleted = deposit.quantity <= 0;

	// Build the cloned geometry group for this ore type+size combination.
	const cloned = useMemo(() => {
		if (depleted) return null;
		const size = classifySize(deposit.colliderRadius);
		const source = getCachedGroup(deposit.type, size);
		return source.clone(true);
	}, [deposit.type, deposit.colliderRadius, depleted]);

	useFrame(() => {
		ensureCollider(deposit);

		// Update visual scale to reflect depletion each frame.
		if (groupRef.current && !depleted) {
			const max = getMaxQuantity(deposit.id, deposit.quantity);
			const depScale = getDepletionScale(deposit.quantity, max);
			const base = deposit.colliderRadius;
			groupRef.current.scale.setScalar(base * depScale);
		}
	});

	const yPos = deposit.position.y;

	if (depleted) {
		// Depleted deposits: small shrunk placeholder so the player can see
		// the vein is exhausted (matches original renderer's depleted style).
		const depletedScale = deposit.colliderRadius * 0.3;
		return (
			<mesh
				position={[deposit.position.x, yPos + depletedScale * 0.35, deposit.position.z]}
				scale={[depletedScale, depletedScale * 0.5, depletedScale]}
				geometry={depletedDodecaGeo()}
				material={depletedMaterial}
				userData={{ entityId: deposit.id, entityType: "oreDeposit" }}
			/>
		);
	}

	// Active deposit: procedurally generated group via primitive.
	return (
		<group
			ref={groupRef}
			position={[deposit.position.x, yPos, deposit.position.z]}
			userData={{ entityId: deposit.id, entityType: "oreDeposit" }}
			castShadow
			receiveShadow
		>
			{cloned && <primitive object={cloned} />}
		</group>
	);
}

// Shared low-poly dodecahedron for depleted deposit placeholder.
let _depletedDodecaGeo: THREE.DodecahedronGeometry | null = null;
function depletedDodecaGeo(): THREE.DodecahedronGeometry {
	if (!_depletedDodecaGeo) {
		_depletedDodecaGeo = new THREE.DodecahedronGeometry(1, 0);
	}
	return _depletedDodecaGeo;
}

// ---------------------------------------------------------------------------
// Main renderer component
// ---------------------------------------------------------------------------

/**
 * Renders all ore deposit entities from oreSpawner using procedurally
 * generated geometry from OreDepositGenerator.
 *
 * Mount once inside the R3F <Canvas> in GameScene.
 */
export function OreDepositRenderer() {
	const [snapshots, setSnapshots] = useState<OreDepositData[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const deposits = getAllDeposits();

		// Change detection — only trigger React re-render when data changes.
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
