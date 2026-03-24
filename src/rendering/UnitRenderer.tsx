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

const COLOR_PLAYER = 0x44aaff;
const COLOR_ENEMY = 0xff3333;
const COLOR_SELECTED = 0xffaa00;
const COLOR_BROKEN = 0xff4444;

/** Scale for robot GLB models (Space Colony pack robots are ~2m, game units ~0.5m) */
const ROBOT_SCALE = 0.4;
/** Scale for building GLB models */
const BUILDING_SCALE = 0.8;
/** Height offset to ensure units sit on top of terrain */
const UNIT_Y_OFFSET = 0.0;
/** Bob animation amplitude */
const BOB_AMPLITUDE = 0.05;
/** Bob animation speed */
const BOB_SPEED = 2.0;

// ─── Unit mesh (GLB model) ──────────────────────────────────────────────────

function UnitModel({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);
	const timeRef = useRef(Math.random() * Math.PI * 2); // random phase offset

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
	const hasDamage = !entityHasCamera || !entityHasArms;

	useFrame((_state, delta) => {
		const pos = entity.get(Position);
		const frag = getFragment(entity.get(Fragment)?.fragmentId ?? "");
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		// Gentle bob animation
		timeRef.current += delta * BOB_SPEED;
		const bob = Math.sin(timeRef.current) * BOB_AMPLITUDE;

		if (groupRef.current && pos) {
			groupRef.current.position.set(
				pos.x + ox,
				pos.y + UNIT_Y_OFFSET + bob,
				pos.z + oz,
			);
		}
		if (ringRef.current) {
			ringRef.current.visible = entity.get(Unit)?.selected ?? false;
		}
	});

	// Determine tint color
	const tintColor = unit?.selected
		? new THREE.Color(COLOR_SELECTED)
		: hasDamage
			? new THREE.Color(COLOR_BROKEN)
			: isEnemy
				? new THREE.Color(COLOR_ENEMY)
				: new THREE.Color(COLOR_PLAYER);

	return (
		<group ref={groupRef} scale={ROBOT_SCALE}>
			<Clone
				object={scene}
				inject={
					<meshStandardMaterial
						color={tintColor}
						roughness={0.6}
						metalness={0.3}
						emissive={tintColor}
						emissiveIntensity={0.15}
					/>
				}
			/>

			{/* Selection ring — scaled inversely so it's consistent size */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.1, 0]}
				visible={false}
				scale={1 / ROBOT_SCALE}
			>
				<ringGeometry args={[0.5, 0.65, 16]} />
				<meshBasicMaterial
					color={COLOR_SELECTED}
					side={THREE.DoubleSide}
					transparent
					opacity={0.8}
				/>
			</mesh>
		</group>
	);
}

/** Fallback box shown while GLB models are loading */
function UnitFallback({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const faction = entity.get(Faction)?.value ?? "player";

	useFrame(() => {
		const pos = entity.get(Position);
		const frag = getFragment(entity.get(Fragment)?.fragmentId ?? "");
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current && pos) {
			groupRef.current.position.set(pos.x + ox, pos.y + 0.4, pos.z + oz);
		}
	});

	return (
		<group ref={groupRef}>
			<mesh>
				<boxGeometry args={[0.5, 0.6, 0.4]} />
				<meshStandardMaterial
					color={faction !== "player" ? COLOR_ENEMY : COLOR_PLAYER}
					emissive={faction !== "player" ? COLOR_ENEMY : COLOR_PLAYER}
					emissiveIntensity={0.3}
				/>
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
		<group ref={groupRef} scale={BUILDING_SCALE}>
			<Clone
				object={scene}
				inject={
					isPowered ? undefined : (
						<meshStandardMaterial
							color={0x554444}
							opacity={0.7}
							transparent
							roughness={0.8}
						/>
					)
				}
			/>

			{/* Protection radius indicator for lightning rods */}
			{building.buildingType === "lightning_rod" && (
				<mesh
					rotation={[-Math.PI / 2, 0, 0]}
					position={[0, 0.02, 0]}
					scale={1 / BUILDING_SCALE}
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
				scale={1 / BUILDING_SCALE}
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
	const matRef = useRef<THREE.MeshBasicMaterial>(null);

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

		// Update color based on placement validity
		if (matRef.current) {
			matRef.current.color.setHex(ghost.valid ? 0x00ffaa : 0xff4444);
		}
	});

	return (
		<group ref={groupRef}>
			<mesh position={[0, 0.8, 0]}>
				<boxGeometry args={[1.6, 1.6, 1.6]} />
				<meshBasicMaterial
					ref={matRef}
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
		<>
			<Suspense
				fallback={mobileUnits.map((entity) => (
					<UnitFallback key={entity.id()} entity={entity} />
				))}
			>
				{mobileUnits.map((entity) => (
					<UnitModel key={entity.id()} entity={entity} />
				))}
			</Suspense>
			<Suspense fallback={null}>
				{buildingEntities.map((entity) => (
					<BuildingModel key={entity.id()} entity={entity} />
				))}
			</Suspense>
			<GhostBuilding />
		</>
	);
}
