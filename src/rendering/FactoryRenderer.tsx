/**
 * Renders mining drills and processor buildings using PSX-style GLB models.
 *
 * Miners:   PSX test_machine_mx_1 model with rotating drill animation,
 *           status LED (green=active, red=inactive/broken).
 * Processors: PSX distillery_mx_1 (smelter), machinery_mx_1 (refiner),
 *             storage_tank_mx_1 (separator) with animated emissive pulses.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getFragment } from "../ecs/terrain";
import type { Entity } from "../ecs/types";
import { miners, processors } from "../ecs/world";

// ─── Model paths ─────────────────────────────────────────────────────────

const MINER_MODEL = "/models/psx/machinery/test_machine_mx_1.glb";

const PROCESSOR_MODELS: Record<string, string> = {
	smelter: "/models/psx/machinery/distillery_mx_1.glb",
	refiner: "/models/psx/machinery/machinery_mx_1.glb",
	separator: "/models/psx/machinery/storage_tank_mx_1.glb",
};

/** Desired height for factory buildings (world units). */
const BUILDING_HEIGHT = 2.0;

const PROCESSOR_GLOW: Record<string, number> = {
	smelter: 0xff6600,
	refiner: 0x0066ff,
	separator: 0x00ff66,
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function computeModelScale(scene: THREE.Object3D): number {
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	return maxDim > 0 ? BUILDING_HEIGHT / maxDim : 1;
}

function setEmissive(
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

// ─── Miner ───────────────────────────────────────────────────────────────

function MinerMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ledRef = useRef<THREE.Mesh>(null);
	const { scene } = useGLTF(MINER_MODEL);

	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeModelScale(clone);
		clone.scale.setScalar(scale);
		return clone;
	}, [scene]);

	useFrame((_, delta) => {
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

		// Rotate the whole model slowly when active (simulates drill)
		if (
			entity.miner &&
			entity.miner.active &&
			entity.miner.drillHealth > 0 &&
			entity.building?.powered
		) {
			cloned.rotation.y += delta * 2;
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
			<primitive object={cloned} />

			{/* Status LED */}
			<mesh ref={ledRef} position={[0.5, 1.8, 0.5]}>
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

// ─── Processor ───────────────────────────────────────────────────────────

function ProcessorMesh({ entity }: { entity: Entity }) {
	const groupRef = useRef<THREE.Group>(null);
	const glowRef = useRef<THREE.Mesh>(null);

	const procType = entity.processor?.processorType ?? "smelter";
	const modelPath = PROCESSOR_MODELS[procType] ?? PROCESSOR_MODELS.smelter;
	const { scene } = useGLTF(modelPath);

	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeModelScale(clone);
		clone.scale.setScalar(scale);
		return clone;
	}, [scene]);

	const glowColor = useMemo(
		() => new THREE.Color(PROCESSOR_GLOW[procType] ?? 0xff6600),
		[procType],
	);

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

		// Pulse emissive on the model mesh when processing
		if (isProcessing) {
			const pulse =
				0.3 + 0.7 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4));
			setEmissive(cloned, glowColor, pulse);
		} else if (isPowered) {
			setEmissive(cloned, glowColor, 0.1);
		} else {
			setEmissive(cloned, new THREE.Color(0x000000), 0);
		}

		// Chimney glow when processing
		if (glowRef.current) {
			const mat = glowRef.current.material as THREE.MeshBasicMaterial;
			if (isProcessing) {
				const flicker = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 6);
				mat.opacity = 0.3 + flicker * 0.4;
				glowRef.current.visible = true;
			} else {
				glowRef.current.visible = false;
			}
		}
	});

	return (
		<group ref={groupRef}>
			<primitive object={cloned} />

			{/* Processing glow on top */}
			<mesh ref={glowRef} position={[0, BUILDING_HEIGHT + 0.2, 0]} visible={false}>
				<sphereGeometry args={[0.2, 8, 8]} />
				<meshBasicMaterial
					color={PROCESSOR_GLOW[procType] ?? 0xff6600}
					transparent
					opacity={0.5}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

// ─── Main component ──────────────────────────────────────────────────────

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

// Preload all factory models
useGLTF.preload(MINER_MODEL);
for (const path of Object.values(PROCESSOR_MODELS)) {
	useGLTF.preload(path);
}
