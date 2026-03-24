/**
 * Renders all units and buildings using GLB models loaded via useGLTF.
 * Player robots, cult mechs, and buildings each resolve their model
 * from src/config/models.ts based on their ECS unit/building type.
 */

import { Clone, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Entity } from "koota";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import {
	getAllBuildingModelUrls,
	getAllRobotModelUrls,
	resolveBuildingModelUrl,
	resolveUnitModelUrl,
} from "../config/models";
import { getFragment, getTerrainHeight } from "../ecs/terrain";
import {
	BuildingTrait,
	Faction,
	Fragment,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { hasArms, hasCamera, parseComponents } from "../ecs/types";
import { world } from "../ecs/world";
import {
	getActivePlacement,
	getGhostPosition,
} from "../systems/buildingPlacement";

const COLOR_SELECTED = 0xffaa00;
const COLOR_BROKEN = 0xff4444;

// ─── Unit mesh (GLB model) ──────────────────────────────────────────────────

function UnitModel({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	const unit = entity.get(Unit);
	const unitType = unit?.unitType ?? "maintenance_bot";
	const modelUrl = resolveUnitModelUrl(unitType);
	const { scene } = useGLTF(modelUrl);

	const faction = entity.get(Faction)?.value ?? "player";
	const isEnemy = faction !== "player";

	const comps = parseComponents(
		entity.get(UnitComponents)?.componentsJson ?? "[]",
	);
	const entityHasCamera = hasCamera(comps);
	const entityHasArms = hasArms(comps);

	// Tint the model based on faction and component status
	const tintColor = isEnemy
		? new THREE.Color(0xff3333)
		: new THREE.Color(0x44aaff);
	const damagedTint = new THREE.Color(COLOR_BROKEN);
	const hasDamage = !entityHasCamera || !entityHasArms;

	useFrame(() => {
		const pos = entity.get(Position);
		const frag = getFragment(entity.get(Fragment)?.fragmentId ?? "");
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current && pos) {
			groupRef.current.position.set(pos.x + ox, pos.y, pos.z + oz);
		}
		if (ringRef.current) {
			ringRef.current.visible = entity.get(Unit)?.selected ?? false;
		}
	});

	return (
		<group ref={groupRef}>
			<Clone
				object={scene}
				inject={
					<meshStandardMaterial
						color={
							unit?.selected
								? COLOR_SELECTED
								: hasDamage
									? damagedTint
									: tintColor
						}
					/>
				}
			/>

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

// ─── Building mesh (GLB model) ──────────────────────────────────────────────

function BuildingModel({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	const building = entity.get(BuildingTrait)!;
	const modelUrl = resolveBuildingModelUrl(building.buildingType);
	const { scene } = useGLTF(modelUrl);

	useFrame(() => {
		const pos = entity.get(Position);
		const fragmentId = entity.get(Fragment)?.fragmentId ?? "";
		const frag = fragmentId ? getFragment(fragmentId) : null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current && pos) {
			groupRef.current.position.set(pos.x + ox, pos.y, pos.z + oz);
		}
		if (ringRef.current) {
			const unitData = entity.get(Unit);
			const buildingData = entity.get(BuildingTrait);
			const selected = unitData
				? unitData.selected
				: (buildingData?.selected ?? false);
			ringRef.current.visible = selected;
		}
	});

	const isPowered = building.powered;

	return (
		<group ref={groupRef}>
			<Clone
				object={scene}
				inject={
					isPowered ? undefined : (
						<meshStandardMaterial color={0x554444} opacity={0.7} transparent />
					)
				}
			/>

			{/* Protection radius indicator for lightning rods */}
			{building.buildingType === "lightning_rod" && (
				<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
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
				<meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
}

// ─── Ghost preview for building placement ───────────────────────────────────

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

// ─── Preload all models ─────────────────────────────────────────────────────

for (const url of getAllRobotModelUrls()) {
	useGLTF.preload(url);
}
for (const url of getAllBuildingModelUrls()) {
	useGLTF.preload(url);
}

// ─── Main renderer ──────────────────────────────────────────────────────────

export function UnitRenderer() {
	const mobileUnits = Array.from(
		world.query(Position, Unit, UnitComponents, Faction, Fragment),
	).filter((e) => e.get(Unit)!.unitType !== "fabrication_unit");
	const buildingEntities = Array.from(
		world.query(Position, BuildingTrait, Fragment),
	);

	return (
		<Suspense fallback={null}>
			{mobileUnits.map((entity) => (
				<UnitModel key={entity.id()} entity={entity} />
			))}
			{buildingEntities.map((entity) => (
				<BuildingModel key={entity.id()} entity={entity} />
			))}
			<GhostBuilding />
		</Suspense>
	);
}
