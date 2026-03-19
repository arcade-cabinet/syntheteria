/**
 * IlluminatorRenderer — floating light drones hovering above the ecumenopolis.
 *
 * Autonomous illuminator orbs provide local light in the permanent storm
 * darkness. They replace the single directional light concept — each orb
 * is a small PointLight + glowing emissive mesh.
 *
 * Placement: corridor intersections and building positions from the board.
 * Sway animation: gentle sin-wave offset on Y position (storm winds).
 * Performance: limited to ~25 illuminators max (PointLights are expensive).
 */

import { useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { GeneratedBoard } from "../board/types";
import { sphereModelPlacement } from "./spherePlacement";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum illuminator count — too many PointLights kills GPU. */
const MAX_ILLUMINATORS = 25;

/** Height above sphere surface (in world units). */
const HOVER_HEIGHT = 3.0;

/** PointLight intensity per orb. */
const LIGHT_INTENSITY = 2.0;

/** PointLight range in world units (~15 tiles). */
const LIGHT_RANGE = 30;

/** Orb mesh radius. */
const ORB_RADIUS = 0.25;

/** Sway amplitude (world units). */
const SWAY_AMPLITUDE = 0.3;

/** Sway frequency. */
const SWAY_FREQ = 0.8;

// ---------------------------------------------------------------------------
// Placement selection — pick corridor intersections
// ---------------------------------------------------------------------------

interface IlluminatorPos {
	tileX: number;
	tileZ: number;
}

/**
 * Select illuminator positions from the board.
 * Prefers corridor intersections (passable tiles with 3-4 passable neighbors).
 * Falls back to evenly-spaced passable tiles if not enough intersections.
 */
function selectIlluminatorPositions(board: GeneratedBoard): IlluminatorPos[] {
	const { width, height } = board.config;
	const intersections: IlluminatorPos[] = [];
	const spacing = Math.max(4, Math.floor(Math.sqrt((width * height) / MAX_ILLUMINATORS)));

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile || !tile.passable) continue;

			// Count passable neighbors (corridor intersection detection)
			let passableNeighbors = 0;
			if (board.tiles[z - 1]?.[x]?.passable) passableNeighbors++;
			if (board.tiles[z + 1]?.[x]?.passable) passableNeighbors++;
			if (board.tiles[z]?.[x - 1]?.passable) passableNeighbors++;
			if (board.tiles[z]?.[x + 1]?.passable) passableNeighbors++;

			// Prefer 3-4 way intersections
			if (passableNeighbors >= 3) {
				intersections.push({ tileX: x, tileZ: z });
			}
		}
	}

	// Subsample with minimum spacing to avoid clustering
	const selected: IlluminatorPos[] = [];
	for (const pos of intersections) {
		if (selected.length >= MAX_ILLUMINATORS) break;
		const tooClose = selected.some(
			(s) => Math.abs(s.tileX - pos.tileX) + Math.abs(s.tileZ - pos.tileZ) < spacing,
		);
		if (!tooClose) selected.push(pos);
	}

	// If we don't have enough from intersections, add evenly-spaced ones
	if (selected.length < MAX_ILLUMINATORS / 2) {
		const step = Math.max(5, Math.floor(width / 5));
		for (let z = step; z < height - step; z += step) {
			for (let x = step; x < width - step; x += step) {
				if (selected.length >= MAX_ILLUMINATORS) break;
				const tile = board.tiles[z]?.[x];
				if (!tile || !tile.passable) continue;
				const tooClose = selected.some(
					(s) => Math.abs(s.tileX - x) + Math.abs(s.tileZ - z) < spacing,
				);
				if (!tooClose) selected.push({ tileX: x, tileZ: z });
			}
		}
	}

	return selected;
}

// ---------------------------------------------------------------------------
// Single illuminator orb
// ---------------------------------------------------------------------------

function IlluminatorOrb({
	tileX,
	tileZ,
	boardWidth,
	boardHeight,
	index,
}: {
	tileX: number;
	tileZ: number;
	boardWidth: number;
	boardHeight: number;
	index: number;
}) {
	const groupRef = useRef<THREE.Group>(null);

	const { position, quaternion } = useMemo(() => {
		return sphereModelPlacement(tileX, tileZ, boardWidth, boardHeight, HOVER_HEIGHT);
	}, [tileX, tileZ, boardWidth, boardHeight]);

	// Phase offset per orb for variety
	const phaseOffset = useMemo(() => index * 1.7, [index]);

	useFrame((state) => {
		if (!groupRef.current) return;
		// Sway in Y (local up on sphere = along normal, but group is already oriented)
		const sway = Math.sin(state.clock.elapsedTime * SWAY_FREQ + phaseOffset) * SWAY_AMPLITUDE;
		groupRef.current.position.set(position[0], position[1] + sway, position[2]);
	});

	return (
		<group ref={groupRef} position={position} quaternion={quaternion}>
			{/* Glowing orb mesh */}
			<mesh>
				<sphereGeometry args={[ORB_RADIUS, 12, 8]} />
				<meshStandardMaterial
					emissive={0xfff4e0}
					emissiveIntensity={3.0}
					color={0xfff8f0}
					toneMapped={false}
				/>
			</mesh>
			{/* Outer glow halo */}
			<mesh>
				<sphereGeometry args={[ORB_RADIUS * 2.5, 8, 6]} />
				<meshBasicMaterial
					color={0xfff4e0}
					transparent
					opacity={0.12}
					depthWrite={false}
				/>
			</mesh>
			{/* PointLight for actual illumination */}
			<pointLight
				intensity={LIGHT_INTENSITY}
				distance={LIGHT_RANGE}
				color={0xfff4e0}
				decay={2}
			/>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export interface IlluminatorRendererProps {
	board: GeneratedBoard;
	boardWidth: number;
	boardHeight: number;
}

export function IlluminatorRenderer({ board, boardWidth, boardHeight }: IlluminatorRendererProps) {
	const positions = useMemo(() => selectIlluminatorPositions(board), [board]);

	return (
		<>
			{positions.map((pos, i) => (
				<IlluminatorOrb
					key={`${pos.tileX},${pos.tileZ}`}
					tileX={pos.tileX}
					tileZ={pos.tileZ}
					boardWidth={boardWidth}
					boardHeight={boardHeight}
					index={i}
				/>
			))}
		</>
	);
}
