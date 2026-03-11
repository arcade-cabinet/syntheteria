/**
 * Renders all units and buildings at their displayed positions.
 *
 * Units use procedural geometry from BotGenerator, producing faction-distinct
 * meshes (different heads, locomotion, materials) with geometry caching so
 * entities of the same type share underlying Three.js geometries/materials.
 *
 * Buildings use GLB models (fabrication unit, lightning rod).
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getFragment, getTerrainHeight } from "../ecs/terrain";
import type { BuildingEntity, UnitEntity } from "../ecs/types";
import { buildings, units } from "../ecs/world";
import { disposeBotGroup } from "./procgen/BotGenerator";
import {
	entitySeed,
	getBotCacheKey,
	getBotTemplate,
	clearBotGeometryCache,
	getBobOffset,
	getFactionAccentColor,
	getFactionEmissiveIntensity,
} from "./botUtils";
import {
	getActivePlacement,
	getGhostPosition,
} from "../systems/buildingPlacement";

// Re-export pure utilities so callers can import from a single file
export {
	entitySeed,
	getBotCacheKey,
	getBotTemplate,
	clearBotGeometryCache,
	getBobOffset,
	getFactionAccentColor,
	getFactionEmissiveIntensity,
};

// ─── Building model paths ────────────────────────────────────────────────

const LIGHTNING_ROD_MODEL = "/models/psx/machinery/electrical_equipment_1.glb";
const FABRICATION_MODEL = "/models/psx/machinery/tank_system_mx_1.glb";

// ─── Color constants ─────────────────────────────────────────────────────

/** Fallback selection color (used by BuildingMesh which has no faction). */
const COLOR_SELECTED = 0xffaa00;
const COLOR_BROKEN = 0xff4444;

// ─── Bot height constant (used for selection ring and broken indicator) ──

const BOT_HEIGHT = 1.6;

// ─── Procedural bot mesh ─────────────────────────────────────────────────

/**
 * Renders a single unit entity using procedural BotGenerator geometry.
 *
 * On first render the bot group is cloned from the template cache and
 * attached as a Three.js primitive. Per-frame updates position, rotation,
 * and locomotion bob from ECS state.
 */
function ProceduralBotMesh({ entity }: { entity: UnitEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	// Derive a stable seed from the entity id so each bot looks slightly
	// different even within the same faction/type.
	const seed = useMemo(() => entitySeed(entity.id), [entity.id]);

	// Faction-specific accent color for the selection ring
	const accentColor = useMemo(
		() => getFactionAccentColor(entity.faction),
		[entity.faction],
	);

	// Build or retrieve the bot group clone. We clone so that position and
	// rotation transforms are owned by this component instance.
	const botGroup = useMemo(() => {
		const template = getBotTemplate(entity.unit.type, entity.faction, seed);
		// clone(true) deep-clones children but shares geometries and materials
		return template.clone(true);
	}, [entity.unit.type, entity.faction, seed]);

	// Dispose the cloned group on unmount
	useEffect(() => {
		return () => {
			disposeBotGroup(botGroup);
		};
	}, [botGroup]);

	useFrame(({ clock }) => {
		const frag = getFragment(entity.mapFragment.fragmentId);
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			const isMoving = entity.navigation?.moving ?? false;
			const bob = getBobOffset(entity.faction, isMoving, clock.elapsedTime);

			groupRef.current.position.set(
				entity.worldPosition.x + ox,
				entity.worldPosition.y + bob,
				entity.worldPosition.z + oz,
			);

			if (entity.playerControlled) {
				groupRef.current.rotation.y = entity.playerControlled.yaw;
			}
		}

		if (ringRef.current) {
			ringRef.current.visible = entity.unit.selected;
		}
	});

	return (
		<group ref={groupRef}>
			{/* Procedural bot mesh — cloned group from BotGenerator */}
			<primitive object={botGroup} />

			{/* Selection ring — tinted with faction accent color */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[0.5, 0.65, 16]} />
				<meshBasicMaterial
					color={accentColor}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* Broken component indicator — red sphere above head */}
			{entity.unit.components.some((c) => !c.functional) && (
				<mesh position={[0, BOT_HEIGHT + 0.3, 0]}>
					<sphereGeometry args={[0.08, 8, 8]} />
					<meshBasicMaterial
						color={COLOR_BROKEN}
						transparent
						opacity={0.8}
					/>
				</mesh>
			)}
		</group>
	);
}

// ─── Building mesh (GLB models) ──────────────────────────────────────────

/** Desired height for building models (world units). */
const BUILDING_MODEL_HEIGHT = 2.0;

function computeBuildingScale(scene: THREE.Object3D): number {
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	return maxDim > 0 ? BUILDING_MODEL_HEIGHT / maxDim : 1;
}

function setBuildingEmissive(
	scene: THREE.Object3D,
	color: THREE.Color,
	intensity: number,
) {
	scene.traverse((child) => {
		if (child instanceof THREE.Mesh && child.material) {
			const mat = child.material as THREE.MeshStandardMaterial;
			if (mat.isMeshStandardMaterial) {
				mat.emissive = color;
				mat.emissiveIntensity = intensity;
			}
		}
	});
}

const POWERED_EMISSIVE = new THREE.Color(0x00ffaa);
const UNPOWERED_EMISSIVE = new THREE.Color(0x000000);

function BuildingMesh({ entity }: { entity: BuildingEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);
	const ledRef = useRef<THREE.Mesh>(null);

	const isRod = entity.building.type === "lightning_rod";
	const modelPath = isRod ? LIGHTNING_ROD_MODEL : FABRICATION_MODEL;
	const { scene } = useGLTF(modelPath);

	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeBuildingScale(clone);
		clone.scale.setScalar(scale);
		return clone;
	}, [scene]);

	useFrame(() => {
		const frag = entity.mapFragment
			? getFragment(entity.mapFragment.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			groupRef.current.position.set(
				entity.worldPosition.x + ox,
				entity.worldPosition.y,
				entity.worldPosition.z + oz,
			);
		}
		if (ringRef.current) {
			const selected = entity.unit
				? entity.unit.selected
				: entity.building.selected;
			ringRef.current.visible = selected;
		}

		// Emissive glow based on power state
		const isPowered = entity.building.powered;
		if (isPowered) {
			setBuildingEmissive(cloned, POWERED_EMISSIVE, 0.15);
		} else {
			setBuildingEmissive(cloned, UNPOWERED_EMISSIVE, 0);
		}

		// Status LED
		if (ledRef.current) {
			const mat = ledRef.current.material as THREE.MeshStandardMaterial;
			if (isPowered) {
				mat.color.setHex(0x00ff00);
				mat.emissive.setHex(0x00ff00);
			} else {
				mat.color.setHex(0xff0000);
				mat.emissive.setHex(0xff0000);
			}
		}
	});

	return (
		<group ref={groupRef}>
			<primitive object={cloned} />

			{/* Status LED */}
			<mesh ref={ledRef} position={[0.5, BUILDING_MODEL_HEIGHT + 0.1, 0.5]}>
				<sphereGeometry args={[0.08, 8, 8]} />
				<meshStandardMaterial
					color={0xff0000}
					emissive={0xff0000}
					emissiveIntensity={0.8}
				/>
			</mesh>

			{/* Protection radius indicator for lightning rods */}
			{isRod && (
				<mesh
					rotation={[-Math.PI / 2, 0, 0]}
					position={[0, 0.02, 0]}
				>
					<ringGeometry args={[7.5, 8, 32]} />
					<meshBasicMaterial
						color={0x00ffaa}
						transparent
						opacity={0.15}
						side={THREE.DoubleSide}
					/>
				</mesh>
			)}

			{/* Selection ring */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[1.0, 1.2, 16]} />
				<meshBasicMaterial
					color={COLOR_SELECTED}
					side={THREE.DoubleSide}
				/>
			</mesh>
		</group>
	);
}

// ─── Ghost building preview ──────────────────────────────────────────────

function GhostBuilding() {
	const groupRef = useRef<THREE.Group>(null);

	useFrame(() => {
		const ghost = getGhostPosition();
		const active = getActivePlacement();
		if (!groupRef.current) return;

		if (!ghost || !active) {
			groupRef.current.visible = false;
			return;
		}

		groupRef.current.visible = true;
		const y = getTerrainHeight(ghost.x, ghost.z);
		groupRef.current.position.set(ghost.x, y, ghost.z);
	});

	return (
		<group ref={groupRef}>
			<mesh position={[0, 0.8, 0]}>
				<boxGeometry args={[1.6, 1.6, 1.6]} />
				<meshBasicMaterial
					color={0x00ffaa}
					transparent
					opacity={0.3}
					wireframe
				/>
			</mesh>
		</group>
	);
}

// ─── Main renderer ───────────────────────────────────────────────────────

export function UnitRenderer() {
	return (
		<>
			{Array.from(units)
				.filter((entity) => entity.unit.type !== "fabrication_unit")
				.map((entity) => (
					<ProceduralBotMesh key={entity.id} entity={entity} />
				))}
			{Array.from(buildings).map((entity) => (
				<BuildingMesh key={entity.id} entity={entity} />
			))}
			<GhostBuilding />
		</>
	);
}

// Preload building models so they're in cache before first render
useGLTF.preload(LIGHTNING_ROD_MODEL);
useGLTF.preload(FABRICATION_MODEL);
