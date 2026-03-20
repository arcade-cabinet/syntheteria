/**
 * StarterRobotsPreview — CT harness for robot spawn (Layer 4).
 *
 * Layer 4 is NOT YET IMPLEMENTED. This preview defines what the starting
 * robot placement must look like once the traversable world exists:
 *
 *  - 5 Mark I robots spawned at the world-origin tile cluster
 *  - Each robot occupies a distinct passable tile
 *  - Robots stand above the floor (visible above the tile surface)
 *  - Robots face a default orientation (0 radians = facing +Z)
 *  - No robot may spawn on a tile occupied by a resource or in a pit
 *
 * Until Layer 4 is implemented the preview shows:
 *  - Layer 1 floor (real)
 *  - Placeholder robot meshes: a cylinder body + sphere head at spawn positions
 *  - Spawn tile markers (green floor overlays)
 *
 * Tests FAIL until the real robot spawner and unit renderer are wired to
 * the tile-world spawn contract.
 */

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import { InfiniteGridRenderer } from "../../src/rendering/InfiniteGridRenderer";

const TILE_SIZE = 2;
const FLOOR_Y = 0.25; // Floor surface is at FLOOR_HALF_H = +0.25 m

// ---------------------------------------------------------------------------
// Spawn positions for 5 Mark I robots (world tile coords)
// ---------------------------------------------------------------------------

const SPAWN_TILES: { tileX: number; tileZ: number; id: string }[] = [
	{ tileX: 0, tileZ: 0, id: "MKIA-001" },
	{ tileX: 1, tileZ: 0, id: "MKIB-002" },
	{ tileX: 2, tileZ: 0, id: "MKIC-003" },
	{ tileX: 0, tileZ: 1, id: "MKID-004" },
	{ tileX: 1, tileZ: 1, id: "MKIE-005" },
];

// ---------------------------------------------------------------------------
// Placeholder robot mesh
// ---------------------------------------------------------------------------

function PlaceholderRobot({ wx, wz, id }: { wx: number; wz: number; id: string }) {
	const cx = wx + TILE_SIZE / 2;
	const cz = wz + TILE_SIZE / 2;
	const baseY = FLOOR_Y;

	return (
		<group position={[cx, baseY, cz]}>
			{/* Body (cylinder) */}
			<mesh position={[0, 0.5, 0]}>
				<cylinderGeometry args={[0.25, 0.3, 0.8, 8]} />
				<meshStandardMaterial color={0x6aab9c} roughness={0.4} metalness={0.6} />
			</mesh>
			{/* Head (sphere) */}
			<mesh position={[0, 1.1, 0]}>
				<sphereGeometry args={[0.22, 8, 8]} />
				<meshStandardMaterial color={0x4a8c80} roughness={0.3} metalness={0.8} />
			</mesh>
			{/* Sensor eye */}
			<mesh position={[0, 1.2, 0.18]}>
				<sphereGeometry args={[0.06, 6, 6]} />
				<meshBasicMaterial color={0x6ff3c8} />
			</mesh>
			{/* Spawn tile floor marker */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01 - baseY, 0]}>
				<ringGeometry args={[0.35, 0.45, 16]} />
				<meshBasicMaterial color={0x6ff3c8} transparent opacity={0.6} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StarterRobotsPreview() {
	const [gridReady, setGridReady] = useState(false);
	const [chunkCount, setChunkCount] = useState(0);

	return (
		<div
			style={{
				width: 1280,
				height: 720,
				position: "relative",
				background: "#030308",
				overflow: "hidden",
			}}
		>
			<Canvas
				style={{ position: "absolute", inset: 0 }}
				camera={{
					position: [6, 16, 6 + 16 * 0.6],
					fov: 45,
					near: 0.5,
					far: 400,
				}}
				gl={{ preserveDrawingBuffer: true }}
				frameloop="always"
			>
				<color attach="background" args={["#030308"]} />
				<ambientLight intensity={0.9} color={0x7c8ea8} />
				<hemisphereLight intensity={0.8} color={0x7fb9ff} groundColor={0x071119} />
				<directionalLight position={[8, 16, 10]} intensity={1.4} color={0x8be6ff} />

				{/* Layer 1: floor */}
				<InfiniteGridRenderer
					onChunksChanged={(n) => {
						setChunkCount(n);
						if (n > 0) setGridReady(true);
					}}
				/>

				{/* Layer 4 placeholders: 5 Mark I robots */}
				{SPAWN_TILES.map((r) => (
					<PlaceholderRobot
						key={r.id}
						wx={r.tileX * TILE_SIZE}
						wz={r.tileZ * TILE_SIZE}
						id={r.id}
					/>
				))}
			</Canvas>

			{/* Status overlay */}
			<div
				data-testid="robots-layer-status"
				style={{
					position: "absolute",
					left: 16,
					bottom: 16,
					padding: "10px 16px",
					background: "rgba(3,7,13,0.88)",
					border: "1px solid rgba(111,243,200,0.2)",
					borderRadius: 10,
					color: "#d8f6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 12,
					letterSpacing: "0.14em",
					pointerEvents: "none",
					minWidth: 260,
				}}
			>
				<div style={{ color: gridReady ? "#6ff3c8" : "#ff9cb5" }}>
					Layer 1 Grid: {gridReady ? `Ready (${chunkCount} chunks)` : "Loading..."}
				</div>
				<div
					data-testid="robots-status"
					style={{ marginTop: 4, color: "#ffaa44" }}
				>
					Layer 4 Robots: PLACEHOLDER ({SPAWN_TILES.length} shown)
				</div>
				<div style={{ marginTop: 6, fontSize: 10, opacity: 0.6 }}>
					{SPAWN_TILES.map((r) => r.id).join(" · ")}
				</div>
			</div>

			{/* Requirements panel */}
			<div
				data-testid="requirements-panel"
				style={{
					position: "absolute",
					right: 16,
					top: 16,
					width: 300,
					padding: "12px 16px",
					background: "rgba(3,7,13,0.92)",
					border: "1px solid rgba(111,243,200,0.25)",
					borderRadius: 10,
					color: "#d8f6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 11,
					pointerEvents: "none",
				}}
			>
				<div style={{ color: "#6ff3c8", letterSpacing: "0.18em", marginBottom: 8 }}>
					Layer 4: Starter Robots
				</div>
				<div data-testid="req-count" style={{ marginBottom: 4 }}>
					✓ Exactly 5 Mark I robots at spawn
				</div>
				<div data-testid="req-passable" style={{ marginBottom: 4 }}>
					✓ Each robot on a distinct passable tile
				</div>
				<div data-testid="req-above-floor" style={{ marginBottom: 4 }}>
					✓ Robots visible above floor surface (Y &gt; {FLOOR_Y} m)
				</div>
				<div data-testid="req-no-resource-collision" style={{ marginBottom: 4 }}>
					✓ No robot spawns on a resource tile
				</div>
				<div data-testid="req-no-pit" style={{ marginBottom: 4 }}>
					✓ No robot spawns in a harvested pit
				</div>
				<div data-testid="req-ids" style={{ marginBottom: 4 }}>
					✓ IDs: MKIA-001 … MKIE-005
				</div>
				<div style={{ marginTop: 8, opacity: 0.5, fontSize: 10 }}>
					STATUS: NOT IMPLEMENTED
				</div>
			</div>
		</div>
	);
}
