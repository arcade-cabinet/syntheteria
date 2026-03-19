/**
 * FragmentRenderer — renders glowing data crystals at memory fragment locations.
 *
 * Subscribes to the memory fragments module-level state and places an emissive
 * octahedron mesh + Sparkles at each placed fragment. Undiscovered fragments
 * pulse gently; discovered-but-unread fragments glow brighter; read fragments
 * dim to a faint marker.
 */

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import {
	FRAGMENT_CONFIG,
	getPlacedFragments,
	subscribeMemoryFragments,
	type PlacedFragment,
} from "../ecs/systems/memoryFragments";

// ─── Constants ────────────────────────────────────────────────────────────────

const CRYSTAL_SIZE = TILE_SIZE_M * 0.15;
const CRYSTAL_Y = TILE_SIZE_M * 0.3;
const [glowR, glowG, glowB] = FRAGMENT_CONFIG.glowColor;
const GLOW_COLOR = new THREE.Color(glowR, glowG, glowB);

// ─── Single Fragment Mesh ─────────────────────────────────────────────────────

function FragmentCrystal({
	fragment,
}: {
	fragment: PlacedFragment;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const matRef = useRef<THREE.MeshStandardMaterial>(null);

	const wx = fragment.worldX * TILE_SIZE_M;
	const wz = fragment.worldZ * TILE_SIZE_M;

	useFrame((state) => {
		if (!meshRef.current || !matRef.current) return;

		// Gentle hover bob + rotation
		const t = state.clock.elapsedTime;
		meshRef.current.position.y = CRYSTAL_Y + Math.sin(t * 1.5 + wx) * 0.08;
		meshRef.current.rotation.y = t * 0.6;

		// Pulse emissive intensity based on state
		if (fragment.read) {
			matRef.current.emissiveIntensity = 0.3;
		} else if (fragment.discovered) {
			matRef.current.emissiveIntensity = 1.5 + Math.sin(t * 3.0) * 0.5;
		} else {
			matRef.current.emissiveIntensity = 0.8 + Math.sin(t * 1.2) * 0.3;
		}
	});

	return (
		<group position={[wx, 0, wz]}>
			<mesh ref={meshRef} position={[0, CRYSTAL_Y, 0]}>
				<octahedronGeometry args={[CRYSTAL_SIZE, 0]} />
				<meshStandardMaterial
					ref={matRef}
					color={0x112233}
					emissive={GLOW_COLOR}
					emissiveIntensity={FRAGMENT_CONFIG.glowIntensity}
					transparent
					opacity={fragment.read ? 0.4 : 0.85}
					depthWrite={false}
				/>
			</mesh>
			{!fragment.read && (
				<Sparkles
					count={12}
					scale={[TILE_SIZE_M * 0.5, TILE_SIZE_M * 0.6, TILE_SIZE_M * 0.5]}
					position={[0, CRYSTAL_Y, 0]}
					size={2}
					speed={0.3}
					color={`#${GLOW_COLOR.getHexString()}`}
					opacity={fragment.discovered ? 0.9 : 0.5}
				/>
			)}
		</group>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FragmentRenderer() {
	const [, setTick] = useState(0);

	useEffect(() => {
		return subscribeMemoryFragments(() => setTick((t) => t + 1));
	}, []);

	const fragments = useMemo(() => getPlacedFragments(), [setTick]);

	if (fragments.length === 0) return null;

	return (
		<>
			{fragments.map((f) => (
				<FragmentCrystal key={f.fragmentId} fragment={f} />
			))}
		</>
	);
}
