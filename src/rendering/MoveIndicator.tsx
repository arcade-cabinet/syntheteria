/**
 * Shows a brief pulsing ring at the move destination when a unit is commanded.
 * Fades out over ~1 second.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

interface MoveMarker {
	x: number;
	y: number;
	z: number;
	age: number;
}

const MARKER_LIFETIME = 1.0; // seconds

// Singleton store — UnitInput calls addMoveMarker, renderer reads markers
let markers: MoveMarker[] = [];

export function addMoveMarker(x: number, y: number, z: number) {
	markers.push({ x, y, z, age: 0 });
}

export function MoveIndicator() {
	const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
	const [, forceUpdate] = useState(0);

	useFrame((_, delta) => {
		let changed = false;
		for (const m of markers) {
			m.age += delta;
		}
		const before = markers.length;
		markers = markers.filter((m) => m.age < MARKER_LIFETIME);
		if (markers.length !== before) changed = true;

		// Update mesh transforms
		for (let i = 0; i < markers.length; i++) {
			const mesh = meshRefs.current[i];
			if (!mesh) continue;
			const m = markers[i];
			const t = m.age / MARKER_LIFETIME;
			mesh.position.set(m.x, m.y + 0.05, m.z);
			// Expand from 0.3 to 1.0 radius as it fades
			const scale = 0.3 + t * 0.7;
			mesh.scale.set(scale, scale, scale);
			const mat = mesh.material as THREE.MeshBasicMaterial;
			mat.opacity = 0.6 * (1 - t);
		}

		// Re-render when marker count changes (so JSX elements are created/removed)
		if (changed) forceUpdate((n) => n + 1);
	});

	return (
		<>
			{markers.map((m, i) => (
				<mesh
					key={`${m.x.toFixed(2)}_${m.z.toFixed(2)}`}
					ref={(el) => {
						meshRefs.current[i] = el;
					}}
					rotation={[-Math.PI / 2, 0, 0]}
				>
					<ringGeometry args={[0.4, 0.55, 16]} />
					<meshBasicMaterial
						color={0x44ffaa}
						transparent
						opacity={0.6}
						side={THREE.DoubleSide}
						depthWrite={false}
					/>
				</mesh>
			))}
		</>
	);
}
