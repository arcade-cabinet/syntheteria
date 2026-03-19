/**
 * TitleText — per-character arc wrapping around the globe equator.
 * Extracted from TitleMenuScene for reuse in the persistent globe.
 *
 * Each character is a separate <Text> positioned on a circular arc.
 * Rotation faces outward (toward camera). depthTest=false + renderOrder=10.
 * onSync on the first character gates visibility until troika font loads.
 */

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

export interface TitleTextProps {
	/** 0→1 opacity for fade-out during generation phase. */
	opacity?: number;
}

export function TitleText({ opacity = 1 }: TitleTextProps) {
	const [ready, setReady] = useState(false);
	const groupRef = useRef<THREE.Group>(null);

	// Gentle oscillation — subtle bob, NOT rotation (text stays camera-facing)
	useFrame((state) => {
		if (groupRef.current) {
			groupRef.current.position.y =
				Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
		}
	});

	const title = "SYNTHETERIA";
	const subtitle = "MACHINE CONSCIOUSNESS AWAKENS";
	const radius = 3.0; // above globe surface (r=2.5)
	const titleArc = Math.PI * 0.55; // ~100° arc
	const subArc = Math.PI * 0.5; // ~90° arc

	const visible = ready && opacity > 0;

	return (
		<group ref={groupRef} visible={visible}>
			{/* Title characters — cigar band at equator */}
			{title.split("").map((char, i) => {
				const angle = -titleArc / 2 + (i / (title.length - 1)) * titleArc;
				const x = Math.sin(angle) * radius;
				const z = Math.cos(angle) * radius;
				return (
					<Text
						key={`t${i}`}
						position={[x, 0.3, z]}
						rotation={[0, angle, 0]}
						fontSize={0.55}
						anchorX="center"
						anchorY="middle"
						renderOrder={10}
						outlineWidth={0.015}
						outlineColor="#3a6a8a"
						onSync={i === 0 ? () => setReady(true) : undefined}
					>
						{char}
						<meshBasicMaterial
							color="#aaeeff"
							toneMapped={false}
							depthTest={false}
							transparent
							opacity={opacity}
						/>
					</Text>
				);
			})}

			{/* Subtitle characters — smaller, below title */}
			{subtitle.split("").map((char, i) => {
				const angle = -subArc / 2 + (i / (subtitle.length - 1)) * subArc;
				const x = Math.sin(angle) * radius;
				const z = Math.cos(angle) * radius;
				return (
					<Text
						key={`s${i}`}
						position={[x, -0.25, z]}
						rotation={[0, angle, 0]}
						fontSize={0.12}
						anchorX="center"
						anchorY="middle"
						renderOrder={10}
					>
						{char}
						<meshBasicMaterial
							color="#8be6ff"
							toneMapped={false}
							depthTest={false}
							transparent
							opacity={opacity}
						/>
					</Text>
				);
			})}
		</group>
	);
}
