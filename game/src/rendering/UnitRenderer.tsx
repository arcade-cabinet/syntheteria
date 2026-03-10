/**
 * Renders all units and buildings at their displayed positions.
 *
 * Units use animated GLB mech models mapped by faction:
 *   - player → George (Reclaimers mech)
 *   - feral  → Leela (Volt Collective mech)
 *   - cultist → Mike (Signal Choir mech)
 *   - rogue  → Stan (Iron Creed mech)
 *   - wildlife / other → Robot generic model
 *
 * Buildings use procedural geometry (fabrication unit, lightning rod).
 */

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getFragment, getTerrainHeight } from "../ecs/terrain";
import type { BuildingEntity, UnitEntity } from "../ecs/types";
import { buildings, units } from "../ecs/world";
import {
	getActivePlacement,
	getGhostPosition,
} from "../systems/buildingPlacement";

// ─── Building model paths ────────────────────────────────────────────────

const LIGHTNING_ROD_MODEL = "/models/psx/machinery/electrical_equipment_1.glb";
const FABRICATION_MODEL = "/models/psx/machinery/tank_system_mx_1.glb";

// ─── Faction → Model mapping ─────────────────────────────────────────────

const MECH_MODELS: Record<string, string> = {
	player: "/models/mechs/George.glb",
	feral: "/models/mechs/Leela.glb",
	cultist: "/models/mechs/Mike.glb",
	rogue: "/models/mechs/Stan.glb",
};

const ROBOT_MODEL = "/models/robot/Robot.glb";

/** Desired height for all mech models (world units). */
const MECH_HEIGHT = 1.6;

// ─── Color constants ─────────────────────────────────────────────────────

const COLOR_SELECTED = 0xffaa00;
const COLOR_BROKEN = 0xff4444;

// ─── Mech-powered unit mesh ──────────────────────────────────────────────

/** Computes a uniform scale so the model fits within MECH_HEIGHT. */
function computeModelScale(scene: THREE.Object3D): number {
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	return maxDim > 0 ? MECH_HEIGHT / maxDim : 1;
}

/**
 * Tint all MeshStandardMaterial children with a faction accent color.
 * Only applied to enemy units so player bots keep their original textures.
 */
function tintModel(scene: THREE.Object3D, color: THREE.Color) {
	scene.traverse((child) => {
		if (child instanceof THREE.Mesh && child.material) {
			const mat = child.material as THREE.MeshStandardMaterial;
			if (mat.isMeshStandardMaterial) {
				mat.emissive = color;
				mat.emissiveIntensity = 0.15;
			}
		}
	});
}

const FACTION_TINTS: Record<string, THREE.Color> = {
	feral: new THREE.Color(0.3, 0.1, 0.0),
	cultist: new THREE.Color(0.0, 0.15, 0.3),
	rogue: new THREE.Color(0.2, 0.2, 0.05),
};

function MechUnitMesh({ entity }: { entity: UnitEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);
	const prevMoving = useRef(false);

	const modelPath = MECH_MODELS[entity.faction] ?? ROBOT_MODEL;
	const { scene, animations } = useGLTF(modelPath);

	// Clone the scene so each unit gets its own instance
	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeModelScale(clone);
		clone.scale.setScalar(scale);

		// Apply faction tint to enemy units
		const tint = FACTION_TINTS[entity.faction];
		if (tint) tintModel(clone, tint);

		return clone;
	}, [scene, entity.faction]);

	// Set up animation mixer
	const animGroupRef = useRef<THREE.Group>(null);
	const { actions, mixer } = useAnimations(animations, animGroupRef);

	// Play idle animation on mount
	useEffect(() => {
		// Kenney mechs have: Idle, Walk, Run, Jump, etc.
		const idle = actions.Idle ?? actions.idle ?? Object.values(actions)[0];
		if (idle) {
			idle.reset().fadeIn(0.2).play();
		}
	}, [actions]);

	useFrame((_, delta) => {
		const frag = getFragment(entity.mapFragment.fragmentId);
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			groupRef.current.position.set(
				entity.worldPosition.x + ox,
				entity.worldPosition.y,
				entity.worldPosition.z + oz,
			);

			// Rotate to face movement direction (yaw)
			if (entity.playerControlled) {
				groupRef.current.rotation.y = entity.playerControlled.yaw;
			}
		}

		if (ringRef.current) {
			ringRef.current.visible = entity.unit.selected;
		}

		// Update animation mixer
		mixer.update(delta);

		// Swap between walk and idle based on movement
		const isMoving = entity.navigation?.moving ?? false;
		if (isMoving !== prevMoving.current) {
			prevMoving.current = isMoving;
			const walk =
				actions.Walk ?? actions.walk ?? actions.Run ?? actions.run;
			const idle = actions.Idle ?? actions.idle;

			if (isMoving && walk) {
				idle?.fadeOut(0.2);
				walk.reset().fadeIn(0.2).play();
			} else if (!isMoving && idle) {
				walk?.fadeOut(0.2);
				idle.reset().fadeIn(0.2).play();
			}
		}
	});

	return (
		<group ref={groupRef}>
			<group ref={animGroupRef}>
				<primitive object={cloned} />
			</group>

			{/* Selection ring */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[0.5, 0.65, 16]} />
				<meshBasicMaterial
					color={COLOR_SELECTED}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* Broken component indicator — red sphere above head */}
			{entity.unit.components.some((c) => !c.functional) && (
				<mesh position={[0, MECH_HEIGHT + 0.3, 0]}>
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
					<MechUnitMesh key={entity.id} entity={entity} />
				))}
			{Array.from(buildings).map((entity) => (
				<BuildingMesh key={entity.id} entity={entity} />
			))}
			<GhostBuilding />
		</>
	);
}

// Preload all models so they're in the cache before first render
for (const path of Object.values(MECH_MODELS)) {
	useGLTF.preload(path);
}
useGLTF.preload(ROBOT_MODEL);
useGLTF.preload(LIGHTNING_ROD_MODEL);
useGLTF.preload(FABRICATION_MODEL);
