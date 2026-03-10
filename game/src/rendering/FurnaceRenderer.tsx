/**
 * FurnaceRenderer — renders furnace entities as box meshes.
 *
 * Reads from furnace.getAllFurnaces() each frame and renders each furnace
 * as a metallic box with an emissive glow when processing. The mesh
 * has userData.entityId set for raycast selection by ObjectSelectionSystem.
 *
 * Furnaces pulse orange when smelting and show a hopper indicator.
 * Physics colliders are registered via the raw Rapier PhysicsWorld module.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { type FurnaceData, getAllFurnaces } from "../systems/furnace";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Furnace visual dimensions */
const FURNACE_WIDTH = 1.2;
const FURNACE_HEIGHT = 1.5;
const FURNACE_DEPTH = 1.2;

/** Processing glow colors */
const PROCESSING_EMISSIVE = new THREE.Color(0xff6600);
const IDLE_EMISSIVE = new THREE.Color(0x331100);
const POWERED_COLOR = new THREE.Color(0x888888);
const UNPOWERED_COLOR = new THREE.Color(0x555555);

// ---------------------------------------------------------------------------
// Physics collider registration (one-time per furnace)
// ---------------------------------------------------------------------------

const registeredColliders = new Set<string>();

function ensureCollider(furnace: FurnaceData): void {
	if (registeredColliders.has(furnace.id)) return;
	if (!isPhysicsInitialized()) return;

	addStaticBox(
		furnace.position.x,
		furnace.position.y + FURNACE_HEIGHT * 0.5,
		furnace.position.z,
		FURNACE_WIDTH * 0.5,
		FURNACE_HEIGHT * 0.5,
		FURNACE_DEPTH * 0.5,
	);

	registeredColliders.add(furnace.id);
}

// ---------------------------------------------------------------------------
// Individual furnace mesh
// ---------------------------------------------------------------------------

interface FurnaceMeshProps {
	furnace: FurnaceData;
}

function FurnaceMesh({ furnace }: FurnaceMeshProps) {
	const bodyRef = useRef<THREE.Mesh>(null);
	const glowRef = useRef<THREE.Mesh>(null);

	// Register physics collider on mount
	useEffect(() => {
		ensureCollider(furnace);
	}, [furnace]);

	useFrame(({ clock }) => {
		if (!bodyRef.current) return;

		const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
		const processing = furnace.isProcessing;
		const powered = furnace.isPowered;

		if (processing) {
			// Pulse emissive when processing
			const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3));
			mat.emissive.copy(PROCESSING_EMISSIVE);
			mat.emissiveIntensity = pulse;
		} else if (powered) {
			mat.emissive.copy(IDLE_EMISSIVE);
			mat.emissiveIntensity = 0.2;
		} else {
			mat.emissive.set(0x000000);
			mat.emissiveIntensity = 0;
		}

		// Glow sphere on top when processing
		if (glowRef.current) {
			const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
			if (processing) {
				const flicker = 0.4 + 0.6 * Math.sin(clock.elapsedTime * 5);
				glowMat.opacity = 0.3 + flicker * 0.4;
				glowRef.current.visible = true;
			} else {
				glowRef.current.visible = false;
			}
		}
	});

	const yCenter = furnace.position.y + FURNACE_HEIGHT * 0.5;

	return (
		<group position={[furnace.position.x, yCenter, furnace.position.z]}>
			{/* Main body */}
			<mesh
				ref={bodyRef}
				userData={{
					entityId: furnace.id,
					entityType: "furnace",
				}}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[FURNACE_WIDTH, FURNACE_HEIGHT, FURNACE_DEPTH]} />
				<meshStandardMaterial
					color={furnace.isPowered ? POWERED_COLOR : UNPOWERED_COLOR}
					roughness={0.4}
					metalness={0.7}
					emissive={IDLE_EMISSIVE}
					emissiveIntensity={0}
				/>
			</mesh>

			{/* Hopper opening (top inset) */}
			<mesh position={[0, FURNACE_HEIGHT * 0.45, 0]} receiveShadow>
				<boxGeometry args={[FURNACE_WIDTH * 0.5, 0.15, FURNACE_DEPTH * 0.5]} />
				<meshStandardMaterial color="#222222" roughness={0.9} metalness={0.2} />
			</mesh>

			{/* Processing glow on top */}
			<mesh
				ref={glowRef}
				position={[0, FURNACE_HEIGHT * 0.55, 0]}
				visible={false}
			>
				<sphereGeometry args={[0.2, 8, 8]} />
				<meshBasicMaterial
					color={0xff6600}
					transparent
					opacity={0.5}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function FurnaceRenderer() {
	const [snapshots, setSnapshots] = useState<FurnaceData[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const furnaces = getAllFurnaces();

		const hash = furnaces
			.map((f) => `${f.id}:${f.isProcessing ? 1 : 0}:${f.isPowered ? 1 : 0}`)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setSnapshots([...furnaces]);
		}
	});

	return (
		<>
			{snapshots.map((furnace) => (
				<FurnaceMesh key={furnace.id} furnace={furnace} />
			))}
		</>
	);
}
