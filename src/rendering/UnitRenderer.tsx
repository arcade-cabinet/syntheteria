import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getBotDefinition } from "../bots";
import { resolveAssetUri } from "../config/assetUri";
import { modelAssets } from "../config/modelAssets";
import type { BuildingEntity, UnitEntity } from "../ecs/traits";
import {
	Building,
	hasArms,
	hasCamera,
	Identity,
	MapFragment,
	Rotation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import {
	getActivePlacement,
	getGhostPosition,
} from "../systems/buildingPlacement";
import {
	getStructuralFragment,
	getSurfaceHeightAtWorldPosition,
} from "../world/structuralSpace";

const COLOR_SELECTED = 0xffaa00;
const COLOR_BUILDING = 0x888888;
const COLOR_BUILDING_UNPOWERED = 0x554444;
const COLOR_FABRICATION = 0xaa8844;
const COLOR_BROKEN = 0xff4444;
const FACTION_BEACON_COLORS: Record<string, number> = {
	player: 0x7ff7d4,
	rogue: 0xffa36f,
	cult: 0xd987ff,
	feral: 0xff6f6f,
};

function normalizeUnitMaterial(
	material: THREE.Material,
	beaconColor: number,
) {
	if (!(material instanceof THREE.MeshStandardMaterial)) {
		return;
	}

	const accent = new THREE.Color(beaconColor);
	material.color = material.color.clone().lerp(new THREE.Color(0xb7c7d6), 0.4);
	material.emissive = material.emissive.clone().lerp(accent, 0.12);
	material.emissiveIntensity = 0.22;
	material.roughness = Math.min(material.roughness ?? 0.92, 0.84);
	material.metalness = Math.max(material.metalness ?? 0.1, 0.12);
	material.side = THREE.DoubleSide;
	material.needsUpdate = true;
}

function UnitMesh({ entity }: { entity: UnitEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	const unitType = entity.get(Unit)?.type || "maintenance_bot";
	const config = getBotDefinition(unitType);
	const modelPath = resolveAssetUri(modelAssets[config.model]);
	const gltf = useGLTF(modelPath);
	const scene = Array.isArray(gltf) ? gltf[0]?.scene : gltf.scene;
	const faction = entity.get(Identity)?.faction ?? "player";
	const beaconColor = FACTION_BEACON_COLORS[faction] ?? 0x8be6ff;
	const normalizedScene = useMemo<THREE.Group | null>(() => {
		if (!scene) {
			return null;
		}
		const box = new THREE.Box3().setFromObject(scene);
		const center = new THREE.Vector3();
		box.getCenter(center);
		const clone = scene.clone(true) as THREE.Group;
		clone.position.set(-center.x, -box.min.y, -center.z);
		clone.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) {
				return;
			}
			child.castShadow = true;
			child.receiveShadow = true;
			if (Array.isArray(child.material)) {
				child.material = child.material.map((material) => {
					if (material instanceof THREE.MeshStandardMaterial) {
						const next = material.clone();
						normalizeUnitMaterial(next, beaconColor);
						return next;
					}
					return material;
				});
				return;
			}
			if (child.material instanceof THREE.MeshStandardMaterial) {
				child.material = child.material.clone();
				normalizeUnitMaterial(child.material, beaconColor);
			}
		});
		return clone;
	}, [beaconColor, scene]);

	useFrame(() => {
		const frag = entity.has(MapFragment)
			? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			const wp = entity.get(WorldPosition)!;
			groupRef.current.position.set(wp.x + ox, wp.y, wp.z + oz);

			const rot = entity.get(Rotation);
			if (rot) {
				groupRef.current.rotation.set(0, rot.y, 0);
			}
		}
		if (ringRef.current) {
			ringRef.current.visible = entity.get(Unit)?.selected ?? false;
		}
	});

	return (
		<group ref={groupRef}>
			{normalizedScene ? (
				<primitive
					object={normalizedScene}
					scale={[(config.scale || 1) * 1.25, (config.scale || 1) * 1.25, (config.scale || 1) * 1.25]}
				/>
			) : null}
			<mesh position={[0, 1.4, 0]}>
				<sphereGeometry args={[0.09, 14, 14]} />
				<meshStandardMaterial
					color={beaconColor}
					emissive={beaconColor}
					emissiveIntensity={0.75}
					roughness={0.18}
					metalness={0.08}
				/>
			</mesh>
			<mesh position={[0, 0.15, 0]}>
				<cylinderGeometry args={[0.09, 0.14, 0.12, 10]} />
				<meshStandardMaterial
					color={0x14232d}
					emissive={beaconColor}
					emissiveIntensity={0.18}
					roughness={0.84}
					metalness={0.1}
				/>
			</mesh>
			{/* Selection ring */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[0.5, 0.65, 16]} />
				<meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
}

function BuildingMesh({ entity }: { entity: BuildingEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	useFrame(() => {
		const frag = entity.has(MapFragment)
			? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			groupRef.current.position.set(
				entity.get(WorldPosition)!.x + ox,
				entity.get(WorldPosition)!.y,
				entity.get(WorldPosition)!.z + oz,
			);
		}
		if (ringRef.current) {
			const selected = entity.get(Unit)!
				? entity.get(Unit)?.selected
				: entity.get(Building)?.selected;
			ringRef.current.visible = selected ?? false;
		}
	});

	const isFabricator = entity.get(Building)?.type === "fabrication_unit";
	const isRod = entity.get(Building)?.type === "lightning_rod";
	const isPowered = entity.get(Building)?.powered;

	return (
		<group ref={groupRef}>
			<mesh position={[0, 0.15, 0]}>
				<boxGeometry args={[1.6, 0.3, 1.6]} />
				<meshLambertMaterial
					color={isPowered ? COLOR_BUILDING : COLOR_BUILDING_UNPOWERED}
				/>
			</mesh>

			{isFabricator && (
				<>
					<mesh position={[0, 0.7, 0]}>
						<boxGeometry args={[1.2, 0.8, 1.2]} />
						<meshLambertMaterial
							color={isPowered ? COLOR_FABRICATION : 0x554433}
						/>
					</mesh>
					<mesh position={[0, 1.3, 0]}>
						<cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
						<meshLambertMaterial color={0x666666} />
					</mesh>
					<mesh position={[0.5, 0.9, 0.61]}>
						<sphereGeometry args={[0.08, 8, 8]} />
						<meshLambertMaterial
							color={isPowered ? 0x00ff00 : COLOR_BROKEN}
							emissive={isPowered ? 0x00ff00 : COLOR_BROKEN}
						/>
					</mesh>
					<mesh position={[0, 1.2, 0.4]}>
						<boxGeometry args={[0.4, 0.3, 0.3]} />
						<meshLambertMaterial color={0x777766} />
					</mesh>
				</>
			)}

			{isRod && (
				<>
					<mesh position={[0, 1.5, 0]}>
						<cylinderGeometry args={[0.06, 0.1, 2.5, 6]} />
						<meshLambertMaterial color={0x888899} />
					</mesh>
					<mesh position={[0, 2.8, 0]}>
						<coneGeometry args={[0.12, 0.4, 6]} />
						<meshLambertMaterial color={0xaabb00} emissive={0x334400} />
					</mesh>
					<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
						<ringGeometry args={[7.5, 8, 32]} />
						<meshBasicMaterial
							color={0x00ffaa}
							transparent
							opacity={0.15}
							side={THREE.DoubleSide}
						/>
					</mesh>
				</>
			)}

			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[1.0, 1.2, 16]} />
				<meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
}

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
		const y = getSurfaceHeightAtWorldPosition(ghost.x, ghost.z);
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

export function UnitRenderer() {
	return (
		<>
			{Array.from(units)
				.filter((entity) => entity.get(Unit)?.type !== "fabrication_unit")
				.map((entity) => (
					<UnitMesh key={entity.get(Identity)?.id} entity={entity} />
				))}
			{Array.from(buildings).map((entity) => (
				<BuildingMesh key={entity.get(Identity)?.id} entity={entity} />
			))}
			<GhostBuilding />
		</>
	);
}
