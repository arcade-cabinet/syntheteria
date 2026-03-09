/**
 * Renders otter entities as holographic projections emitted from small
 * physical emitter pads on the ground. Each otter gets:
 *
 *   1. Emitter pad  — dark cylinder with cyan emissive edge glow
 *   2. Projection cone — faint transparent cone from pad upward
 *   3. Holographic sprite — billboard quad using the custom holographic shader
 *   4. Dissolution particles — small translucent squares drifting upward
 *
 * Billboard behaviour is thematically justified: holograms SHOULD face the
 * viewer. Speech-bubble logic is preserved from OtterRenderer.
 */

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OtterEntity } from "../ecs/types";
import { otters, units } from "../ecs/world";
import {
	createHolographicMaterial,
	updateHolographicMaterial,
} from "./HolographicShader";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDLE_FRAME_COUNT = 20;
const WALK_FRAME_COUNT = 8;
const ANIM_FPS = 8;

const SOURCE_WIDTH = 786;
const SOURCE_HEIGHT = 691;

/** World-unit size of the holographic sprite. */
const SPRITE_HEIGHT = 1.0;
const SPRITE_WIDTH = SPRITE_HEIGHT * (SOURCE_WIDTH / SOURCE_HEIGHT);

/** How far above the emitter pad the sprite floats. */
const FLOAT_ABOVE_PAD = 0.3;

/** Emitter pad dimensions. */
const PAD_RADIUS = 0.3;
const PAD_HEIGHT = 0.05;

/** Projection cone dimensions. */
const CONE_RADIUS = 0.25;
const CONE_HEIGHT = 0.5;

/** Proximity (world units) for speech bubble activation. */
const PROXIMITY = 10;

/** Number of dissolution particles per hologram. */
const PARTICLE_COUNT = 4;

// ---------------------------------------------------------------------------
// Shared texture bank (same as OtterRenderer — loaded once)
// ---------------------------------------------------------------------------

function loadFrames(anim: string, count: number): THREE.Texture[] {
	const loader = new THREE.TextureLoader();
	const base = import.meta.env.BASE_URL as string;
	return Array.from({ length: count }, (_, i) => {
		const idx = String(i).padStart(3, "0");
		const tex = loader.load(`${base}otters/brown/${anim}_${idx}.png`);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	});
}

const idleFrames = loadFrames("idle", IDLE_FRAME_COUNT);
const walkFrames = loadFrames("walk", WALK_FRAME_COUNT);

// ---------------------------------------------------------------------------
// Shared geometries (created once, reused by every hologram)
// ---------------------------------------------------------------------------

const padGeometry = new THREE.CylinderGeometry(
	PAD_RADIUS,
	PAD_RADIUS,
	PAD_HEIGHT,
	24,
);
const coneGeometry = new THREE.ConeGeometry(
	CONE_RADIUS,
	CONE_HEIGHT,
	16,
	1,
	true,
);
const spriteGeometry = new THREE.PlaneGeometry(SPRITE_WIDTH, SPRITE_HEIGHT);
const particleGeometry = new THREE.PlaneGeometry(0.04, 0.04);

// Shared materials for pad and cone (identical for all instances).
const padMaterial = new THREE.MeshStandardMaterial({
	color: 0x111118,
	emissive: 0x00ffaa,
	emissiveIntensity: 0.35,
	metalness: 0.9,
	roughness: 0.3,
});

const coneMaterial = new THREE.MeshBasicMaterial({
	color: 0x00ffaa,
	transparent: true,
	opacity: 0.05,
	side: THREE.DoubleSide,
	depthWrite: false,
});

const particleMaterial = new THREE.MeshBasicMaterial({
	color: 0x00ffaa,
	transparent: true,
	opacity: 0.25,
	depthWrite: false,
	side: THREE.DoubleSide,
});

// ---------------------------------------------------------------------------
// Speech bubble styles (mirrored from OtterRenderer for consistency)
// ---------------------------------------------------------------------------

const BUBBLE: React.CSSProperties = {
	background: "rgba(0, 18, 12, 0.94)",
	border: "1px solid rgba(0, 255, 160, 0.75)",
	borderRadius: "8px",
	padding: "10px 14px",
	maxWidth: "210px",
	minWidth: "120px",
	cursor: "pointer",
	userSelect: "none",
	pointerEvents: "auto",
	fontFamily: "'Courier New', monospace",
	fontSize: "clamp(12px, 3vw, 14px)",
	lineHeight: "1.6",
	color: "#00ffaa",
	textShadow: "0 0 8px rgba(0,255,160,0.35)",
	boxShadow: "0 0 16px rgba(0,255,160,0.12)",
	position: "relative",
	whiteSpace: "pre-line",
};

const TAIL: React.CSSProperties = {
	position: "absolute",
	bottom: "-8px",
	left: "50%",
	transform: "translateX(-50%)",
	width: 0,
	height: 0,
	borderLeft: "8px solid transparent",
	borderRight: "8px solid transparent",
	borderTop: "8px solid rgba(0, 255, 160, 0.75)",
};

const ADVANCE: React.CSSProperties = {
	display: "block",
	textAlign: "right",
	marginTop: "6px",
	fontSize: "10px",
	opacity: 0.6,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stable per-entity phase offset so animations don't synchronise. */
function phaseOffset(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) {
		h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
	}
	return ((h >>> 0) / 0xffffffff) * (IDLE_FRAME_COUNT / ANIM_FPS);
}

// ---------------------------------------------------------------------------
// Dissolution particle — a single small square drifting upward
// ---------------------------------------------------------------------------

interface ParticleState {
	x: number;
	y: number;
	z: number;
	speed: number;
	resetY: number;
	maxY: number;
}

function initParticle(index: number, seed: number): ParticleState {
	const angle = ((index + seed) * 2.399) % (Math.PI * 2); // golden-angle spread
	const r = 0.15 + Math.random() * 0.2;
	return {
		x: Math.cos(angle) * r,
		y: FLOAT_ABOVE_PAD + SPRITE_HEIGHT + Math.random() * 0.1,
		z: Math.sin(angle) * r,
		speed: 0.12 + Math.random() * 0.1,
		resetY: FLOAT_ABOVE_PAD + SPRITE_HEIGHT - 0.05,
		maxY: FLOAT_ABOVE_PAD + SPRITE_HEIGHT + 0.45,
	};
}

// ---------------------------------------------------------------------------
// Per-otter hologram component
// ---------------------------------------------------------------------------

function HologramSprite({ entity }: { entity: OtterEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const meshRef = useRef<THREE.Mesh>(null);
	const particleRefs = useRef<(THREE.Mesh | null)[]>([]);

	const offset = phaseOffset(entity.id);
	const flickerSeed = entity.hologram?.flickerSeed ?? offset;

	// Create the holographic material once per instance.
	const holoMaterial = useMemo(
		() => createHolographicMaterial(idleFrames[0]),
		[],
	);

	// Dispose material on unmount.
	useEffect(() => {
		return () => {
			holoMaterial.dispose();
		};
	}, [holoMaterial]);

	// Initialise particle states.
	const particles = useMemo<ParticleState[]>(
		() =>
			Array.from({ length: PARTICLE_COUNT }, (_, i) => initParticle(i, offset)),
		[offset],
	);

	// Speech-bubble state.
	const lines = entity.otter.lines ?? [];
	const isNearRef = useRef(false);
	const [isNear, setIsNear] = useState(false);
	const [dialogueIndex, setDialogueIndex] = useState(0);

	useFrame((state) => {
		const wp = entity.worldPosition;
		const t = state.clock.elapsedTime;

		// Position group at entity world position.
		if (groupRef.current) {
			groupRef.current.position.set(wp.x, wp.y, wp.z);
		}

		// Update holographic material uniforms.
		const entityOpacity = entity.hologram?.opacity ?? 1.0;
		updateHolographicMaterial(holoMaterial, t, entityOpacity, flickerSeed);

		// Swap animation frame texture.
		const frames = entity.otter.moving ? walkFrames : idleFrames;
		const idx = Math.floor((t + offset) * ANIM_FPS) % frames.length;
		holoMaterial.uniforms.baseTexture.value = frames[idx];

		// Animate dissolution particles.
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const p = particles[i];
			const mesh = particleRefs.current[i];
			if (!mesh) continue;

			p.y += p.speed * state.clock.getDelta();
			if (p.y > p.maxY) {
				p.y = p.resetY;
			}

			mesh.position.set(p.x, p.y, p.z);

			// Fade out as particles rise.
			const progress = (p.y - p.resetY) / (p.maxY - p.resetY);
			(mesh.material as THREE.MeshBasicMaterial).opacity =
				0.25 * (1.0 - progress);
		}

		// Proximity check for speech bubbles.
		let near = false;
		for (const unit of units) {
			if (unit.faction !== "player") continue;
			const dx = unit.worldPosition.x - wp.x;
			const dz = unit.worldPosition.z - wp.z;
			if (dx * dx + dz * dz < PROXIMITY * PROXIMITY) {
				near = true;
				break;
			}
		}
		if (near !== isNearRef.current) {
			isNearRef.current = near;
			setIsNear(near);
		}
	});

	const currentLine = lines[dialogueIndex] ?? null;
	const hasMore = dialogueIndex < lines.length - 1;
	const advance = () => {
		if (hasMore) setDialogueIndex((i) => i + 1);
	};

	const totalHeight = FLOAT_ABOVE_PAD + SPRITE_HEIGHT;

	return (
		<group ref={groupRef}>
			{/* 1. Emitter pad — dark cylinder with cyan edge glow */}
			<mesh
				geometry={padGeometry}
				material={padMaterial}
				position={[0, PAD_HEIGHT * 0.5, 0]}
			/>

			{/* 2. Projection cone — very faint cyan, opens upward */}
			<mesh
				geometry={coneGeometry}
				material={coneMaterial}
				position={[0, PAD_HEIGHT + CONE_HEIGHT * 0.5, 0]}
			/>

			{/* 3. Holographic sprite — billboard quad */}
			<mesh
				ref={meshRef}
				geometry={spriteGeometry}
				material={holoMaterial}
				position={[0, FLOAT_ABOVE_PAD + SPRITE_HEIGHT * 0.5, 0]}
				renderOrder={10}
			/>

			{/* 4. Dissolution particles — small translucent squares drifting up */}
			{particles.map((_, i) => (
				<mesh
					key={i}
					ref={(el) => {
						particleRefs.current[i] = el;
					}}
					geometry={particleGeometry}
					material={particleMaterial.clone()}
					position={[0, FLOAT_ABOVE_PAD + SPRITE_HEIGHT, 0]}
					renderOrder={11}
				/>
			))}

			{/* Speech bubble — visible when a player unit is nearby */}
			{isNear && currentLine && (
				<Html
					position={[0, totalHeight + 0.3, 0]}
					center
					zIndexRange={[300, 0]}
					distanceFactor={20}
				>
					<div style={BUBBLE} onClick={advance}>
						{currentLine}
						{hasMore && <span style={ADVANCE}>tap to continue ▶</span>}
						<div style={TAIL} />
					</div>
				</Html>
			)}
		</group>
	);
}

// ---------------------------------------------------------------------------
// Public renderer — one hologram per otter entity
// ---------------------------------------------------------------------------

export function HologramRenderer() {
	return (
		<>
			{Array.from(otters).map((entity) => (
				<HologramSprite key={entity.id} entity={entity} />
			))}
		</>
	);
}
