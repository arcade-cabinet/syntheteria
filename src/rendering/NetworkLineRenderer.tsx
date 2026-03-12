import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import networksConfig from "../config/networks.json";
import {
	type FactionId,
	type JunctionNode,
	type NetworkSegment,
	type NetworkType,
	getNetworkOverlayState,
} from "../systems/networkOverlay";

/**
 * Network Line Renderer
 *
 * Pure renderer — no game logic. Reads getNetworkOverlayState() and draws:
 * - Signal relay lines: thin emissive with animated pulse particles
 * - Power feed lines: medium emissive with glow intensity tied to throughput
 * - Conduit route lines: embedded mint traces with animated flow pattern
 * - Junction nodes: emissive circles at multi-network intersections
 *
 * All visual parameters come from networks.json config.
 * Uses THREE.Line with <primitive> to avoid JSX <line>/SVG collision.
 */

// --- Module-level color cache ---

const _colorCache = new Map<string, THREE.Color>();

function getCachedColor(key: string, rgb: number[]): THREE.Color {
	if (!_colorCache.has(key)) {
		_colorCache.set(key, new THREE.Color(rgb[0], rgb[1], rgb[2]));
	}
	return _colorCache.get(key)!;
}

// --- Bezier curve helpers ---

/**
 * Compute a quadratic bezier curve between two sector centers.
 * The control point is offset perpendicular to the line direction,
 * creating a slight curve through the sector center.
 */
function computeBezierPoints(
	from: { x: number; z: number },
	to: { x: number; z: number },
	controlOffset: number,
	parallelIndex: number,
	parallelOffset: number,
	segments: number = 12,
): THREE.Vector3[] {
	const dx = to.x - from.x;
	const dz = to.z - from.z;
	const len = Math.sqrt(dx * dx + dz * dz);
	if (len === 0) return [];

	// Direction and perpendicular
	const dirX = dx / len;
	const dirZ = dz / len;
	const perpX = -dirZ;
	const perpZ = dirX;

	// Apply parallel offset
	const offsetX = perpX * parallelIndex * parallelOffset;
	const offsetZ = perpZ * parallelIndex * parallelOffset;

	// Control point at midpoint, offset perpendicular for curve
	const midX = (from.x + to.x) / 2 + perpX * controlOffset;
	const midZ = (from.z + to.z) / 2 + perpZ * controlOffset;

	const points: THREE.Vector3[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const u = 1 - t;
		// Quadratic bezier: (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
		const x =
			u * u * (from.x + offsetX) +
			2 * u * t * (midX + offsetX) +
			t * t * (to.x + offsetX);
		const z =
			u * u * (from.z + offsetZ) +
			2 * u * t * (midZ + offsetZ) +
			t * t * (to.z + offsetZ);

		points.push(new THREE.Vector3(x, 0, z));
	}

	return points;
}

// --- Segment line component ---

function SegmentLine({
	segment,
	elapsedTime,
}: {
	segment: NetworkSegment;
	elapsedTime: number;
}) {
	const lineRef = useRef<THREE.Line>(null);

	const { geometry, material, yOffset, isConduit } = useMemo(() => {
		const config = networksConfig[segment.type];
		const controlOffset =
			"bezierControlOffset" in config ? config.bezierControlOffset : 0.15;
		const yo = "yOffset" in config ? config.yOffset : -0.02;

		const points = computeBezierPoints(
			segment.from,
			segment.to,
			controlOffset,
			segment.parallelIndex,
			networksConfig.parallelOffset,
		);

		const geom = new THREE.BufferGeometry().setFromPoints(points);

		// Get color based on network type and faction
		let color: THREE.Color;
		if (segment.type === "signal") {
			const factionColors =
				networksConfig.signal.factionColors[
					segment.faction as keyof typeof networksConfig.signal.factionColors
				] ?? networksConfig.signal.factionColors.neutral;
			color = getCachedColor(
				`signal_${segment.faction}`,
				factionColors,
			);
		} else if (segment.type === "power") {
			color = getCachedColor("power", networksConfig.power.color);
		} else {
			const factionColors =
				networksConfig.conduit.factionColors[
					segment.faction as keyof typeof networksConfig.conduit.factionColors
				] ?? networksConfig.conduit.factionColors.neutral;
			color = getCachedColor(`conduit_${segment.faction}`, factionColors);
		}

		// Conduit lines use LineDashedMaterial for embedded flow animation
		let mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
		if (segment.type === "conduit") {
			geom.computeBoundingSphere();
			// Compute line distances for dash pattern
			const positions = geom.attributes.position;
			const lineDistances = new Float32Array(positions.count);
			let totalDist = 0;
			for (let i = 0; i < positions.count; i++) {
				if (i > 0) {
					const dx = positions.getX(i) - positions.getX(i - 1);
					const dy = positions.getY(i) - positions.getY(i - 1);
					const dz = positions.getZ(i) - positions.getZ(i - 1);
					totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
				}
				lineDistances[i] = totalDist;
			}
			geom.setAttribute(
				"lineDistance",
				new THREE.BufferAttribute(lineDistances, 1),
			);

			mat = new THREE.LineDashedMaterial({
				color: color.clone(),
				linewidth: 1,
				transparent: true,
				opacity: 0.9,
				dashSize: networksConfig.conduit.dashLength,
				gapSize: networksConfig.conduit.gapLength,
			});
		} else {
			mat = new THREE.LineBasicMaterial({
				color: color.clone(),
				linewidth: 1,
				transparent: true,
				opacity: 0.9,
			});
		}

		return {
			geometry: geom,
			material: mat,
			yOffset: yo,
			isConduit: segment.type === "conduit",
		};
	}, [
		segment.from.x,
		segment.from.z,
		segment.to.x,
		segment.to.z,
		segment.type,
		segment.faction,
		segment.parallelIndex,
	]);

	// Animate material properties per frame
	useFrame(() => {
		if (!material) return;

		if (segment.type === "power") {
			// Power lines: glow intensity scales with throughput
			const minGlow = networksConfig.power.glowIntensityMin;
			const maxGlow = networksConfig.power.glowIntensityMax;
			const intensity =
				minGlow + segment.throughput * (maxGlow - minGlow);
			material.opacity = 0.5 + segment.throughput * 0.4;

			if (segment.throughput < 0.1) {
				const unpowered = getCachedColor(
					"power_off",
					networksConfig.power.unpoweredColor,
				);
				material.color.copy(unpowered);
				material.opacity = 0.3;
			}
		} else if (segment.type === "signal") {
			// Signal lines: subtle pulse animation
			const pulse =
				0.7 +
				0.3 *
					Math.sin(
						elapsedTime * networksConfig.signal.pulseSpeed * Math.PI * 2,
					);
			material.opacity = pulse * 0.8;
		} else if (segment.type === "conduit" && isConduit) {
			// Conduit lines: animated dash offset for embedded flow effect
			// dashOffset is a runtime property not in the TS declarations
			const dashCycle =
				networksConfig.conduit.dashLength + networksConfig.conduit.gapLength;
			// biome-ignore lint: dashOffset is a runtime property not in TS declarations
			(material as unknown as { dashOffset: number }).dashOffset =
				-(elapsedTime * networksConfig.conduit.animationSpeed) % dashCycle;
			material.opacity = 0.9;
		}
	});

	const lineObj = useMemo(() => {
		return new THREE.Line(geometry, material as THREE.LineBasicMaterial);
	}, [geometry, material]);

	return (
		<primitive
			object={lineObj}
			position={[0, yOffset, 0]}
		/>
	);
}

// --- Glow pass for thicker appearance ---

function SegmentGlow({
	segment,
}: {
	segment: NetworkSegment;
}) {
	const { lineObj, yOffset } = useMemo(() => {
		const config = networksConfig[segment.type];
		const controlOffset =
			"bezierControlOffset" in config ? config.bezierControlOffset : 0.15;
		const yo = "yOffset" in config ? config.yOffset : -0.02;

		const points = computeBezierPoints(
			segment.from,
			segment.to,
			controlOffset,
			segment.parallelIndex,
			networksConfig.parallelOffset,
		);

		const geom = new THREE.BufferGeometry().setFromPoints(points);

		let color: THREE.Color;
		if (segment.type === "signal") {
			const factionColors =
				networksConfig.signal.factionColors[
					segment.faction as keyof typeof networksConfig.signal.factionColors
				] ?? networksConfig.signal.factionColors.neutral;
			color = getCachedColor(
				`signal_${segment.faction}`,
				factionColors,
			);
		} else if (segment.type === "power") {
			color = getCachedColor("power", networksConfig.power.color);
		} else {
			const factionColors =
				networksConfig.conduit.factionColors[
					segment.faction as keyof typeof networksConfig.conduit.factionColors
				] ?? networksConfig.conduit.factionColors.neutral;
			color = getCachedColor(`conduit_${segment.faction}`, factionColors);
		}

		const mat = new THREE.LineBasicMaterial({
			color: color.clone(),
			linewidth: 1,
			transparent: true,
			opacity: 0.25,
		});

		return {
			lineObj: new THREE.Line(geom, mat),
			yOffset: yo - 0.001,
		};
	}, [
		segment.from.x,
		segment.from.z,
		segment.to.x,
		segment.to.z,
		segment.type,
		segment.faction,
		segment.parallelIndex,
	]);

	return (
		<primitive
			object={lineObj}
			position={[0, yOffset, 0]}
		/>
	);
}

// --- Junction node component ---

const _junctionGeometry = new THREE.CircleGeometry(1, 16);
_junctionGeometry.rotateX(-Math.PI / 2); // Lay flat on xz plane

function JunctionNodeRenderer({
	junction,
	elapsedTime,
}: {
	junction: JunctionNode;
	elapsedTime: number;
}) {
	const meshRef = useRef<THREE.Mesh>(null);

	const material = useMemo(() => {
		const factionColors =
			networksConfig.signal.factionColors[
				junction.faction as keyof typeof networksConfig.signal.factionColors
			] ?? networksConfig.signal.factionColors.neutral;
		const color = getCachedColor(
			`junction_${junction.faction}`,
			factionColors,
		);

		return new THREE.MeshBasicMaterial({
			color: color.clone(),
			transparent: true,
			opacity: 0.8,
			side: THREE.DoubleSide,
		});
	}, [junction.faction]);

	useFrame(() => {
		if (!meshRef.current) return;

		// Pulse brightness
		const jc = networksConfig.junction;
		const pulse =
			jc.pulseMin +
			(jc.pulseMax - jc.pulseMin) *
				(0.5 + 0.5 * Math.sin(elapsedTime * jc.pulseSpeed * Math.PI * 2));

		const dimFactor = junction.hasStructure ? jc.dimWhenStructure : 1.0;
		material.opacity = (pulse / jc.pulseMax) * 0.8 * dimFactor;
	});

	const scale = networksConfig.junction.radius;

	return (
		<mesh
			ref={meshRef}
			position={[junction.x, networksConfig.signal.yOffset + 0.001, junction.z]}
			scale={[scale, scale, scale]}
			geometry={_junctionGeometry}
			material={material}
		/>
	);
}

// --- Main renderer ---

export function NetworkLineRenderer() {
	const [, setRenderTrigger] = useState(0);
	const elapsedRef = useRef(0);

	useFrame((_, delta) => {
		elapsedRef.current += delta;

		// Re-render when network state changes (check every 10 frames)
		const state = getNetworkOverlayState();
		if (state.segments.length > 0 || state.junctions.length > 0) {
			setRenderTrigger((prev) => prev + 1);
		}
	});

	const state = getNetworkOverlayState();
	const elapsed = elapsedRef.current;

	if (state.segments.length === 0 && state.junctions.length === 0) {
		return null;
	}

	return (
		<group name="network-overlay">
			{state.segments.map((seg) => (
				<group key={seg.id}>
					<SegmentGlow segment={seg} />
					<SegmentLine segment={seg} elapsedTime={elapsed} />
				</group>
			))}
			{state.junctions.map((junction, i) => (
				<JunctionNodeRenderer
					key={`junction_${i}`}
					junction={junction}
					elapsedTime={elapsed}
				/>
			))}
		</group>
	);
}
