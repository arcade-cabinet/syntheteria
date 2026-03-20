/**
 * ResourceLayerPreview — CT harness for the resource layer (Layer 2).
 *
 * Layer 2 is NOT YET IMPLEMENTED. This preview defines what it should
 * look like:
 *  - The infinite grid floor (Layer 1) is visible underneath everything.
 *  - One layer of resource objects sits ON TOP of the floor at ground depth.
 *  - Resources are impassable: their tile is blocked to traversal.
 *  - Resources come in spatial families: containers cluster near each other,
 *    structural remnants cluster together, resource nodes cluster together.
 *
 * Until Layer 2 is implemented, the preview renders:
 *  - Layer 1 floor (real, working)
 *  - Placeholder meshes representing where resources SHOULD appear
 *    (wireframe boxes with labels) — these will be replaced by real GLB
 *    models once the resource placement system is built.
 *
 * Tests will FAIL until the real ResourceLayer component exists and the
 * placeholder boxes are replaced with actual loaded models.
 */

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import { InfiniteGridRenderer } from "../../src/rendering/InfiniteGridRenderer";

// ---------------------------------------------------------------------------
// Placeholder resource mesh (wireframe box standing on the tile)
// ---------------------------------------------------------------------------

/** One placeholder resource node at a world position. */
function PlaceholderResource({
	wx,
	wz,
	label,
	family,
}: {
	wx: number;
	wz: number;
	label: string;
	family: "structural" | "container" | "resource_node" | "electronic";
}) {
	const colors: Record<typeof family, number> = {
		structural: 0xffaa44,
		container: 0x44aaff,
		resource_node: 0x44ff88,
		electronic: 0xff44aa,
	};
	const heights: Record<typeof family, number> = {
		structural: 1.6,
		container: 0.8,
		resource_node: 1.0,
		electronic: 0.5,
	};
	const color = colors[family];
	const h = heights[family];

	return (
		<group position={[wx + 1, 0, wz + 1]}>
			{/* Wireframe box outline */}
			<lineSegments>
				<edgesGeometry args={[new THREE.BoxGeometry(1.8, h, 1.8)]} />
				<lineBasicMaterial color={color} />
			</lineSegments>
			{/* Transparent fill to show impassable volume */}
			<mesh position={[0, h / 2, 0]}>
				<boxGeometry args={[1.8, h, 1.8]} />
				<meshBasicMaterial color={color} transparent opacity={0.12} />
			</mesh>
			{/* Floor marker: impassable tile indicator */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
				<planeGeometry args={[1.9, 1.9]} />
				<meshBasicMaterial color={color} transparent opacity={0.25} />
			</mesh>
		</group>
	);
}

// ---------------------------------------------------------------------------
// Preview scene definition
// ---------------------------------------------------------------------------

/**
 * Resource placement layout for the preview scene.
 * Tile coordinates: one tile = 2m × 2m.
 */
const PREVIEW_RESOURCES: {
	tileX: number;
	tileZ: number;
	label: string;
	family: "structural" | "container" | "resource_node" | "electronic";
}[] = [
	// Structural remnants cluster (walls, columns)
	{ tileX: 2, tileZ: 2, label: "Wall Column", family: "structural" },
	{ tileX: 3, tileZ: 2, label: "Wall Section", family: "structural" },
	{ tileX: 2, tileZ: 3, label: "Pipe Bundle", family: "structural" },

	// Container cluster
	{ tileX: 6, tileZ: 2, label: "Storage Barrel", family: "container" },
	{ tileX: 7, tileZ: 2, label: "Cargo Container", family: "container" },
	{ tileX: 6, tileZ: 3, label: "Drum Stack", family: "container" },

	// Resource node cluster (harvestable)
	{ tileX: 4, tileZ: 6, label: "Metal Node", family: "resource_node" },
	{ tileX: 5, tileZ: 6, label: "Crystal Node", family: "resource_node" },
	{ tileX: 4, tileZ: 7, label: "Ore Vein", family: "resource_node" },

	// Electronic debris cluster
	{ tileX: 9, tileZ: 5, label: "Circuit Board", family: "electronic" },
	{ tileX: 10, tileZ: 5, label: "Server Rack", family: "electronic" },
];

const TILE_SIZE = 2;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResourceLayerPreview() {
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
					position: [16, 28, 16 + 28 * 0.6],
					fov: 45,
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

				{/* Layer 1: floor grid */}
				<InfiniteGridRenderer
					onChunksChanged={(n) => {
						setChunkCount(n);
						if (n > 0) setGridReady(true);
					}}
				/>

				{/* Layer 2: resource placeholders (to be replaced by real models) */}
				{PREVIEW_RESOURCES.map((r) => (
					<PlaceholderResource
						key={`${r.tileX},${r.tileZ}`}
						wx={r.tileX * TILE_SIZE}
						wz={r.tileZ * TILE_SIZE}
						label={r.label}
						family={r.family}
					/>
				))}
			</Canvas>

			{/* Status overlay */}
			<div
				data-testid="resource-layer-status"
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
				<div data-testid="layer1-status" style={{ color: gridReady ? "#6ff3c8" : "#ff9cb5" }}>
					Layer 1 Grid: {gridReady ? `Ready (${chunkCount} chunks)` : "Loading..."}
				</div>
				<div
					data-testid="layer2-status"
					style={{ marginTop: 4, color: "#ffaa44" }}
				>
					Layer 2 Resources: PLACEHOLDER
				</div>
				<div style={{ marginTop: 6, fontSize: 10, opacity: 0.6 }}>
					{PREVIEW_RESOURCES.length} resource objects defined
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
					border: "1px solid rgba(255,170,68,0.3)",
					borderRadius: 10,
					color: "#d8f6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 11,
					pointerEvents: "none",
				}}
			>
				<div style={{ color: "#ffaa44", letterSpacing: "0.18em", marginBottom: 8 }}>
					Layer 2: Resource Layer
				</div>
				<div data-testid="req-one-tile-per-model" style={{ marginBottom: 4, opacity: 0.9 }}>
					✓ One model per 2×2 m tile
				</div>
				<div data-testid="req-impassable" style={{ marginBottom: 4, opacity: 0.9 }}>
					✓ Occupied tiles are impassable
				</div>
				<div data-testid="req-families" style={{ marginBottom: 4, opacity: 0.9 }}>
					✓ Resources cluster by family
				</div>
				<div data-testid="req-deterministic" style={{ marginBottom: 4, opacity: 0.9 }}>
					✓ Placement deterministic from tile coords
				</div>
				<div data-testid="req-ground-depth" style={{ marginBottom: 4, opacity: 0.9 }}>
					✓ All resources at ground depth (level 0)
				</div>
				<div style={{ marginTop: 8, opacity: 0.5, fontSize: 10 }}>
					STATUS: NOT IMPLEMENTED
				</div>
			</div>
		</div>
	);
}
