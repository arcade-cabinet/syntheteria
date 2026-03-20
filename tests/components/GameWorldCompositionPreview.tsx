/**
 * Preview: full game-world composition — all terrain layers + storm sky.
 *
 * This is the integration scene: all active visual layers composited together
 * on a single canvas, matching the actual GameScreen setup.
 *
 * Active layers:
 *   L0  Grid data    — 16×16 fixed-seed board (data only, no geometry)
 *   L1  Height mesh  — bilinear elevation interpolation (vertex displacement)
 *   L2  Biome tex    — smoothstep-blended metal / concrete / gravel (fragment)
 *   L3  StormSky     — BackSide sky sphere with FBM storm + wormhole GLSL
 *       FogExp2      — exponential horizon fog (hides board edge, adds depth)
 *
 * Individual layer isolation previews:
 *   TerrainHeightPreview.tsx  — L1 alone
 *   TerrainBiomesPreview.tsx  — L2 alone
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Elevation, GeneratedBoard, TileData } from "../../src/board/types";
import { BoardRenderer } from "../../src/rendering/BoardRenderer";
import { StormSky } from "../../src/rendering/StormSky";

// ---------------------------------------------------------------------------
// Test board — elevation variation to exercise both L1 and L2 together
// ---------------------------------------------------------------------------

function makeBoard(seed: string): GeneratedBoard {
	const W = 16;
	const H = 16;
	const tiles: TileData[][] = Array.from({ length: H }, (_, z) =>
		Array.from({ length: W }, (_, x) => {
			let elevation: Elevation = 0;
			// Central peak cluster
			const cx = Math.abs(x - 7.5);
			const cz = Math.abs(z - 7.5);
			if (cx < 1.5 && cz < 1.5) elevation = 2;
			// NE raised
			else if (x >= 11 && z <= 5) elevation = 1;
			// SW pit
			else if (x <= 1 && z >= 13) elevation = -1;
			return {
				x,
				z,
				elevation,
				passable: elevation !== -1,
				floorType: "durasteel_span",
				resourceMaterial: null,
				resourceAmount: 0,
			};
		}),
	);
	return {
		config: { width: W, height: H, seed, difficulty: "normal" },
		tiles,
	};
}

const BOARD_DEFAULT = makeBoard("composition-test-CAFE");
const BOARD_ALT = makeBoard("composition-alt-BEEF");

// ---------------------------------------------------------------------------
// Camera rig — isometric angle (CivRev2-style, no rotation)
// ---------------------------------------------------------------------------

function IsometricCameraRig() {
	const { camera } = useThree();
	useEffect(() => {
		// Slightly angled to show both floor horizon and sky dome top
		camera.position.set(16, 30, 26);
		camera.lookAt(16, 0, 8);
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

type Props = {
	/** Seed string — swap to test procedural variation. */
	seed?: "default" | "alt";
};

export function GameWorldCompositionPreview({ seed = "default" }: Props) {
	const [ready, setReady] = useState(false);
	const board = seed === "alt" ? BOARD_ALT : BOARD_DEFAULT;
	const boardCX = Math.floor(board.config.width / 2) * 2.0;
	const boardCZ = Math.floor(board.config.height / 2) * 2.0;

	return (
		<div
			data-testid="game-world-container"
			style={{
				width: 800,
				height: 600,
				position: "relative",
				background: "#030308",
			}}
		>
			<Canvas
				camera={{ fov: 45, near: 0.5, far: 500 }}
				style={{ position: "absolute", inset: 0 }}
				frameloop="always"
				gl={{ preserveDrawingBuffer: true }}
			>
				<color attach="background" args={["#030308"]} />

				{/* Fog — hides board edge, creates depth toward storm horizon */}
				<fogExp2 attach="fog" args={["#010308", 0.007]} />

				<IsometricCameraRig />
				<ReadyBeacon onReady={() => setReady(true)} />

				{/* Lighting — CivRev2 principle: low ambient + strong directional */}
				<ambientLight intensity={0.35} color={0x5a6880} />
				<directionalLight position={[20, 40, 15]} intensity={2.2} color={0x8be6ff} />
				<hemisphereLight
					intensity={0.55}
					color={0x4a7aaa}
					groundColor={0x030810}
				/>

				{/* L3: Storm sky — BackSide sphere, radius 300 */}
				<StormSky centerX={boardCX} centerZ={boardCZ} />

				{/* L1 + L2: floor geometry — height displacement + biome fragment shader */}
				<BoardRenderer board={board} />
			</Canvas>

			{/* Layer legend */}
			<div
				style={{
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
				}}
			>
				<div>L1: Height mesh (bilinear)</div>
				<div>L2: Biome textures (smoothstep)</div>
				<div>L3: StormSky (BackSide)</div>
				<div style={{ color: "#6ff3c8", marginTop: 6 }}>FogExp2: horizon</div>
				<div style={{ color: "#aaa", marginTop: 4 }}>
					seed: {seed}
				</div>
			</div>

			{/* Ready indicator */}
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
