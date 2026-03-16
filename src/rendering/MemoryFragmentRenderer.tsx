/**
 * Memory Fragment Renderer — Glowing data crystals scattered in the world.
 *
 * Undiscovered fragments pulse with a subtle glow. Discovered but unread
 * fragments glow brighter. Read fragments dim to a faint trace.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
	getGlowColor,
	getGlowIntensity,
	getPlacedFragments,
	subscribeMemoryFragments,
} from "../systems/memoryFragments";

const CRYSTAL_GEOMETRY = new THREE.OctahedronGeometry(0.25, 0);

export function MemoryFragmentRenderer() {
	const [, setTrigger] = useState(0);
	const elapsedRef = useRef(0);

	useFrame((_, delta) => {
		elapsedRef.current += delta;
		// Re-render when fragment state changes
		setTrigger((p) => p + 1);
	});

	const fragments = getPlacedFragments();
	if (fragments.length === 0) return null;

	return (
		<group name="memory-fragments">
			{fragments.map((fragment, i) => (
				<FragmentCrystal
					key={`frag_${i}`}
					worldX={fragment.worldX}
					worldZ={fragment.worldZ}
					discovered={fragment.discovered}
					read={fragment.read}
					elapsed={elapsedRef.current}
					index={i}
				/>
			))}
		</group>
	);
}

function FragmentCrystal({
	worldX,
	worldZ,
	discovered,
	read,
	elapsed,
	index,
}: {
	worldX: number;
	worldZ: number;
	discovered: boolean;
	read: boolean;
	elapsed: number;
	index: number;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const lightRef = useRef<THREE.PointLight>(null);

	const [r, g, b] = getGlowColor();
	const baseIntensity = getGlowIntensity();

	const material = useMemo(() => {
		const emissiveIntensity = read ? 0.3 : discovered ? 1.5 : 0.8;
		return new THREE.MeshStandardMaterial({
			color: new THREE.Color(r * 0.5, g * 0.5, b * 0.5),
			emissive: new THREE.Color(r, g, b),
			emissiveIntensity,
			transparent: true,
			opacity: read ? 0.4 : 0.85,
		});
	}, [r, g, b, discovered, read]);

	// Animate rotation and glow
	useFrame(() => {
		if (!meshRef.current) return;

		// Gentle rotation
		meshRef.current.rotation.y = elapsed * 0.5 + index * 1.3;
		meshRef.current.rotation.x = Math.sin(elapsed * 0.3 + index) * 0.2;

		// Bobbing
		meshRef.current.position.y =
			0.8 + Math.sin(elapsed * 0.8 + index * 2) * 0.15;

		// Glow pulse
		if (lightRef.current && !read) {
			const pulse = discovered
				? 1.0 + 0.5 * Math.sin(elapsed * 3 + index)
				: 0.5 + 0.3 * Math.sin(elapsed * 1.5 + index);
			lightRef.current.intensity = baseIntensity * pulse;
		}

		// Material pulse
		const matPulse = read
			? 0.3
			: discovered
				? 1.2 + 0.4 * Math.sin(elapsed * 2.5 + index)
				: 0.6 + 0.3 * Math.sin(elapsed * 1.2 + index);
		material.emissiveIntensity = matPulse;
	});

	return (
		<group position={[worldX, 0, worldZ]}>
			<mesh
				ref={meshRef}
				geometry={CRYSTAL_GEOMETRY}
				material={material}
				position={[0, 0.8, 0]}
			/>

			{/* Point light for discovered fragments */}
			{!read && (
				<pointLight
					ref={lightRef}
					position={[0, 0.8, 0]}
					color={new THREE.Color(r, g, b)}
					intensity={baseIntensity * (discovered ? 1.0 : 0.4)}
					distance={discovered ? 6 : 3}
					decay={2}
				/>
			)}
		</group>
	);
}
