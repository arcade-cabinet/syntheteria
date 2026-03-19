/**
 * Preview: Layer 2 — biome texture blending.
 *
 * Renders a 16×16 flat board using a fixed seed that produces a clear spread
 * of all three biome zones (metal, concrete, gravel) so the smooth blending
 * between them is visible.
 *
 * All tiles are at elevation=0 so this isolates Layer 2 (texture) from
 * Layer 1 (height). Camera is overhead-ish for maximum texture coverage.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { BoardRenderer } from "../../src/rendering/BoardRenderer";
import type { GeneratedBoard, TileData } from "../../src/board/types";

function makeTestBoard(): GeneratedBoard {
	const W = 16;
	const H = 16;
	const tiles: TileData[][] = Array.from({ length: H }, (_, z) =>
		Array.from({ length: W }, (_, x) => ({
			x,
			z,
			elevation: 0,
			passable: true,
			floorType: "durasteel_span",
			resourceMaterial: null,
			resourceAmount: 0,
		})),
	);
	return {
		// Seed chosen empirically to produce all 3 biomes across a 16×16 board
		config: { width: W, height: H, seed: "biome-preview-0xCAFE", difficulty: "normal" },
		tiles,
	};
}

const TEST_BOARD = makeTestBoard();

function PerspectiveCameraRig() {
	const { camera } = useThree();
	useEffect(() => {
		// Slightly angled so tile seams are invisible at oblique angle
		camera.position.set(15, 28, 24);
		camera.lookAt(15, 0, 7);
		camera.updateProjectionMatrix();
	}, [camera]);
	return null;
}

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

export function TerrainBiomesPreview() {
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

				<ambientLight intensity={0.35} color={0x5a6880} />
				<directionalLight position={[20, 40, 15]} intensity={2.2} color={0x8be6ff} />
				<hemisphereLight intensity={0.55} color={0x4a7aaa} groundColor={0x030810} />

				<BoardRenderer board={TEST_BOARD} />
			</Canvas>

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
				<div>METAL — dark plates + bolts</div>
				<div>CONCRETE — grey panels</div>
				<div>GRAVEL — debris scatter</div>
				<div style={{ color: "#6ff3c8", marginTop: 6 }}>Blending: smoothstep</div>
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
