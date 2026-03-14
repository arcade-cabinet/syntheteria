/**
 * Reusable R3F Canvas wrapper for Playwright component tests.
 *
 * Provides a fixed-size Canvas with an orthographic camera, deterministic
 * lighting, and a "ready" beacon that signals when the first frame has rendered.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// ReadyBeacon — fires onReady after the first rendered frame
// ---------------------------------------------------------------------------

function ReadyBeacon({ onReady }: { onReady: () => void }) {
	const fired = useRef(false);

	useFrame(() => {
		if (!fired.current) {
			fired.current = true;
			// Defer so the frame is fully flushed before we signal
			requestAnimationFrame(() => onReady());
		}
	});

	return null;
}

// ---------------------------------------------------------------------------
// OrthoRig — positions the orthographic camera and disables animation loop
// ---------------------------------------------------------------------------

function OrthoRig({
	position,
	lookAt,
	zoom,
}: {
	position: [number, number, number];
	lookAt: [number, number, number];
	zoom: number;
}) {
	const { camera, gl } = useThree();

	useEffect(() => {
		if (camera instanceof THREE.OrthographicCamera) {
			camera.position.set(...position);
			camera.zoom = zoom;
			camera.lookAt(...lookAt);
			camera.updateProjectionMatrix();
		}
		// Render exactly one frame so the screenshot captures a stable image.
		// The Canvas frameloop is set to "demand" so we must trigger manually.
		gl.render(gl.domElement as unknown as THREE.Scene, camera);
	}, [camera, gl, position, lookAt, zoom]);

	return null;
}

// ---------------------------------------------------------------------------
// TestCanvasWrapper
// ---------------------------------------------------------------------------

export interface TestCanvasWrapperProps {
	/** Width of the wrapper div (default 800) */
	width?: number;
	/** Height of the wrapper div (default 600) */
	height?: number;
	/** Orthographic camera position (default [0, 20, 0] — looking straight down) */
	cameraPosition?: [number, number, number];
	/** Point the camera looks at (default [0, 0, 0]) */
	cameraLookAt?: [number, number, number];
	/** Orthographic zoom level (default 40) */
	cameraZoom?: number;
	/** Scene background color (default "#03070d") */
	backgroundColor?: string;
	/** R3F children to render inside the Canvas */
	children: ReactNode;
}

export function TestCanvasWrapper({
	width = 800,
	height = 600,
	cameraPosition = [0, 20, 0],
	cameraLookAt = [0, 0, 0],
	cameraZoom = 40,
	backgroundColor = "#03070d",
	children,
}: TestCanvasWrapperProps) {
	const [ready, setReady] = useState(false);

	return (
		<div
			style={{
				width,
				height,
				position: "relative",
				background: backgroundColor,
				overflow: "hidden",
			}}
		>
			<Canvas
				orthographic
				camera={{
					position: cameraPosition,
					zoom: cameraZoom,
					near: 0.1,
					far: 500,
				}}
				style={{ position: "absolute", inset: 0 }}
				frameloop="always"
				gl={{ preserveDrawingBuffer: true }}
			>
				<color attach="background" args={[backgroundColor]} />
				<OrthoRig
					position={cameraPosition}
					lookAt={cameraLookAt}
					zoom={cameraZoom}
				/>
				<ambientLight intensity={1.2} color={0xb0c5d6} />
				<hemisphereLight args={[0xa9d8ff, 0x17232d, 0.9]} />
				<directionalLight
					position={[8, 16, 10]}
					intensity={2.0}
					color={0xffffff}
				/>
				<ReadyBeacon onReady={() => setReady(true)} />
				{children}
			</Canvas>
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
					fontFamily:
						"ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
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
