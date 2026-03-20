/**
 * ElevationLayerPreview — CT harness for bridges and tunnels (Layer 3).
 *
 * Layer 3 is NOT YET IMPLEMENTED. This preview defines what it must look like:
 *
 *  BRIDGES:
 *  - A mesh elevated above the ground plane (Y = LEVEL_HEIGHT[1] = 2.5 m)
 *  - Connecting two elevated tile groups over a floor-level gap
 *  - Traversable from below (there is clearance between the bridge and floor)
 *  - Same SDF/marching-cubes pipeline as the floor — just a higher Y brick
 *  - Ramp bricks connect ground level to bridge level at the entry tiles
 *
 *  TUNNELS:
 *  - A passage carved through a solid volume (SDF subtraction)
 *  - Entrance visible from ground level
 *  - Interior is traversable (passable = true inside the cut)
 *  - Uses marching-cubes-faster subtractBrick on a wall volume
 *
 * Until Layer 3 is implemented the preview shows:
 *  - Layer 1 floor (real, working)
 *  - Placeholder bridge geometry (elevated platform + ramp wireframes)
 *  - Placeholder tunnel geometry (wall block with cut-out wireframe)
 *
 * Tests FAIL until the real ElevationLayer component generates these from
 * the tile definitions.
 */

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import { InfiniteGridRenderer } from "../../src/rendering/InfiniteGridRenderer";

const LEVEL_HEIGHT = 2.5; // Y offset between levels (must match LEVEL_HEIGHTS[1])
const TILE_SIZE = 2;

// ---------------------------------------------------------------------------
// Placeholder bridge
// ---------------------------------------------------------------------------

/** Placeholder: elevated deck spanning tiles (bridgeStartX to bridgeEndX) at tileZ. */
function PlaceholderBridge({
	startTileX,
	endTileX,
	tileZ,
}: {
	startTileX: number;
	endTileX: number;
	tileZ: number;
}) {
	const spanTiles = endTileX - startTileX;
	const spanW = spanTiles * TILE_SIZE;
	const deckX = startTileX * TILE_SIZE + spanW / 2;
	const deckZ = tileZ * TILE_SIZE + TILE_SIZE / 2;

	return (
		<group>
			{/* Bridge deck wireframe */}
			<lineSegments position={[deckX, LEVEL_HEIGHT + 0.1, deckZ]}>
				<edgesGeometry args={[new THREE.BoxGeometry(spanW, 0.2, TILE_SIZE)]} />
				<lineBasicMaterial color={0x44aaff} />
			</lineSegments>
			{/* Deck fill */}
			<mesh position={[deckX, LEVEL_HEIGHT + 0.1, deckZ]}>
				<boxGeometry args={[spanW, 0.2, TILE_SIZE]} />
				<meshBasicMaterial color={0x44aaff} transparent opacity={0.18} />
			</mesh>
			{/* Ramp at start */}
			<mesh position={[startTileX * TILE_SIZE, LEVEL_HEIGHT / 2, deckZ]}>
				<boxGeometry args={[0.3, LEVEL_HEIGHT, 0.3]} />
				<meshBasicMaterial color={0x2288cc} transparent opacity={0.4} />
			</mesh>
			{/* Ramp at end */}
			<mesh position={[endTileX * TILE_SIZE, LEVEL_HEIGHT / 2, deckZ]}>
				<boxGeometry args={[0.3, LEVEL_HEIGHT, 0.3]} />
				<meshBasicMaterial color={0x2288cc} transparent opacity={0.4} />
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Placeholder tunnel
// ---------------------------------------------------------------------------

/** Placeholder: wall block with a passage cut through it at (tileX, tileZ). */
function PlaceholderTunnel({ tileX, tileZ }: { tileX: number; tileZ: number }) {
	const wx = tileX * TILE_SIZE + TILE_SIZE / 2;
	const wz = tileZ * TILE_SIZE + TILE_SIZE / 2;
	const wallH = 3.0;
	const cutW = 1.4;
	const cutH = 1.8;

	return (
		<group position={[wx, wallH / 2, wz]}>
			{/* Wall volume */}
			<lineSegments>
				<edgesGeometry args={[new THREE.BoxGeometry(TILE_SIZE * 3, wallH, TILE_SIZE)]} />
				<lineBasicMaterial color={0x888888} />
			</lineSegments>
			<mesh>
				<boxGeometry args={[TILE_SIZE * 3, wallH, TILE_SIZE]} />
				<meshBasicMaterial color={0x554433} transparent opacity={0.3} />
			</mesh>
			{/* Tunnel cut (shown as a bright outline where the passage should be) */}
			<lineSegments position={[0, -(wallH / 2) + cutH / 2, 0]}>
				<edgesGeometry args={[new THREE.BoxGeometry(cutW, cutH, TILE_SIZE + 0.1)]} />
				<lineBasicMaterial color={0xff6644} />
			</lineSegments>
			<mesh position={[0, -(wallH / 2) + cutH / 2, 0]}>
				<boxGeometry args={[cutW, cutH, TILE_SIZE + 0.1]} />
				<meshBasicMaterial color={0xff6644} transparent opacity={0.15} />
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ElevationLayerPreview() {
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
					position: [20, 30, 20 + 30 * 0.5],
					fov: 50,
					near: 0.5,
					far: 800,
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

				{/* Layer 3 placeholders: bridge spanning tiles 6–12 at Z=4 */}
				<PlaceholderBridge startTileX={6} endTileX={12} tileZ={4} />

				{/* Layer 3 placeholders: tunnel at tile (3, 8) */}
				<PlaceholderTunnel tileX={3} tileZ={8} />
			</Canvas>

			{/* Status overlay */}
			<div
				data-testid="elevation-layer-status"
				style={{
					position: "absolute",
					left: 16,
					bottom: 16,
					padding: "10px 16px",
					background: "rgba(3,7,13,0.88)",
					border: "1px solid rgba(139,230,255,0.18)",
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
				<div data-testid="bridge-status" style={{ marginTop: 4, color: "#44aaff" }}>
					Layer 3 Bridge: PLACEHOLDER
				</div>
				<div data-testid="tunnel-status" style={{ marginTop: 4, color: "#ff6644" }}>
					Layer 3 Tunnel: PLACEHOLDER
				</div>
			</div>

			{/* Requirements panel */}
			<div
				data-testid="requirements-panel"
				style={{
					position: "absolute",
					right: 16,
					top: 16,
					width: 320,
					padding: "12px 16px",
					background: "rgba(3,7,13,0.92)",
					border: "1px solid rgba(68,170,255,0.3)",
					borderRadius: 10,
					color: "#d8f6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 11,
					pointerEvents: "none",
				}}
			>
				<div style={{ color: "#44aaff", letterSpacing: "0.18em", marginBottom: 8 }}>
					Layer 3: Elevation
				</div>
				<div data-testid="req-bridge-elevated" style={{ marginBottom: 4 }}>
					✓ Bridge deck at Y = {LEVEL_HEIGHT} m (level 1)
				</div>
				<div data-testid="req-bridge-traversable" style={{ marginBottom: 4 }}>
					✓ Bridge is traversable from ground (ramp at each end)
				</div>
				<div data-testid="req-bridge-sdf" style={{ marginBottom: 4 }}>
					✓ Bridge uses same SDF/marching-cubes pipeline as floor
				</div>
				<div data-testid="req-tunnel-cut" style={{ marginBottom: 4 }}>
					✓ Tunnel: subtractBrick carves passage through wall volume
				</div>
				<div data-testid="req-tunnel-traversable" style={{ marginBottom: 4 }}>
					✓ Tunnel interior is passable (1.4 m wide × 1.8 m tall)
				</div>
				<div data-testid="req-level-heights" style={{ marginBottom: 4 }}>
					✓ Level heights: [0.0, 2.5, 5.0] m
				</div>
				<div style={{ marginTop: 8, opacity: 0.5, fontSize: 10 }}>
					STATUS: NOT IMPLEMENTED
				</div>
			</div>
		</div>
	);
}
