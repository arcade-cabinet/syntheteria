/**
 * Renders all units and buildings at their displayed positions.
 * Maintenance bots: small box with optional arm/camera indicators.
 * Enemy bots: red-tinted variants.
 * Fabrication unit: larger structure with status glow.
 */

import { useFrame } from "@react-three/fiber";
import type { Entity } from "koota";
import { useRef } from "react";
import * as THREE from "three";
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

const COLOR_UNIT = 0x44aaff;
const COLOR_ENEMY = 0xff3333;
const COLOR_ENEMY_TREAD = 0x553322;
const COLOR_SELECTED = 0xffaa00;
const COLOR_BROKEN = 0xff4444;
const COLOR_BUILDING = 0x888888;
const COLOR_BUILDING_UNPOWERED = 0x554444;
const COLOR_FABRICATION = 0xaa8844;

function UnitMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	const comps = parseComponents(
		entity.get(UnitComponents)?.componentsJson ?? "[]",
	);
	const entityHasCamera = hasCamera(comps);
	const entityHasArms = hasArms(comps);
	const faction = entity.get(Faction)?.value ?? "player";
	const isEnemy = faction !== "player";

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

	const unit = entity.get(Unit);
	const bodyColor = unit?.selected
		? COLOR_SELECTED
		: isEnemy
			? COLOR_ENEMY
			: COLOR_UNIT;

	return (
		<group ref={groupRef}>
			{/* Body */}
			<mesh position={[0, 0.5, 0]}>
				<boxGeometry args={[0.5, 0.6, 0.4]} />
				<meshLambertMaterial color={bodyColor} />
			</mesh>

			{/* Legs/treads */}
			<mesh position={[0, 0.15, 0]}>
				<boxGeometry args={[0.55, 0.2, 0.5]} />
				<meshLambertMaterial color={isEnemy ? COLOR_ENEMY_TREAD : 0x335588} />
			</mesh>

			{/* Camera (top dome) — red if broken */}
			<mesh position={[0, 0.9, 0.1]}>
				<sphereGeometry args={[0.12, 8, 8]} />
				<meshLambertMaterial
					color={
						entityHasCamera ? (isEnemy ? 0xff8800 : 0x00ff88) : COLOR_BROKEN
					}
					emissive={
						entityHasCamera ? (isEnemy ? 0x441100 : 0x004422) : 0x440000
					}
				/>
			</mesh>

			{/* Left arm — red if broken */}
			<mesh position={[-0.35, 0.45, 0]}>
				<boxGeometry args={[0.1, 0.4, 0.1]} />
				<meshLambertMaterial
					color={entityHasArms ? (isEnemy ? 0xaa5544 : 0x6688aa) : COLOR_BROKEN}
				/>
			</mesh>

			{/* Right arm */}
			<mesh position={[0.35, 0.45, 0]}>
				<boxGeometry args={[0.1, 0.4, 0.1]} />
				<meshLambertMaterial
					color={entityHasArms ? (isEnemy ? 0xaa5544 : 0x6688aa) : COLOR_BROKEN}
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

function BuildingMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

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
			// Fabrication units are also units — use unit.selected if available
			const unitData = entity.get(Unit);
			const buildingData = entity.get(BuildingTrait);
			const selected = unitData
				? unitData.selected
				: (buildingData?.selected ?? false);
			ringRef.current.visible = selected;
		}
	});

	const building = entity.get(BuildingTrait)!;
	const isFabricator = building.buildingType === "fabrication_unit";
	const isRod = building.buildingType === "lightning_rod";
	const isPowered = building.powered;

	return (
		<group ref={groupRef}>
			{/* Base platform */}
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
					{/* Lightning rod pole */}
					<mesh position={[0, 1.5, 0]}>
						<cylinderGeometry args={[0.06, 0.1, 2.5, 6]} />
						<meshLambertMaterial color={0x888899} />
					</mesh>
					{/* Rod tip */}
					<mesh position={[0, 2.8, 0]}>
						<coneGeometry args={[0.12, 0.4, 6]} />
						<meshLambertMaterial color={0xaabb00} emissive={0x334400} />
					</mesh>
					{/* Protection radius indicator */}
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

/**
 * Ghost preview for building placement.
 */
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

export function UnitRenderer() {
	// Query mobile units (excluding fabrication units which render as buildings)
	const mobileUnits = Array.from(
		world.query(Position, Unit, UnitComponents, Faction, Fragment),
	).filter((e) => e.get(Unit)!.unitType !== "fabrication_unit");
	const buildingEntities = Array.from(
		world.query(Position, BuildingTrait, Fragment),
	);

	return (
		<>
			{mobileUnits.map((entity) => (
				<UnitMesh key={entity.id()} entity={entity} />
			))}
			{buildingEntities.map((entity) => (
				<BuildingMesh key={entity.id()} entity={entity} />
			))}
			<GhostBuilding />
		</>
	);
}
