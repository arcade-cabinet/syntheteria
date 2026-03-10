/**
 * Floating HUD labels that display stockpile value and material breakdown.
 *
 * Uses @react-three/drei's <Html> to render an overlay anchored to each
 * stockpile cluster's centroid. Labels fade based on distance from the
 * camera — fully visible within 15 units, fully hidden beyond 40 units.
 *
 * Visibility is gated by a simple "player is looking at it" heuristic:
 * the cluster must be within the camera's forward frustum (dot product > 0)
 * and within the distance fade range.
 */

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CUBE_MATERIALS } from "../config/cubeMaterials.ts";
import {
	getStockpileClusters,
	type StockpileCluster,
} from "./StockpileGlow.tsx";

// Distance thresholds for fade
const FADE_NEAR = 15;
const FADE_FAR = 40;

/** Maximum labels to render at once */
const MAX_LABELS = 8;

function ClusterLabel({ cluster }: { cluster: StockpileCluster }) {
	const groupRef = useRef<THREE.Group>(null);
	const [opacity, setOpacity] = useState(0);
	const camera = useThree((state) => state.camera);

	// Pre-compute the material breakdown text
	const breakdownText = useMemo(() => {
		const entries: string[] = [];
		// Sort by count descending
		const sorted = Array.from(cluster.materialCounts.entries()).sort(
			(a, b) => b[1] - a[1],
		);
		for (const [matId, count] of sorted) {
			const matDef = CUBE_MATERIALS[matId];
			const name = matDef?.name ?? matId;
			entries.push(`${name} x${count}`);
		}
		return entries;
	}, [cluster.materialCounts]);

	const totalValueText = useMemo(
		() => `Value: ${cluster.totalValue}`,
		[cluster.totalValue],
	);

	// Per-frame fade and visibility check
	useFrame(() => {
		const camPos = camera.position;
		const dx = cluster.center.x - camPos.x;
		const dy = cluster.center.y - camPos.y;
		const dz = cluster.center.z - camPos.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		// Fade based on distance
		let alpha: number;
		if (dist <= FADE_NEAR) {
			alpha = 1.0;
		} else if (dist >= FADE_FAR) {
			alpha = 0.0;
		} else {
			alpha = 1.0 - (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR);
		}

		// Check if cluster is roughly in front of the camera
		if (alpha > 0) {
			const camDir = new THREE.Vector3();
			camera.getWorldDirection(camDir);
			const toCluster = new THREE.Vector3(dx, dy, dz).normalize();
			const dot = camDir.dot(toCluster);
			if (dot < 0.1) {
				alpha = 0;
			}
		}

		setOpacity(alpha);
	});

	if (opacity <= 0.01) return null;

	// Dominant material color for the label accent
	const matDef = CUBE_MATERIALS[cluster.dominantMaterial];
	const accentColor = matDef
		? `#${matDef.glowColor.toString(16).padStart(6, "0")}`
		: "#00ffaa";

	return (
		<group
			ref={groupRef}
			position={[
				cluster.center.x,
				cluster.center.y + 2.0,
				cluster.center.z,
			]}
		>
			<Html
				center
				distanceFactor={10}
				style={{
					opacity,
					transition: "opacity 0.15s ease-out",
					pointerEvents: "none",
				}}
			>
				<div
					style={{
						background: "rgba(0, 0, 0, 0.75)",
						border: `1px solid ${accentColor}`,
						borderRadius: "4px",
						padding: "6px 10px",
						fontFamily: "'Courier New', monospace",
						fontSize: "11px",
						lineHeight: "1.4",
						color: "#ccddcc",
						whiteSpace: "nowrap",
						textShadow: `0 0 8px ${accentColor}40`,
						minWidth: "80px",
						textAlign: "left",
					}}
				>
					<div
						style={{
							color: accentColor,
							fontWeight: "bold",
							fontSize: "12px",
							marginBottom: "3px",
							borderBottom: `1px solid ${accentColor}40`,
							paddingBottom: "3px",
						}}
					>
						{totalValueText}
					</div>
					{breakdownText.map((line) => (
						<div key={line} style={{ color: "#aabbaa" }}>
							{line}
						</div>
					))}
				</div>
			</Html>
		</group>
	);
}

/**
 * Renders floating wealth indicator labels above stockpile clusters.
 * Labels show total value and per-material breakdown.
 * Fades based on camera distance; hidden when out of view.
 */
export function WealthIndicator() {
	const clustersRef = useRef<StockpileCluster[]>([]);
	const camera = useThree((state) => state.camera);

	useFrame(() => {
		clustersRef.current = getStockpileClusters();
	});

	const initialClusters = useMemo(() => getStockpileClusters(), []);

	const clusters =
		clustersRef.current.length > 0 ? clustersRef.current : initialClusters;

	if (clusters.length === 0) return null;

	// Sort by distance to camera and take closest N
	const camPos = camera.position;
	const sorted = clusters
		.map((c) => ({
			cluster: c,
			dist:
				(c.center.x - camPos.x) ** 2 +
				(c.center.y - camPos.y) ** 2 +
				(c.center.z - camPos.z) ** 2,
		}))
		.sort((a, b) => a.dist - b.dist)
		.slice(0, MAX_LABELS);

	return (
		<>
			{sorted.map(({ cluster }, i) => (
				<ClusterLabel
					key={`wealth-${i}-${cluster.center.x.toFixed(1)}-${cluster.center.z.toFixed(1)}`}
					cluster={cluster}
				/>
			))}
		</>
	);
}
