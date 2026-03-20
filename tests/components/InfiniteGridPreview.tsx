/**
 * InfiniteGridPreview — CT harness for the infinite floor grid (Layer 1).
 *
 * Mounts InfiniteGridRenderer inside a perspective Canvas that matches the
 * game's camera angle. Exposes an overlay with live chunk counts and status
 * so visual tests can assert on what's loaded without polling Three.js internals.
 *
 * Scenarios:
 *  "default"    – camera at spawn, looking straight down, ~4 chunks visible
 *  "panned"     – camera offset 120 m east; proves new chunks generate at
 *                 non-origin positions (not just around world origin)
 *  "harvested"  – one tile at world origin marked as harvested before mount;
 *                 that tile should appear as a visible gap in the floor mesh
 */

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { InfiniteGridRenderer } from "../../src/rendering/InfiniteGridRenderer";
import { addDelta, _resetDeltaStore } from "../../src/world/infiniteGrid";

// ---------------------------------------------------------------------------
// Camera positions for each scenario
// ---------------------------------------------------------------------------

const SCENARIOS = {
	default: {
		label: "Spawn view — world origin",
		position: [0, 35, 35 * 0.6] as [number, number, number],
		target: [0, 0, 0] as [number, number, number],
		fov: 45,
	},
	panned: {
		label: "Panned east 120 m",
		position: [120, 35, 120 + 35 * 0.6] as [number, number, number],
		target: [120, 0, 120] as [number, number, number],
		fov: 45,
	},
	harvested: {
		label: "Harvested tile at (0,0)",
		position: [0, 20, 20 * 0.6] as [number, number, number],
		target: [0, 0, 0] as [number, number, number],
		fov: 45,
	},
} as const;

type Scenario = keyof typeof SCENARIOS;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InfiniteGridPreview({ scenario = "default" }: { scenario?: Scenario }) {
	const [chunkCount, setChunkCount] = useState(0);
	const [ready, setReady] = useState(false);

	const scene = SCENARIOS[scenario];

	// For the "harvested" scenario, mark tile (0,0) as harvested before the
	// renderer generates its first frame.
	if (scenario === "harvested" && !ready) {
		_resetDeltaStore();
		addDelta(0, 0, { kind: "harvested", worldTileX: 0, worldTileZ: 0 });
	}

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
				camera={{ position: scene.position, fov: scene.fov, near: 0.5, far: 800 }}
				gl={{ preserveDrawingBuffer: true }}
				frameloop="always"
			>
				<color attach="background" args={["#030308"]} />
				<ambientLight intensity={0.9} color={0x7c8ea8} />
				<hemisphereLight intensity={0.8} color={0x7fb9ff} groundColor={0x071119} />
				<directionalLight position={[8, 16, 10]} intensity={1.4} color={0x8be6ff} />
				<InfiniteGridRenderer
					onChunksChanged={(n) => {
						setChunkCount(n);
						if (n > 0) setReady(true);
					}}
				/>
			</Canvas>

			{/* Status overlay — asserted on by tests */}
			<div
				data-testid="grid-status"
				style={{
					position: "absolute",
					left: 16,
					bottom: 16,
					padding: "10px 16px",
					background: "rgba(3,7,13,0.88)",
					border: "1px solid rgba(139,230,255,0.18)",
					borderRadius: 10,
					color: ready ? "#6ff3c8" : "#8be6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 12,
					letterSpacing: "0.14em",
					textTransform: "uppercase",
					pointerEvents: "none",
					minWidth: 220,
				}}
			>
				<div data-testid="grid-ready">{ready ? "Grid Ready" : "Grid Loading"}</div>
				<div data-testid="chunk-count" style={{ marginTop: 4, opacity: 0.8 }}>
					Chunks loaded: {chunkCount}
				</div>
			</div>

			{/* Scenario label — asserted on by tests */}
			<div
				data-testid="scenario-label"
				style={{
					position: "absolute",
					right: 16,
					top: 16,
					padding: "8px 14px",
					background: "rgba(3,7,13,0.88)",
					border: "1px solid rgba(139,230,255,0.12)",
					borderRadius: 10,
					color: "#d8f6ff",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 11,
					letterSpacing: "0.12em",
					pointerEvents: "none",
				}}
			>
				<div style={{ color: "#8be6ff", marginBottom: 4, letterSpacing: "0.18em" }}>
					Layer 1: Infinite Grid
				</div>
				<div>{scene.label}</div>
			</div>
		</div>
	);
}
