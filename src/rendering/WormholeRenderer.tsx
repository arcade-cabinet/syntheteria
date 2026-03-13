/**
 * Wormhole Renderer — Visible portal effect for the wormhole endgame structure.
 *
 * Visual stages:
 *   - foundation: flat glowing ring on the ground
 *   - frame: rising energy columns forming a portal frame
 *   - vortex: swirling energy vortex forming inside the frame
 *   - stabilization: pulsing portal nearing completion
 *   - complete: fully open wormhole portal — victory
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
	getWormholeProgress,
	getWormholeState,
	getWormholeVisualPhase,
	subscribeWormhole,
} from "../systems/wormhole";

const PORTAL_RADIUS = 3;
const PORTAL_HEIGHT = 5;

export function WormholeRenderer() {
	const [, setTrigger] = useState(0);
	const ringRef = useRef<THREE.Mesh>(null);
	const vortexRef = useRef<THREE.Mesh>(null);
	const elapsedRef = useRef(0);

	// Subscribe to wormhole state changes
	useFrame((_, delta) => {
		elapsedRef.current += delta;

		const state = getWormholeState();
		if (state) {
			setTrigger((p) => p + 1);
		}

		// Animate ring glow
		if (ringRef.current) {
			const mat = ringRef.current.material as THREE.MeshBasicMaterial;
			const pulse = 0.6 + 0.4 * Math.sin(elapsedRef.current * 2);
			mat.opacity = pulse * 0.8;
		}

		// Animate vortex rotation
		if (vortexRef.current) {
			vortexRef.current.rotation.y += delta * 1.5;
			const mat = vortexRef.current.material as THREE.MeshBasicMaterial;
			const pulse = 0.4 + 0.3 * Math.sin(elapsedRef.current * 3);
			mat.opacity = pulse;
		}
	});

	const state = getWormholeState();
	if (!state) return null;

	const phase = getWormholeVisualPhase();
	const progress = getWormholeProgress();

	return (
		<group position={[state.worldX, 0, state.worldZ]} name="wormhole">
			{/* Foundation ring — always visible once construction starts */}
			<FoundationRing ref={ringRef} progress={progress} />

			{/* Portal frame columns — visible from frame phase onward */}
			{phase !== "foundation" && <PortalFrame progress={progress} />}

			{/* Vortex — visible from vortex phase onward */}
			{(phase === "vortex" ||
				phase === "stabilization" ||
				phase === "complete") && (
				<Vortex
					ref={vortexRef}
					progress={progress}
					complete={phase === "complete"}
				/>
			)}

			{/* Completion glow — only when done */}
			{phase === "complete" && <CompletionGlow />}
		</group>
	);
}

// ─── Foundation Ring ─────────────────────────────────────────────────────────

const FoundationRing = ({
	progress,
}: {
	progress: number;
	ref?: React.Ref<THREE.Mesh>;
}) => {
	const ringGeom = useMemo(
		() => new THREE.RingGeometry(PORTAL_RADIUS - 0.3, PORTAL_RADIUS, 32),
		[],
	);

	const ringMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: new THREE.Color(0.3, 0.6, 1.0),
				transparent: true,
				opacity: 0.6,
				side: THREE.DoubleSide,
			}),
		[],
	);

	return (
		<mesh
			geometry={ringGeom}
			material={ringMat}
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, 0.02, 0]}
		/>
	);
};

// ─── Portal Frame ────────────────────────────────────────────────────────────

function PortalFrame({ progress }: { progress: number }) {
	const columnCount = 8;
	const currentHeight = PORTAL_HEIGHT * Math.min(progress * 2, 1);

	const columnMat = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: new THREE.Color(0.2, 0.5, 0.9),
				emissive: new THREE.Color(0.1, 0.3, 0.8),
				emissiveIntensity: 1.5,
				transparent: true,
				opacity: 0.7,
			}),
		[],
	);

	const columnGeom = useMemo(
		() => new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
		[],
	);

	const columns = useMemo(() => {
		const result: Array<{ x: number; z: number; angle: number }> = [];
		for (let i = 0; i < columnCount; i++) {
			const angle = (i / columnCount) * Math.PI * 2;
			result.push({
				x: Math.cos(angle) * PORTAL_RADIUS,
				z: Math.sin(angle) * PORTAL_RADIUS,
				angle,
			});
		}
		return result;
	}, []);

	return (
		<>
			{columns.map((col, i) => (
				<mesh
					key={`col_${i}`}
					geometry={columnGeom}
					material={columnMat}
					position={[col.x, currentHeight / 2, col.z]}
					scale={[1, currentHeight, 1]}
				/>
			))}
		</>
	);
}

// ─── Vortex ──────────────────────────────────────────────────────────────────

const Vortex = ({
	progress,
	complete,
}: {
	progress: number;
	complete: boolean;
	ref?: React.Ref<THREE.Mesh>;
}) => {
	const vortexGeom = useMemo(
		() => new THREE.TorusGeometry(PORTAL_RADIUS * 0.7, 0.15, 8, 32),
		[],
	);

	const intensity = complete ? 2.0 : 0.5 + progress * 1.5;
	const color = complete
		? new THREE.Color(0.5, 0.8, 1.0)
		: new THREE.Color(0.2, 0.4, 0.9);

	const vortexMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.5,
				side: THREE.DoubleSide,
			}),
		[color],
	);

	return (
		<mesh
			geometry={vortexGeom}
			material={vortexMat}
			position={[0, PORTAL_HEIGHT * 0.6, 0]}
			rotation={[Math.PI / 2, 0, 0]}
		/>
	);
};

// ─── Completion Glow ─────────────────────────────────────────────────────────

function CompletionGlow() {
	const lightRef = useRef<THREE.PointLight>(null);

	useFrame((_, delta) => {
		if (!lightRef.current) return;
		const t = Date.now() * 0.001;
		lightRef.current.intensity = 3 + Math.sin(t * 2) * 1.5;
	});

	return (
		<pointLight
			ref={lightRef}
			position={[0, PORTAL_HEIGHT * 0.6, 0]}
			color={new THREE.Color(0.4, 0.7, 1.0)}
			intensity={3}
			distance={20}
			decay={2}
		/>
	);
}
