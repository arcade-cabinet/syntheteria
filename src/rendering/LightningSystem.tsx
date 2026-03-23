import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import {
	type BoltInstance,
	type BoltPoint,
	getLightningState,
	setLightningCameraPosition,
} from "../systems/lightning";

/**
 * Lightning bolt renderer — pure rendering, no game logic.
 *
 * Reads bolt state from systems/lightning.ts each frame and draws.
 * All scheduling, spawning, and expiration lives in the system.
 *
 * Rendering technique:
 * - Each bolt renders as THREE.Line via <primitive> (avoids JSX <line>/SVG collision)
 * - Multi-layer glow: 3 passes per bolt (outer halo, mid glow, bright core)
 * - Flash: PointLight at strike position during active bolt
 * - Bolt age computed from sim ticks for consistent timing with game speed
 */

const TICKS_PER_SECOND = 60;

// --- Helpers ---

function boltPointsToVectors(points: BoltPoint[]): THREE.Vector3[] {
	return points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
}

// --- Sub-components ---

/** Single bolt line — 3-pass glow via THREE.Line primitives */
function BoltLine({
	points,
	color,
	opacity,
}: {
	points: BoltPoint[];
	color: THREE.Color;
	opacity: number;
}) {
	const lines = useMemo(() => {
		const vectors = boltPointsToVectors(points);
		const geo = new THREE.BufferGeometry().setFromPoints(vectors);

		const haloMat = new THREE.LineBasicMaterial({
			color,
			transparent: true,
			opacity: opacity * 0.15,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const glowMat = new THREE.LineBasicMaterial({
			color,
			transparent: true,
			opacity: opacity * 0.5,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const coreMat = new THREE.LineBasicMaterial({
			color: new THREE.Color(1, 1, 1),
			transparent: true,
			opacity: opacity * 0.9,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});

		return {
			halo: new THREE.Line(geo, haloMat),
			glow: new THREE.Line(geo, glowMat),
			core: new THREE.Line(geo, coreMat),
		};
	}, [points, color, opacity]);

	return (
		<group>
			<primitive object={lines.halo} />
			<primitive object={lines.glow} />
			<primitive object={lines.core} />
		</group>
	);
}

/** Compute bolt opacity from sim tick age */
function computeBoltOpacity(
	ageTicks: number,
	strikeDuration: number,
	afterglowDuration: number,
): number {
	const ageSeconds = ageTicks / TICKS_PER_SECOND;
	const totalDuration = strikeDuration + afterglowDuration;

	if (ageSeconds > totalDuration || ageSeconds < 0) return 0;

	if (ageSeconds < strikeDuration) {
		const flickerPhase = ageSeconds / strikeDuration;
		return 0.6 + 0.4 * Math.abs(Math.sin(flickerPhase * Math.PI * 3));
	}

	return 1.0 - (ageSeconds - strikeDuration) / afterglowDuration;
}

/** Render a single complete bolt with branches and flash light */
function BoltRenderer({
	bolt,
	currentTick,
}: {
	bolt: BoltInstance;
	currentTick: number;
}) {
	const state = getLightningState();
	const ageTicks = currentTick - bolt.spawnTick;
	const opacity = computeBoltOpacity(
		ageTicks,
		state.strikeDuration,
		state.afterglowDuration,
	);

	const [cr, cg, cb] = bolt.isRodCapture
		? state.colors.rodCapture
		: state.colors.ambient;
	const baseColor = useMemo(() => new THREE.Color(cr, cg, cb), [cr, cg, cb]);

	if (opacity <= 0) return null;

	const flashIntensity = bolt.isRodCapture
		? state.flashIntensity.rodCapture
		: state.flashIntensity.ambient;
	const flashDist = bolt.isRodCapture
		? state.flashDistance.rodCapture
		: state.flashDistance.ambient;

	const [fr, fg, fb] = bolt.isRodCapture
		? state.colors.rodCapture
		: state.colors.flash;

	const ageSeconds = ageTicks / TICKS_PER_SECOND;
	const isStrikePhase = ageSeconds < state.strikeDuration;

	return (
		<group>
			<BoltLine points={bolt.points} color={baseColor} opacity={opacity} />

			{bolt.branches.map((branch, i) => (
				<BoltLine
					key={i}
					points={branch}
					color={baseColor}
					opacity={opacity * 0.6}
				/>
			))}

			{isStrikePhase && (
				<pointLight
					position={[bolt.strikeX, bolt.strikeY, bolt.strikeZ]}
					color={[fr, fg, fb]}
					intensity={flashIntensity * opacity}
					distance={flashDist}
					decay={2}
				/>
			)}
		</group>
	);
}

// --- Main component ---

export function LightningSystem() {
	const { camera } = useThree();
	const [, setRenderTick] = useState(0);

	useFrame(() => {
		// Feed camera position to the system
		setLightningCameraPosition(camera.position.x, camera.position.z);
		// Trigger re-render to pick up new bolt state
		setRenderTick((t) => t + 1);
	});

	const state = getLightningState();

	return (
		<group>
			{state.activeBolts.map((bolt, i) => (
				<BoltRenderer
					key={`${bolt.spawnTick}-${i}`}
					bolt={bolt}
					currentTick={state.currentTick}
				/>
			))}
		</group>
	);
}
