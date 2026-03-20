/**
 * speechRenderer — renders speech bubbles above units using canvas-textured sprites.
 *
 * Reads from the speechBubbleStore (pub/sub) and positions speech bubble sprites
 * above the corresponding unit's world position. Bubbles auto-dismiss after
 * SPEECH_BUBBLE_DURATION_TURNS (handled by the store itself).
 *
 * Pure Three.js — no React dependency.
 */

import * as THREE from "three";
import type { World } from "koota";
import { UnitPos } from "../../traits";
import { getActiveSpeech } from "../../systems";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Canvas width for speech bubble texture. */
const CANVAS_WIDTH = 256;

/** Canvas height for speech bubble texture. */
const CANVAS_HEIGHT = 96;

/** World-space width of the speech sprite. */
const SPRITE_WIDTH = 3.0;

/** World-space height of the speech sprite. */
const SPRITE_HEIGHT = SPRITE_WIDTH * (CANVAS_HEIGHT / CANVAS_WIDTH);

/** How far above the unit the bubble floats. */
const BUBBLE_Y_OFFSET = 3.0;

/** Font size on the canvas texture (pixels). */
const FONT_SIZE = 22;

/** Max characters before truncation. */
const MAX_TEXT_LENGTH = 40;

/** Background color for the speech bubble. */
const BG_COLOR = "rgba(10, 15, 25, 0.85)";

/** Border color. */
const BORDER_COLOR = "#44aaff";

/** Text color. */
const TEXT_COLOR = "#e0e8f0";

/** Corner radius on the bubble (pixels). */
const CORNER_RADIUS = 12;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Active speech sprites keyed by entity ID. */
const sprites = new Map<number, THREE.Sprite>();

let sceneRef: THREE.Scene | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drawBubbleCanvas(text: string): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = CANVAS_WIDTH;
	canvas.height = CANVAS_HEIGHT;
	const ctx = canvas.getContext("2d")!;

	// Truncate long text
	const display =
		text.length > MAX_TEXT_LENGTH
			? `${text.slice(0, MAX_TEXT_LENGTH - 1)}\u2026`
			: text;

	// Draw rounded rectangle background
	ctx.beginPath();
	ctx.roundRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4, CORNER_RADIUS);
	ctx.fillStyle = BG_COLOR;
	ctx.fill();
	ctx.strokeStyle = BORDER_COLOR;
	ctx.lineWidth = 2;
	ctx.stroke();

	// Draw text
	ctx.font = `${FONT_SIZE}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = TEXT_COLOR;

	// Word-wrap into at most 2 lines
	const words = display.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		const test = currentLine ? `${currentLine} ${word}` : word;
		if (ctx.measureText(test).width > CANVAS_WIDTH - 24 && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = test;
		}
	}
	if (currentLine) lines.push(currentLine);

	// Render up to 2 lines
	const renderLines = lines.slice(0, 2);
	const lineHeight = FONT_SIZE + 4;
	const totalHeight = renderLines.length * lineHeight;
	const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;

	for (let i = 0; i < renderLines.length; i++) {
		ctx.fillText(renderLines[i], CANVAS_WIDTH / 2, startY + i * lineHeight);
	}

	return canvas;
}

function createSpeechSprite(text: string): THREE.Sprite {
	const canvas = drawBubbleCanvas(text);
	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		depthWrite: false,
	});

	const sprite = new THREE.Sprite(material);
	sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
	return sprite;
}

// ---------------------------------------------------------------------------
// Entity lookup helper
// ---------------------------------------------------------------------------

/**
 * Build a Map of entityId -> world position for all units with UnitPos.
 * Only built when there are active speech bubbles.
 */
function buildUnitPositions(world: World): Map<number, { x: number; y: number; z: number }> {
	const positions = new Map<number, { x: number; y: number; z: number }>();
	for (const entity of world.query(UnitPos)) {
		const pos = entity.get(UnitPos);
		if (!pos) continue;
		positions.set(entity.id(), tileToWorld(pos.tileX, pos.tileZ));
	}
	return positions;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the speech renderer. Call once during scene setup.
 */
export function createSpeechRenderer(scene: THREE.Scene): void {
	sceneRef = scene;
}

/**
 * Sync active speech bubbles with Three.js sprites each frame.
 *
 * @param _delta — seconds since last frame (unused, duration is time-based in store)
 */
export function updateSpeech(world: World, _delta: number): void {
	if (!sceneRef) return;

	const activeBubbles = getActiveSpeech();
	const activeIds = new Set<number>();

	// Early exit if nothing to render and nothing to clean up
	if (activeBubbles.length === 0 && sprites.size === 0) return;

	// Build position lookup only when we have bubbles
	const unitPositions =
		activeBubbles.length > 0 ? buildUnitPositions(world) : null;

	for (const bubble of activeBubbles) {
		activeIds.add(bubble.entityId);

		const wp = unitPositions?.get(bubble.entityId);
		if (!wp) continue;

		let sprite = sprites.get(bubble.entityId);
		if (!sprite) {
			// Create new speech sprite
			sprite = createSpeechSprite(bubble.text);
			sceneRef.add(sprite);
			sprites.set(bubble.entityId, sprite);
		}

		// Update position to float above unit
		sprite.position.set(wp.x, wp.y + BUBBLE_Y_OFFSET, wp.z);
	}

	// Remove sprites for expired or cleared speech
	for (const [eid, sprite] of sprites) {
		if (!activeIds.has(eid)) {
			sceneRef.remove(sprite);
			sprite.material.dispose();
			(sprite.material as THREE.SpriteMaterial).map?.dispose();
			sprites.delete(eid);
		}
	}
}
