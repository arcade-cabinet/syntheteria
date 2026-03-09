/**
 * Procedurally renders otters — small furry creatures roaming the ruins.
 *
 * Each otter is composed of basic Three.js primitives assembled into a
 * recognisable otter shape: elongated body, rounded head with ears,
 * bright eyes, nose, paws, and an animated tail that sways as they move.
 *
 * The whole group faces the otter's current wander direction and bobs
 * gently so they feel alive rather than static.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { OtterEntity } from "../ecs/types";
import { otters } from "../ecs/world";

// Otter colour palette
const COLOR_FUR = 0x7a4e2d; // rich dark brown
const COLOR_BELLY = 0xc49a6c; // warm tan underside
const COLOR_DARK = 0x150a04; // near-black for eyes and nose
const COLOR_NOSE = 0x3a1a0a; // slightly warmer dark for nose

/** Derive a stable per-otter phase offset from its id string. */
function otterPhaseOffset(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) {
		h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
	}
	return ((h >>> 0) / 0xffffffff) * Math.PI * 2;
}

function OtterMesh({ entity }: { entity: OtterEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const tailGroupRef = useRef<THREE.Group>(null);
	const leftFrontPawRef = useRef<THREE.Mesh>(null);
	const rightFrontPawRef = useRef<THREE.Mesh>(null);
	const leftBackPawRef = useRef<THREE.Mesh>(null);
	const rightBackPawRef = useRef<THREE.Mesh>(null);

	const phaseOffset = otterPhaseOffset(entity.id);

	useFrame((state) => {
		if (!groupRef.current) return;

		const t = state.clock.elapsedTime;
		const bob = Math.sin(t * 2.1 + phaseOffset) * 0.025;

		const wp = entity.worldPosition;
		groupRef.current.position.set(wp.x, wp.y + 0.13 + bob, wp.z);

		// Face movement direction
		const { x, z } = entity.otter.wanderDir;
		if (x !== 0 || z !== 0) {
			groupRef.current.rotation.y = Math.atan2(x, z);
		}

		// Tail sway
		if (tailGroupRef.current) {
			tailGroupRef.current.rotation.y = Math.sin(t * 3.5 + phaseOffset) * 0.45;
		}

		// Subtle paw paddle — alternating pairs
		const stride = Math.sin(t * 4 + phaseOffset);
		if (leftFrontPawRef.current)
			leftFrontPawRef.current.position.z = 0.13 + stride * 0.04;
		if (rightFrontPawRef.current)
			rightFrontPawRef.current.position.z = 0.13 - stride * 0.04;
		if (leftBackPawRef.current)
			leftBackPawRef.current.position.z = -0.12 - stride * 0.04;
		if (rightBackPawRef.current)
			rightBackPawRef.current.position.z = -0.12 + stride * 0.04;
	});

	return (
		<group ref={groupRef}>
			{/* ── Body ─────────────────────────────────────────────── */}
			{/* Main barrel — elongated sphere */}
			<mesh scale={[1, 0.55, 1.7]}>
				<sphereGeometry args={[0.19, 10, 7]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>

			{/* Belly patch — lighter underside */}
			<mesh position={[0, -0.07, 0]} scale={[0.72, 0.38, 1.25]}>
				<sphereGeometry args={[0.19, 10, 7]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>

			{/* ── Head ─────────────────────────────────────────────── */}
			<mesh position={[0, 0.05, 0.27]}>
				<sphereGeometry args={[0.135, 10, 7]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>

			{/* Cheek pouches — slight widening at the sides */}
			<mesh position={[-0.09, 0.02, 0.3]} scale={[1, 0.8, 0.8]}>
				<sphereGeometry args={[0.075, 7, 5]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>
			<mesh position={[0.09, 0.02, 0.3]} scale={[1, 0.8, 0.8]}>
				<sphereGeometry args={[0.075, 7, 5]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>

			{/* ── Ears ─────────────────────────────────────────────── */}
			<mesh position={[-0.09, 0.16, 0.23]}>
				<sphereGeometry args={[0.048, 7, 5]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>
			<mesh position={[0.09, 0.16, 0.23]}>
				<sphereGeometry args={[0.048, 7, 5]} />
				<meshLambertMaterial color={COLOR_FUR} />
			</mesh>

			{/* ── Face ─────────────────────────────────────────────── */}
			{/* Left eye */}
			<mesh position={[-0.062, 0.08, 0.39]}>
				<sphereGeometry args={[0.026, 6, 5]} />
				<meshLambertMaterial color={COLOR_DARK} />
			</mesh>
			{/* Left eye highlight */}
			<mesh position={[-0.055, 0.092, 0.414]}>
				<sphereGeometry args={[0.008, 4, 4]} />
				<meshLambertMaterial color={0xffffff} />
			</mesh>

			{/* Right eye */}
			<mesh position={[0.062, 0.08, 0.39]}>
				<sphereGeometry args={[0.026, 6, 5]} />
				<meshLambertMaterial color={COLOR_DARK} />
			</mesh>
			{/* Right eye highlight */}
			<mesh position={[0.069, 0.092, 0.414]}>
				<sphereGeometry args={[0.008, 4, 4]} />
				<meshLambertMaterial color={0xffffff} />
			</mesh>

			{/* Nose — slightly rounded triangle shape approximated with a squashed sphere */}
			<mesh position={[0, 0.045, 0.415]} scale={[1.1, 0.7, 0.8]}>
				<sphereGeometry args={[0.032, 6, 5]} />
				<meshLambertMaterial color={COLOR_NOSE} />
			</mesh>

			{/* Whisker stubs — thin horizontal boxes */}
			<mesh position={[-0.11, 0.038, 0.395]} rotation={[0, 0.15, 0]}>
				<boxGeometry args={[0.09, 0.008, 0.008]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			<mesh position={[0.11, 0.038, 0.395]} rotation={[0, -0.15, 0]}>
				<boxGeometry args={[0.09, 0.008, 0.008]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			<mesh position={[-0.11, 0.022, 0.393]} rotation={[0, 0.08, 0]}>
				<boxGeometry args={[0.085, 0.008, 0.008]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			<mesh position={[0.11, 0.022, 0.393]} rotation={[0, -0.08, 0]}>
				<boxGeometry args={[0.085, 0.008, 0.008]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>

			{/* ── Tail ─────────────────────────────────────────────── */}
			{/* Tail pivots at the base so the sway looks natural */}
			<group ref={tailGroupRef} position={[0, 0.04, -0.31]}>
				{/* Base segment — thicker */}
				<mesh>
					<sphereGeometry args={[0.09, 8, 5]} />
					<meshLambertMaterial color={COLOR_FUR} />
				</mesh>
				{/* Mid segment */}
				<mesh position={[0, 0, -0.14]}>
					<sphereGeometry args={[0.07, 7, 5]} />
					<meshLambertMaterial color={COLOR_FUR} />
				</mesh>
				{/* Tip — thinnest */}
				<mesh position={[0, 0, -0.26]}>
					<sphereGeometry args={[0.05, 6, 4]} />
					<meshLambertMaterial color={COLOR_FUR} />
				</mesh>
			</group>

			{/* ── Paws ─────────────────────────────────────────────── */}
			{/* Front left */}
			<mesh ref={leftFrontPawRef} position={[-0.14, -0.09, 0.13]}>
				<sphereGeometry args={[0.055, 6, 4]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			{/* Front right */}
			<mesh ref={rightFrontPawRef} position={[0.14, -0.09, 0.13]}>
				<sphereGeometry args={[0.055, 6, 4]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			{/* Back left */}
			<mesh ref={leftBackPawRef} position={[-0.14, -0.09, -0.12]}>
				<sphereGeometry args={[0.063, 6, 4]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
			{/* Back right */}
			<mesh ref={rightBackPawRef} position={[0.14, -0.09, -0.12]}>
				<sphereGeometry args={[0.063, 6, 4]} />
				<meshLambertMaterial color={COLOR_BELLY} />
			</mesh>
		</group>
	);
}

export function OtterRenderer() {
	return (
		<>
			{Array.from(otters).map((entity) => (
				<OtterMesh key={entity.id} entity={entity} />
			))}
		</>
	);
}
