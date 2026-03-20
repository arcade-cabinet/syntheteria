/**
 * combatEffects — floating damage numbers and flash effects when combat resolves.
 *
 * Queries the Koota world for entities with CombatResult trait (set by attackSystem).
 * Spawns particles at the target position and creates floating damage text sprites.
 * Cleans up CombatResult after the effect has played out.
 *
 * Pure Three.js — no React dependency.
 */

import * as THREE from "three";
import type { World } from "koota";
import { CombatResult, UnitPos } from "../../traits";
import { spawnParticles } from "./particleRenderer";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How far the damage number floats upward per second. */
const FLOAT_SPEED = 2.5;

/** Seconds a floating number stays alive. */
const FLOAT_LIFETIME = 1.2;

/** Font size on the canvas texture (pixels). */
const FONT_SIZE = 48;

/** Size of the canvas used for each damage label. */
const CANVAS_SIZE = 128;

/** World-space size of the damage sprite. */
const SPRITE_SCALE = 1.2;

/** Particle burst count per combat hit. */
const PARTICLE_COUNT = 16;

/** Colors keyed by CombatResult kind. */
const KIND_COLORS: Record<string, { text: string; particle: number }> = {
	hit: { text: "#ff4444", particle: 0xff4444 },
	destroyed: { text: "#ff0000", particle: 0xff2200 },
	counter: { text: "#ffaa00", particle: 0xffaa00 },
};

const DEFAULT_COLOR = { text: "#ffffff", particle: 0xffffff };

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface FloatingText {
	sprite: THREE.Sprite;
	elapsed: number;
	startY: number;
}

const floatingTexts: FloatingText[] = [];

let sceneRef: THREE.Scene | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDamageSprite(damage: number, kind: string): THREE.Sprite {
	const canvas = document.createElement("canvas");
	canvas.width = CANVAS_SIZE;
	canvas.height = CANVAS_SIZE;
	const ctx = canvas.getContext("2d")!;

	const colors = KIND_COLORS[kind] ?? DEFAULT_COLOR;

	ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
	ctx.font = `bold ${FONT_SIZE}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// Shadow for readability
	ctx.shadowColor = "rgba(0,0,0,0.8)";
	ctx.shadowBlur = 4;
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;

	const label = kind === "destroyed" ? `${damage} KO` : `-${damage}`;
	ctx.fillStyle = colors.text;
	ctx.fillText(label, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		depthWrite: false,
	});

	const sprite = new THREE.Sprite(material);
	sprite.scale.set(SPRITE_SCALE, SPRITE_SCALE, 1);
	return sprite;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the combat effects renderer. Call once during scene setup.
 */
export function createCombatEffects(scene: THREE.Scene): void {
	sceneRef = scene;
}

/**
 * Each frame: check for new CombatResult traits, spawn effects, update
 * floating text positions, and clean up expired effects.
 *
 * @param delta — seconds since last frame
 */
export function updateCombatEffects(world: World, delta: number): void {
	if (!sceneRef) return;

	// --- Spawn effects for new CombatResult entities ---
	for (const entity of world.query(CombatResult, UnitPos)) {
		const result = entity.get(CombatResult);
		const pos = entity.get(UnitPos);
		if (!result || !pos) continue;

		// Only process on the first frame (framesRemaining === 60)
		if (result.framesRemaining < 60) {
			// Tick down frames and remove when expired
			const remaining = result.framesRemaining - 1;
			if (remaining <= 0) {
				entity.remove(CombatResult);
			} else {
				entity.set(CombatResult, { ...result, framesRemaining: remaining });
			}
			continue;
		}

		// First frame — spawn visual effects
		const wp = tileToWorld(pos.tileX, pos.tileZ);
		const colors = KIND_COLORS[result.kind] ?? DEFAULT_COLOR;

		// Particle burst at target position
		spawnParticles(wp.x, wp.y + 0.5, wp.z, colors.particle, PARTICLE_COUNT);

		// Floating damage number
		const sprite = createDamageSprite(result.damage, result.kind);
		sprite.position.set(wp.x, wp.y + 1.5, wp.z);
		sceneRef.add(sprite);
		floatingTexts.push({ sprite, elapsed: 0, startY: wp.y + 1.5 });

		// Mark as in-progress (decrement so we skip spawning next frame)
		entity.set(CombatResult, { ...result, framesRemaining: 59 });
	}

	// --- Update and clean up floating text sprites ---
	for (let i = floatingTexts.length - 1; i >= 0; i--) {
		const ft = floatingTexts[i];
		ft.elapsed += delta;

		if (ft.elapsed >= FLOAT_LIFETIME) {
			sceneRef.remove(ft.sprite);
			ft.sprite.material.dispose();
			(ft.sprite.material as THREE.SpriteMaterial).map?.dispose();
			floatingTexts.splice(i, 1);
			continue;
		}

		// Float upward
		ft.sprite.position.y = ft.startY + ft.elapsed * FLOAT_SPEED;

		// Fade out in the last 40% of lifetime
		const fadeStart = FLOAT_LIFETIME * 0.6;
		if (ft.elapsed > fadeStart) {
			const alpha = 1 - (ft.elapsed - fadeStart) / (FLOAT_LIFETIME - fadeStart);
			(ft.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, alpha);
		}
	}
}
