/**
 * Renders mining drills and processor buildings.
 *
 * Miners: Tall cylinder (drill column) + box base, rotating drill head,
 *         status LED (green=active, red=inactive/broken).
 * Processors: Box with chimney, type-specific glow color,
 *             animated emissive that pulses when processing.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getFragment } from "../ecs/terrain";
import type { Entity } from "../ecs/types";
import { miners, processors } from "../ecs/world";

const MATERIAL_PROPS = {
	metalness: 0.8,
	roughness: 0.3,
};

const PROCESSOR_GLOW: Record<string, number> = {
	smelter: 0xff6600,
	refiner: 0x0066ff,
	separator: 0x00ff66,
};

const PROCESSOR_EMISSIVE: Record<string, number> = {
	smelter: 0x661a00,
	refiner: 0x001a66,
	separator: 0x006622,
};

// ---- Miner ----

function MinerMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const drillRef = useRef<THREE.Mesh>(null);
	const ledRef = useRef<THREE.Mesh>(null);

	useFrame((_state, delta) => {
		const frag = entity.mapFragment
			? getFragment(entity.mapFragment.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current && entity.worldPosition) {
			groupRef.current.position.set(
				entity.worldPosition.x + ox,
				entity.worldPosition.y,
				entity.worldPosition.z + oz,
			);
		}

		// Rotate drill head when active
		if (drillRef.current && entity.miner) {
			if (
				entity.miner.active &&
				entity.miner.drillHealth > 0 &&
				entity.building?.powered
			) {
				drillRef.current.rotation.y += delta * 4;
			}
		}

		// Update LED color
		if (ledRef.current && entity.miner) {
			const isOperational =
				entity.miner.active &&
				entity.miner.drillHealth > 0 &&
				entity.building?.powered;
			const mat = ledRef.current.material as THREE.MeshStandardMaterial;
			if (isOperational) {
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
			{/* Base platform */}
			<mesh position={[0, 0.2, 0]}>
				<boxGeometry args={[1.4, 0.4, 1.4]} />
				<meshStandardMaterial color={0x666666} {...MATERIAL_PROPS} />
			</mesh>

			{/* Drill column */}
			<mesh position={[0, 1.2, 0]}>
				<cylinderGeometry args={[0.15, 0.2, 1.6, 8]} />
				<meshStandardMaterial color={0x888888} {...MATERIAL_PROPS} />
			</mesh>

			{/* Drill head (rotates) */}
			<mesh ref={drillRef} position={[0, 2.1, 0]}>
				<coneGeometry args={[0.3, 0.5, 6]} />
				<meshStandardMaterial color={0xaaaa44} {...MATERIAL_PROPS} />
			</mesh>

			{/* Motor housing */}
			<mesh position={[0, 0.6, 0]}>
				<boxGeometry args={[0.6, 0.4, 0.6]} />
				<meshStandardMaterial color={0x555555} {...MATERIAL_PROPS} />
			</mesh>

			{/* Status LED */}
			<mesh ref={ledRef} position={[0.5, 0.8, 0.5]}>
				<sphereGeometry args={[0.08, 8, 8]} />
				<meshStandardMaterial
					color={0xff0000}
					emissive={0xff0000}
					emissiveIntensity={0.8}
				/>
			</mesh>
		</group>
	);
}

// ---- Processor ----

function ProcessorMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const chimneyGlowRef = useRef<THREE.Mesh>(null);
	const bodyRef = useRef<THREE.Mesh>(null);

	useFrame((state) => {
		const frag = entity.mapFragment
			? getFragment(entity.mapFragment.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current && entity.worldPosition) {
			groupRef.current.position.set(
				entity.worldPosition.x + ox,
				entity.worldPosition.y,
				entity.worldPosition.z + oz,
			);
		}

		if (!entity.processor) return;
		const proc = entity.processor;
		const isPowered = entity.building?.powered ?? false;
		const isProcessing =
			isPowered && proc.active && proc.progress > 0 && proc.progress < 1.0;

		// Pulse emissive when processing
		if (bodyRef.current) {
			const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
			if (isProcessing) {
				const pulse =
					0.3 + 0.7 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4));
				mat.emissiveIntensity = pulse;
			} else if (isPowered) {
				mat.emissiveIntensity = 0.2;
			} else {
				mat.emissiveIntensity = 0;
			}
		}

		// Chimney glow when processing
		if (chimneyGlowRef.current) {
			const mat = chimneyGlowRef.current.material as THREE.MeshStandardMaterial;
			if (isProcessing) {
				const flicker = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 6);
				mat.emissiveIntensity = 0.5 + flicker * 0.5;
				mat.opacity = 0.6 + flicker * 0.3;
			} else {
				mat.emissiveIntensity = 0;
				mat.opacity = 0.1;
			}
		}
	});

	const procType = entity.processor?.processorType ?? "smelter";
	const glowColor = PROCESSOR_GLOW[procType] ?? 0xff6600;
	const emissiveColor = PROCESSOR_EMISSIVE[procType] ?? 0x661a00;

	return (
		<group ref={groupRef}>
			{/* Base platform */}
			<mesh position={[0, 0.15, 0]}>
				<boxGeometry args={[1.8, 0.3, 1.8]} />
				<meshStandardMaterial color={0x555555} {...MATERIAL_PROPS} />
			</mesh>

			{/* Main body */}
			<mesh ref={bodyRef} position={[0, 0.8, 0]}>
				<boxGeometry args={[1.4, 1.0, 1.4]} />
				<meshStandardMaterial
					color={0x777777}
					emissive={emissiveColor}
					emissiveIntensity={0.2}
					{...MATERIAL_PROPS}
				/>
			</mesh>

			{/* Chimney */}
			<mesh position={[0.4, 1.7, -0.3]}>
				<cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
				<meshStandardMaterial color={0x444444} {...MATERIAL_PROPS} />
			</mesh>

			{/* Chimney glow */}
			<mesh ref={chimneyGlowRef} position={[0.4, 2.15, -0.3]}>
				<sphereGeometry args={[0.15, 8, 8]} />
				<meshStandardMaterial
					color={glowColor}
					emissive={glowColor}
					emissiveIntensity={0}
					transparent
					opacity={0.1}
				/>
			</mesh>

			{/* Input port */}
			<mesh position={[-0.71, 0.6, 0]}>
				<boxGeometry args={[0.1, 0.3, 0.4]} />
				<meshStandardMaterial color={0x334455} {...MATERIAL_PROPS} />
			</mesh>

			{/* Output port */}
			<mesh position={[0.71, 0.6, 0]}>
				<boxGeometry args={[0.1, 0.3, 0.4]} />
				<meshStandardMaterial color={0x554433} {...MATERIAL_PROPS} />
			</mesh>
		</group>
	);
}

// ---- Main component ----

export function FactoryRenderer() {
	return (
		<>
			{Array.from(miners).map((entity) => (
				<MinerMesh key={entity.id} entity={entity} />
			))}
			{Array.from(processors).map((entity) => (
				<ProcessorMesh key={entity.id} entity={entity} />
			))}
		</>
	);
}
