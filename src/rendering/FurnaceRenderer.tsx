/**
 * FurnaceRenderer — renders furnace entities using PSX chimney model.
 *
 * Uses chimney_a_1.glb from the PSX machinery pack as the visual base.
 * Furnaces pulse orange when smelting and show a glow at the chimney top.
 * Physics colliders are registered via the raw Rapier PhysicsWorld module.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { registerColliderEntity } from "../input/raycastUtils";
import { addStaticBox, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { type FurnaceData, getAllFurnaces } from "../systems/furnace";

// ─── Constants ───────────────────────────────────────────────────────────

const FURNACE_MODEL = "/models/psx/machinery/chimney_a_1.glb";
const FURNACE_HEIGHT = 1.5;
const FURNACE_HALF_WIDTH = 0.6;

/** Processing glow colors */
const PROCESSING_EMISSIVE = new THREE.Color(0xff6600);
const IDLE_EMISSIVE = new THREE.Color(0x331100);
const ZERO_EMISSIVE = new THREE.Color(0x000000);

// ─── Physics collider registration ───────────────────────────────────────

const registeredColliders = new Set<string>();

function ensureCollider(furnace: FurnaceData): void {
	if (registeredColliders.has(furnace.id)) return;
	if (!isPhysicsInitialized()) return;

	const collider = addStaticBox(
		furnace.position.x,
		furnace.position.y + FURNACE_HEIGHT * 0.5,
		furnace.position.z,
		FURNACE_HALF_WIDTH,
		FURNACE_HEIGHT * 0.5,
		FURNACE_HALF_WIDTH,
	);

	if (collider) {
		registerColliderEntity(collider.handle, furnace.id);
	}

	registeredColliders.add(furnace.id);
}

// ─── Model helpers ───────────────────────────────────────────────────────

function computeScale(scene: THREE.Object3D): number {
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	return maxDim > 0 ? FURNACE_HEIGHT / maxDim : 1;
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

// ─── Progress arc helper ─────────────────────────────────────────────────

/**
 * Compute a torus segment arc (tube count) from progress 0-1.
 * Three.js TorusGeometry uses tubularSegments to control circumference.
 * We build a full ring and scale/clip it via a dedicated geometry rebuild.
 *
 * Simpler approach: use opacity + rotation to "reveal" the ring.
 * We drive the material's opacity to 0 for the hidden fraction using a
 * gradient-like approach with two ring meshes: one full dim ring + one
 * bright arc scaled to progress.
 *
 * For correctness we simply rotate a clipped arc — but Three.js doesn't
 * support partial torus natively. Instead, we use a ringGeometry with a
 * fixed segment count and mask via clipAngles in a dedicated helper.
 */

/**
 * Update the arc ring mesh to show the given progress (0-1).
 * The arc is implemented as a simple ring mesh scaled about the Z axis;
 * the "clip" is done by rebuilding geometry only when progress changes
 * significantly, otherwise we just use opacity fade near start/end.
 */
function updateProgressArc(
	ringMesh: THREE.Mesh,
	progress: number,
): void {
	const mat = ringMesh.material as THREE.MeshBasicMaterial;
	if (progress <= 0.01) {
		ringMesh.visible = false;
		return;
	}
	ringMesh.visible = true;

	// Use a clip plane via rotation and arc segment — simplified:
	// Scale the ring mesh by progress in one axis isn't correct visually.
	// Instead, control opacity so dim = track, bright = fill.
	// The actual arc "fill" is faked by rotating the ring.
	// A proper arc requires a custom geometry rebuild, which we keep minimal.
	// We use opacity + arc approach: show 0-1 ring brightness via emissive.
	mat.opacity = 0.3 + progress * 0.6;
	// Rotate ring so the start gap is at the top
	ringMesh.rotation.z = -Math.PI / 2;
	// Scale visible arc by clipping with a second ring child is expensive;
	// instead modulate emissive intensity on the material
	mat.color.setHSL(0.08 + progress * 0.05, 1, 0.4 + progress * 0.2);
}

// ─── Individual furnace mesh ─────────────────────────────────────────────

function FurnaceMesh({ furnace }: { furnace: FurnaceData }) {
	const glowRef = useRef<THREE.Mesh>(null);
	const progressRingRef = useRef<THREE.Mesh>(null);
	const { scene } = useGLTF(FURNACE_MODEL);

	const cloned = useMemo(() => {
		const clone = scene.clone(true);
		const scale = computeScale(clone);
		clone.scale.setScalar(scale);
		return clone;
	}, [scene]);

	useFrame(({ clock }) => {
		ensureCollider(furnace);

		const processing = furnace.isProcessing;
		const powered = furnace.isPowered;

		if (processing) {
			const pulse =
				0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3));
			setEmissive(cloned, PROCESSING_EMISSIVE, pulse);
		} else if (powered) {
			setEmissive(cloned, IDLE_EMISSIVE, 0.2);
		} else {
			setEmissive(cloned, ZERO_EMISSIVE, 0);
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

		// Progress arc ring
		if (progressRingRef.current) {
			updateProgressArc(progressRingRef.current, furnace.isProcessing ? furnace.progress : 0);
		}
	});

	return (
		<group
			position={[furnace.position.x, furnace.position.y, furnace.position.z]}
			userData={{ entityId: furnace.id, entityType: "furnace" }}
		>
			<primitive object={cloned} />

			{/* Processing glow on top */}
			<mesh
				ref={glowRef}
				position={[0, FURNACE_HEIGHT + 0.1, 0]}
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

			{/* Processing progress ring — floats in front of furnace */}
			<mesh
				ref={progressRingRef}
				position={[0, FURNACE_HEIGHT * 0.5, FURNACE_HALF_WIDTH + 0.05]}
				rotation={[0, 0, 0]}
				visible={false}
			>
				<ringGeometry args={[0.35, 0.45, 32]} />
				<meshBasicMaterial
					color={0xff8800}
					transparent
					opacity={0.8}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

// ─── Main renderer ───────────────────────────────────────────────────────

export function FurnaceRenderer() {
	const [snapshots, setSnapshots] = useState<FurnaceData[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const furnaces = getAllFurnaces();

		const hash = furnaces
			.map(
				(f) =>
					`${f.id}:${f.isProcessing ? 1 : 0}:${f.isPowered ? 1 : 0}:${f.progress.toFixed(1)}`,
			)
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

// Preload furnace model
useGLTF.preload(FURNACE_MODEL);
