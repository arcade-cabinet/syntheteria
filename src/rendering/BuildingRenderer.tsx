/**
 * BuildingRenderer — renders ECS building entities using BuildingGenerator.
 *
 * Covers all entities with a `building` component that are NOT handled by
 * a dedicated renderer:
 *   - FactoryRenderer handles entities with `miner` or `processor`
 *   - FurnaceRenderer handles furnace data from the furnace system
 *   - BuildingRenderer handles everything else (lightning_rod, fabrication_unit,
 *     outpost, turret, generic buildings spawned by AI civilizations, etc.)
 *
 * Geometry caching: building groups are generated once per (buildingType, faction)
 * pair, then deep-cloned for each individual entity so each instance can have its
 * own world position without sharing transform state.
 *
 * Physics colliders: registered via the addStaticBox + registerColliderEntity
 * pattern, lazy-initialized on the first frame after physics is ready.
 *
 * Change detection: building list is hashed each frame; React state only updates
 * when the hash changes to avoid re-rendering every frame.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { BuildingEntity } from "../ecs/types";
import { buildings } from "../ecs/world";
import { registerColliderEntity } from "../input/raycastUtils";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import {
	disposeBuildingGroup,
	generateBuilding,
} from "./procgen/BuildingGenerator";
import { getFactionAccentColor } from "./botUtils";

// ---------------------------------------------------------------------------
// Approximate collider half-extents per building type (metres).
// Values are conservative AABBs that match the procedural geometry sizes
// defined in BuildingGenerator.
// ---------------------------------------------------------------------------

interface HalfExtents {
	halfW: number;
	halfH: number;
	halfD: number;
}

const BUILDING_COLLIDERS: Record<string, HalfExtents> = {
	lightning_rod: { halfW: 0.3, halfH: 0.1, halfD: 0.3 }, // base only; pole ignored
	fabrication_unit: { halfW: 0.6, halfH: 0.4, halfD: 0.45 },
	furnace: { halfW: 0.45, halfH: 0.3, halfD: 0.4 },
	miner: { halfW: 0.4, halfH: 0.25, halfD: 0.35 },
	processor: { halfW: 0.35, halfH: 0.3, halfD: 0.3 },
	outpost: { halfW: 0.5, halfH: 0.5, halfD: 0.4 }, // elevated platform extent
	turret: { halfW: 0.35, halfH: 0.25, halfD: 0.35 },
};

const DEFAULT_COLLIDER: HalfExtents = { halfW: 0.4, halfH: 0.3, halfD: 0.4 };

function getCollider(buildingType: string): HalfExtents {
	return BUILDING_COLLIDERS[buildingType] ?? DEFAULT_COLLIDER;
}

// ---------------------------------------------------------------------------
// Geometry cache — shared Three.js groups per (type, faction)
// ---------------------------------------------------------------------------

const groupCache = new Map<string, THREE.Group>();

function getCachedGroup(buildingType: string, faction: string): THREE.Group {
	const key = `${buildingType}::${faction}`;
	const cached = groupCache.get(key);
	if (cached) return cached;

	// Derive a stable integer seed from the key string.
	// This makes the procedural shape consistent for a given (type, faction) pair.
	let seed = 0;
	for (let i = 0; i < key.length; i++) {
		seed = ((seed << 5) - seed + key.charCodeAt(i)) | 0;
	}
	seed = Math.abs(seed);

	const group = generateBuilding(buildingType, faction, seed);
	groupCache.set(key, group);
	return group;
}

/**
 * Dispose all cached building groups and clear the cache.
 * Exported for use in tests and world-reset scenarios.
 */
export function clearBuildingGeometryCache(): void {
	for (const group of groupCache.values()) {
		disposeBuildingGroup(group);
	}
	groupCache.clear();
}

// ---------------------------------------------------------------------------
// Collider registry (avoids double-registering per entity)
// ---------------------------------------------------------------------------

const registeredColliders = new Set<string>();

function ensureCollider(entity: BuildingEntity): void {
	if (registeredColliders.has(entity.id)) return;
	if (!isPhysicsInitialized()) return;

	const { x, y, z } = entity.worldPosition;
	const { halfW, halfH, halfD } = getCollider(entity.building.type);

	const collider = addStaticBox(x, y + halfH, z, halfW, halfH, halfD);
	if (collider) {
		registerColliderEntity(collider.handle, entity.id);
	}
	registeredColliders.add(entity.id);
}

/** Reset collider tracking. Exported for test cleanup. */
export function clearBuildingColliderRegistry(): void {
	registeredColliders.clear();
}

// ---------------------------------------------------------------------------
// Snapshot type (stable, serialisable representation per building)
// ---------------------------------------------------------------------------

interface BuildingSnapshot {
	id: string;
	buildingType: string;
	faction: string;
	x: number;
	y: number;
	z: number;
	powered: boolean;
}

function snapshotEntity(entity: BuildingEntity): BuildingSnapshot {
	return {
		id: entity.id,
		buildingType: entity.building.type,
		faction: entity.faction,
		x: entity.worldPosition.x,
		y: entity.worldPosition.y,
		z: entity.worldPosition.z,
		powered: entity.building.powered,
	};
}

// ---------------------------------------------------------------------------
// Per-building mesh component
// ---------------------------------------------------------------------------

function BuildingMesh({ snapshot }: { snapshot: BuildingSnapshot }) {
	const groupRef = useRef<THREE.Group>(null);
	const ledRef = useRef<THREE.Mesh>(null);

	// Clone the shared cached group so this instance has its own transforms.
	const cloned = useMemo(() => {
		const source = getCachedGroup(snapshot.buildingType, snapshot.faction);
		return source.clone(true);
	}, [snapshot.buildingType, snapshot.faction]);

	// Faction-specific accent color for power LED — read from config once per entity
	const accentHex = useMemo(
		() => getFactionAccentColor(snapshot.faction),
		[snapshot.faction],
	);

	useFrame(() => {
		// Lazy-register physics collider once the world is ready.
		// We reconstruct a minimal BuildingEntity-compatible object from the snapshot.
		ensureCollider({
			id: snapshot.id,
			faction: snapshot.faction as BuildingEntity["faction"],
			building: {
				type: snapshot.buildingType,
				powered: snapshot.powered,
				operational: false,
				selected: false,
				components: [],
			},
			worldPosition: { x: snapshot.x, y: snapshot.y, z: snapshot.z },
		});

		// Update faction-colored power LED
		if (ledRef.current) {
			const mat = ledRef.current.material as THREE.MeshStandardMaterial;
			if (snapshot.powered) {
				mat.color.setHex(accentHex);
				mat.emissive.setHex(accentHex);
				mat.emissiveIntensity = 0.8;
			} else {
				mat.color.setHex(0xff0000);
				mat.emissive.setHex(0xff0000);
				mat.emissiveIntensity = 0.5;
			}
		}
	});

	return (
		<group
			ref={groupRef}
			position={[snapshot.x, snapshot.y, snapshot.z]}
			userData={{ entityId: snapshot.id, entityType: "building" }}
		>
			<primitive object={cloned} />

			{/* Faction-colored power status LED */}
			<mesh ref={ledRef} position={[0, 1.1, 0.5]}>
				<sphereGeometry args={[0.06, 6, 6]} />
				<meshStandardMaterial
					color={0xff0000}
					emissive={0xff0000}
					emissiveIntensity={0.5}
				/>
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Main renderer component
// ---------------------------------------------------------------------------

/**
 * Renders all building entities from the ECS `buildings` query that are not
 * handled by FactoryRenderer (miners/processors) or FurnaceRenderer.
 *
 * Mount once inside the R3F <Canvas> in GameScene.
 */
export function BuildingRenderer() {
	const [snapshots, setSnapshots] = useState<BuildingSnapshot[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const current: BuildingSnapshot[] = [];
		for (const entity of buildings) {
			// Skip entities handled by FactoryRenderer (miner / processor)
			if ("miner" in entity || "processor" in entity) continue;
			current.push(snapshotEntity(entity as BuildingEntity));
		}

		// Change detection — only push state update when something changes
		const hash = current
			.map((s) => `${s.id}:${s.buildingType}:${s.faction}:${s.x.toFixed(2)}:${s.y.toFixed(2)}:${s.z.toFixed(2)}:${s.powered ? "1" : "0"}`)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setSnapshots(current);
		}
	});

	return (
		<>
			{snapshots.map((snap) => (
				<BuildingMesh key={snap.id} snapshot={snap} />
			))}
		</>
	);
}
