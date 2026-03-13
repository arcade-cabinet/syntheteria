/**
 * SpeechBubbleRenderer — R3F renderer for bot speech bubbles.
 *
 * Billboards above units in 3D. Dark panel with cyan text and thin border.
 * Fades in/out over 2-3s. Uses CanvasTexture for crisp text rendering
 * without font loading overhead.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
	getActiveSpeechBubbles,
	type SpeechBubble,
	updateSpeechBubbleOpacities,
} from "../systems/botSpeech";

const BUBBLE_Y_OFFSET = 2.5;
const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 64;

/** Shared offscreen canvas for rendering bubble text to texture */
function createBubbleTexture(text: string): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = CANVAS_WIDTH;
	canvas.height = CANVAS_HEIGHT;
	const ctx = canvas.getContext("2d")!;

	// Dark panel background
	ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
	ctx.beginPath();
	ctx.roundRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4, 6);
	ctx.fill();

	// Cyan border
	ctx.strokeStyle = "rgba(0, 220, 255, 0.7)";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4, 6);
	ctx.stroke();

	// Cyan text
	ctx.fillStyle = "#00ddff";
	ctx.font = "bold 16px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// Truncate long text
	const maxChars = 28;
	const displayText =
		text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
	ctx.fillText(displayText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

/** Single speech bubble mesh — billboard that always faces camera */
function BubbleMesh({ bubble }: { bubble: SpeechBubble }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef<THREE.MeshBasicMaterial>(null);
	const textureRef = useRef<THREE.CanvasTexture | null>(null);

	// Lazily create texture (only once per bubble text)
	if (!textureRef.current) {
		textureRef.current = createBubbleTexture(bubble.text);
	}

	useFrame(({ camera }) => {
		if (!meshRef.current || !materialRef.current) return;

		// Billboard: position above entity and face camera
		meshRef.current.position.set(
			bubble.position.x,
			bubble.position.y + BUBBLE_Y_OFFSET,
			bubble.position.z,
		);
		meshRef.current.quaternion.copy(camera.quaternion);

		// Fade opacity
		materialRef.current.opacity = bubble.opacity;
		materialRef.current.visible = bubble.opacity > 0.01;
	});

	const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
	const height = 0.6;
	const width = height * aspectRatio;

	return (
		<mesh ref={meshRef}>
			<planeGeometry args={[width, height]} />
			<meshBasicMaterial
				ref={materialRef}
				map={textureRef.current}
				transparent
				depthWrite={false}
				opacity={0}
			/>
		</mesh>
	);
}

/**
 * Renders all active speech bubbles as billboarded text panels.
 * Mount inside the R3F Canvas alongside other world-scene renderers.
 */
export function SpeechBubbleRenderer() {
	const bubblesRef = useRef<readonly SpeechBubble[]>([]);

	useFrame((_, delta) => {
		updateSpeechBubbleOpacities(delta);
		bubblesRef.current = getActiveSpeechBubbles();
	});

	const bubbles = getActiveSpeechBubbles();

	return (
		<>
			{bubbles.map((bubble) => (
				<BubbleMesh key={bubble.entityId} bubble={bubble} />
			))}
		</>
	);
}
