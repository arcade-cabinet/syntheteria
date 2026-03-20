/**
 * Preview: Layer 1 — height mesh.
 *
 * Renders a 12×12 test board with deliberate elevation variation so the
 * bilinear-interpolated height displacement is clearly visible:
 *   - NW quadrant: flat (0)
 *   - NE quadrant: raised (1)
 *   - Center cluster: high (2)
 *   - SW corner tile: pit (-1)
 *
 * Camera: isometric angle matching the game's IsometricCamera settings.
 * Background: game dark (#030308).
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BoardRenderer } from "../../src/rendering/BoardRenderer";
import type { GeneratedBoard, TileData } from "../../src/board/types";
import type { Elevation } from "../../src/board/types";

// ---------------------------------------------------------------------------
// Test board
// ---------------------------------------------------------------------------

function makeTestBoard(): GeneratedBoard {
	const W = 12;
	const H = 12;

	const elevMap: Elevation[][] = Array.from({ length: H }, (_, z) =>
		Array.from({ length: W }, (_, x) => {
			// High peak cluster in the center
			const cx = Math.abs(x - 5.5);
			const cz = Math.abs(z - 5.5);
			if (cx < 1.5 && cz < 1.5) return 2;
			// Raised NE quadrant
			if (x >= 7 && z <= 4) return 1;
			// Pit SW corner
			if (x <= 1 && z >= 9) return -1;
			// Flat elsewhere
			return 0;
		}),
	);

	const tiles: TileData[][] = elevMap.map((row, z) =>
		row.map((e, x) => ({
			x,
			z,
			elevation: e,
			passable: e !== -1,
			floorType: "durasteel_span",
			resourceMaterial: null,
			resourceAmount: 0,
		})),
	);

	return {
		config: { width: W, height: H, seed: "height-preview-seed", difficulty: "normal" },
		tiles,
	};
}

const TEST_BOARD = makeTestBoard();

// ---------------------------------------------------------------------------
// Camera rig (perspective, isometric angle)
// ---------------------------------------------------------------------------

function PerspectiveCameraRig() {
	const { camera } = useThree();
	useEffect(() => {
		camera.position.set(11, 30, 22);
		camera.lookAt(11, 0, 5);
		camera.updateProjectionMatrix();
	}, [camera]);
	return null;
}

// ---------------------------------------------------------------------------
// Ready beacon
// ---------------------------------------------------------------------------

function ReadyBeacon({ onReady }: { onReady: () => void }) {
	const fired = useRef(false);
	useFrame(() => {
		if (!fired.current) {
			fired.current = true;
			requestAnimationFrame(() => onReady());
		}
	});
	return null;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export function TerrainHeightPreview() {
	const [ready, setReady] = useState(false);

	return (
		<div style={{ width: 800, height: 600, position: "relative", background: "#030308" }}>
			<Canvas
				camera={{ fov: 45, near: 0.5, far: 500 }}
				style={{ position: "absolute", inset: 0 }}
				frameloop="always"
				gl={{ preserveDrawingBuffer: true }}
			>
				<color attach="background" args={["#030308"]} />

				<PerspectiveCameraRig />
				<ReadyBeacon onReady={() => setReady(true)} />

				{/* Lighting — low ambient + directional for clear height shadow */}
				<ambientLight intensity={0.35} color={0x5a6880} />
				<directionalLight position={[20, 40, 15]} intensity={2.2} color={0x8be6ff} />
				<hemisphereLight intensity={0.55} color={0x4a7aaa} groundColor={0x030810} />

				<BoardRenderer board={TEST_BOARD} />
			</Canvas>

			{/* Elevation legend */}
			<div style={{
				position: "absolute",
				top: 8,
				right: 8,
				padding: "8px 12px",
				background: "rgba(0,0,0,0.75)",
				color: "#8be6ff",
				fontSize: 10,
				fontFamily: "ui-monospace, monospace",
				letterSpacing: "0.1em",
				borderRadius: 6,
				lineHeight: 1.7,
			}}>
				<div>HIGH (2) — center peak</div>
				<div>RAISED (1) — NE quad</div>
				<div>FLAT (0) — default</div>
				<div>PIT (−1) — SW corner</div>
			</div>

			<div
				data-testid="canvas-status"
				style={{
					position: "absolute",
					left: 8,
					bottom: 8,
					padding: "4px 8px",
					background: "rgba(0,0,0,0.7)",
					color: ready ? "#6ff3c8" : "#ff9cb5",
					fontSize: 11,
					fontFamily: "ui-monospace, monospace",
					letterSpacing: "0.14em",
					textTransform: "uppercase",
					borderRadius: 6,
				}}
			>
				{ready ? "Ready" : "Rendering"}
			</div>
		</div>
	);
}
