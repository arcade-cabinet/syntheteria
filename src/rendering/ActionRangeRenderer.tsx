/**
 * Action Range Renderer
 *
 * When a unit is selected, renders translucent circles or cell highlights
 * showing the range of available actions:
 * - Harvest range: amber ring (4 world units radius)
 * - Attack range: red ring (depends on unit type)
 * - Build range: cyan ring (adjacent cells)
 *
 * Uses instanced torus geometry for the range rings, positioned
 * at the selected unit's location.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getBotCommandProfile } from "../bots";
import { Identity, MapFragment, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { hasAnyPoints } from "../systems/turnSystem";
import { getStructuralFragment } from "../world/structuralSpace";

const HARVEST_RANGE = 4.0;
const ATTACK_RANGE = 3.0;
const HACK_RANGE = 6.0;
const BUILD_RANGE = 2.5;

const COLOR_HARVEST = new THREE.Color(0xf6c56a);
const COLOR_ATTACK = new THREE.Color(0xff6b6b);
const COLOR_BUILD = new THREE.Color(0x00e5ff);

const RING_OPACITY = 0.12;
const RING_Y = 0.04;

interface RangeRingRef {
	mesh: THREE.Mesh;
	material: THREE.MeshBasicMaterial;
}

function RangeRing({
	ringRef,
	color,
	radius,
}: {
	ringRef: React.RefObject<THREE.Mesh | null>;
	color: THREE.Color;
	radius: number;
}) {
	return (
		<mesh
			ref={ringRef}
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, RING_Y, 0]}
			visible={false}
		>
			<ringGeometry args={[radius - 0.15, radius, 48]} />
			<meshBasicMaterial
				color={color}
				transparent
				opacity={RING_OPACITY}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

export function ActionRangeRenderer() {
	const groupRef = useRef<THREE.Group>(null);
	const harvestRef = useRef<THREE.Mesh>(null);
	const attackRef = useRef<THREE.Mesh>(null);
	const buildRef = useRef<THREE.Mesh>(null);

	useFrame(() => {
		const group = groupRef.current;
		if (!group) return;

		// Find selected player unit
		let found = false;
		for (const entity of units) {
			const unit = entity.get(Unit);
			if (!unit?.selected) continue;

			const identity = entity.get(Identity);
			if (!identity || identity.faction !== "player") continue;

			const pos = entity.get(WorldPosition);
			if (!pos) continue;

			const frag = entity.has(MapFragment)
				? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
				: null;
			const ox = frag?.displayOffset.x ?? 0;
			const oz = frag?.displayOffset.z ?? 0;

			group.position.set(pos.x + ox, 0, pos.z + oz);

			const profile = getBotCommandProfile(unit.type);
			const hasPoints = hasAnyPoints(identity.id);

			// Show rings based on unit capabilities
			if (harvestRef.current) {
				harvestRef.current.visible =
					hasPoints && (profile?.canHarvest ?? false);
			}
			if (attackRef.current) {
				attackRef.current.visible = hasPoints && (profile?.canAttack ?? false);
			}
			if (buildRef.current) {
				buildRef.current.visible =
					hasPoints &&
					(profile?.canBuildRod ?? profile?.canBuildFabricator ?? false);
			}

			found = true;
			break;
		}

		if (!found) {
			if (harvestRef.current) harvestRef.current.visible = false;
			if (attackRef.current) attackRef.current.visible = false;
			if (buildRef.current) buildRef.current.visible = false;
		}
	});

	return (
		<group ref={groupRef}>
			<RangeRing
				ringRef={harvestRef}
				color={COLOR_HARVEST}
				radius={HARVEST_RANGE}
			/>
			<RangeRing
				ringRef={attackRef}
				color={COLOR_ATTACK}
				radius={ATTACK_RANGE}
			/>
			<RangeRing ringRef={buildRef} color={COLOR_BUILD} radius={BUILD_RANGE} />
		</group>
	);
}
