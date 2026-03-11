/**
 * Renders otter holograms as animated billboard sprites using the pre-rendered
 * keyframe PNG sequences extracted from otter.zip, with proximity-triggered
 * holographic speech bubbles that guide the player through the game.
 *
 * Lore: The home-planet AI that dispatched the player found Earth otters
 * endearing and adopted an otter as its holographic avatar. These projections
 * appear Star-Wars-style (think R2-D2 projecting Princess Leia) at fixed
 * positions in the world, delivering tutorials and quest progression.
 *
 * Textures are shared across all hologram instances. The Vite base URL is
 * prepended so paths resolve correctly whether the app is served at / or
 * /syntheteria/.
 *
 * Speech bubbles use drei's <Html> component — a DOM element anchored to a 3D
 * world position. They appear when any player unit is within PROXIMITY world
 * units, and advance on click.
 *
 * Sprite material is attached imperatively via useEffect so it is guaranteed to
 * be set on the THREE.Sprite object regardless of R3F prop timing.
 */

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OtterEntity } from "../ecs/types";
import { otters, units } from "../ecs/world";

// ---------------------------------------------------------------------------
// Shared texture bank — loaded once, reused by every OtterSprite instance.
// BASE_URL handles the /syntheteria/ Vite base in both dev and production.
// ---------------------------------------------------------------------------

const IDLE_FRAME_COUNT = 20;
const WALK_FRAME_COUNT = 8;
const ANIM_FPS = 8;

// Source frame dimensions (px) — used only for aspect-ratio calculation.
const SOURCE_WIDTH = 786;
const SOURCE_HEIGHT = 691;

// World-unit size — generous enough to be clearly visible from the default zoom.
const SPRITE_HEIGHT = 2.8;
const SPRITE_WIDTH = SPRITE_HEIGHT * (SOURCE_WIDTH / SOURCE_HEIGHT);

// Lift sprites this many units off the terrain surface so they don't z-fight.
const GROUND_LIFT = 0.15;

// How close (world units) a player unit must be to trigger a speech bubble.
const PROXIMITY = 10;

function loadFrames(anim: string, count: number): THREE.Texture[] {
	const loader = new THREE.TextureLoader();
	const base = "/";
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
// Speech bubble styles — terminal aesthetic, slightly warmer for organic feel
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
// Per-otter component
// ---------------------------------------------------------------------------

/** Stable per-otter time offset so sprites don't all animate in sync. */
function phaseOffset(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) {
		h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
	}
	return ((h >>> 0) / 0xffffffff) * (IDLE_FRAME_COUNT / ANIM_FPS);
}

function OtterSprite({ entity }: { entity: OtterEntity }) {
	// Group drives 3D position; sprite + Html are children so they move together.
	const groupRef = useRef<THREE.Group>(null);
	const spriteRef = useRef<THREE.Sprite>(null);

	// SpriteMaterial created once per otter instance.
	// depthTest:false ensures the sprite is never hidden by terrain z-fighting.
	// depthWrite:false so transparent edges don't punch holes in the scene.
	const materialRef = useRef(
		new THREE.SpriteMaterial({
			map: idleFrames[0],
			transparent: true,
			alphaTest: 0.05,
			depthWrite: false,
			depthTest: true,
			sizeAttenuation: true,
		}),
	);

	// Imperatively attach the material after mount so R3F prop timing can't
	// cause the default SpriteMaterial to linger.
	useEffect(() => {
		if (spriteRef.current) {
			spriteRef.current.material = materialRef.current;
			spriteRef.current.renderOrder = 10;
		}
		const mat = materialRef.current;
		return () => {
			mat.dispose();
		};
	}, []);

	const offset = phaseOffset(entity.id);
	const lines = entity.otter.lines ?? [];

	// Proximity state — only triggers a React re-render when it actually changes.
	const isNearRef = useRef(false);
	const [isNear, setIsNear] = useState(false);
	const [dialogueIndex, setDialogueIndex] = useState(0);

	useFrame((state) => {
		const wp = entity.worldPosition;

		// Position the group at the otter's world position + lift off terrain.
		if (groupRef.current) {
			groupRef.current.position.set(wp.x, wp.y + GROUND_LIFT, wp.z);
		}

		// Swap animation frame each tick.
		if (spriteRef.current) {
			const mat = spriteRef.current.material as THREE.SpriteMaterial;
			const frames = entity.otter.moving ? walkFrames : idleFrames;
			const idx =
				Math.floor((state.clock.elapsedTime + offset) * ANIM_FPS) %
				frames.length;
			mat.map = frames[idx];
			mat.needsUpdate = true;
		}

		// Proximity check — show bubble when any player unit is close enough.
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

	return (
		<group ref={groupRef}>
			{/*
			  Billboard sprite — THREE.Sprite auto-faces the camera.
			  Center is at SPRITE_HEIGHT above the group (which is GROUND_LIFT
			  above terrain), so the bottom of the sprite sits clearly on the ground.
			*/}
			<sprite
				ref={spriteRef}
				position={[0, SPRITE_HEIGHT * 0.5, 0]}
				scale={[SPRITE_WIDTH, SPRITE_HEIGHT, 1]}
			/>

			{/* Speech bubble — visible when a player unit is nearby */}
			{isNear && currentLine && (
				<Html
					position={[0, SPRITE_HEIGHT * 1.1, 0]}
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
// Renderer — one sprite per otter entity
// ---------------------------------------------------------------------------

export function OtterRenderer() {
	return (
		<>
			{Array.from(otters).map((entity) => (
				<OtterSprite key={entity.id} entity={entity} />
			))}
		</>
	);
}
