/**
 * Globe — the ONE persistent R3F Canvas component.
 *
 * Always visible across all phases. Contains:
 *   - Title scene (globe, storms, lightning, title text) in title/setup/generating
 *   - Game scene (board, units, buildings, fog) in playing
 *
 * Phase transitions:
 *   "title"      — Globe rotates slowly, title text visible, far orbit camera
 *   "setup"      — Same as title (globe visible behind setup modal)
 *   "generating" — Globe growth animation 0.3→1, title text fades out
 *   "playing"    — Game renderers active, title scene hidden
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Text } from "@react-three/drei";
import type { World } from "koota";
import { Suspense, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { BoardConfig, GeneratedBoard } from "../board/types";
import { SphereOrbitCamera } from "../camera";
import { resolveAttacks } from "../ecs/systems/attackSystem";
import { BoardInput } from "../input/BoardInput";
import { BiomeRenderer } from "../rendering/BiomeRenderer";
import { CombatEffectsRenderer } from "../rendering/CombatEffectsRenderer";
import { CultDomeRenderer } from "../rendering/CultDomeRenderer";
import { CutawayClipPlane } from "../rendering/CutawayClipPlane";
import { UnifiedTerrainRenderer } from "../rendering/UnifiedTerrainRenderer";
import { FragmentRenderer } from "../rendering/FragmentRenderer";
import { IlluminatorRenderer } from "../rendering/IlluminatorRenderer";
import { InfrastructureRenderer } from "../rendering/InfrastructureRenderer";
import { LodGlobe } from "../rendering/LodGlobe";
import { StructureRenderer } from "../rendering/StructureRenderer";
import { SalvageRenderer } from "../rendering/SalvageRenderer";
import { BuildingRenderer } from "../rendering/BuildingRenderer";
import { HighlightRenderer } from "../rendering/HighlightRenderer";
import { ParticleRenderer } from "../rendering/particles/ParticleRenderer";
import { TerritoryOverlayRenderer } from "../rendering/TerritoryOverlayRenderer";
import { PathRenderer } from "../rendering/PathRenderer";
import { StormSky } from "../rendering/StormSky";
import { turnToChronometry } from "../rendering/sky/chronometry";
import type { StormProfile } from "../world/config";
import { UnitRenderer } from "../rendering/UnitRenderer";
import { SpeechBubbleRenderer } from "../rendering/SpeechBubbleRenderer";
import { UnitStatusBars } from "../rendering/UnitStatusBars";
import { HoverTracker } from "./game/HoverTracker";
import { Hypercane, LightningEffect, StormClouds } from "../rendering/globe";
import {
	globeFragmentShader,
	globeVertexShader,
} from "../rendering/globe/shaders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GlobePhase = "title" | "setup" | "generating" | "playing";

export interface GlobeProps {
	phase: GlobePhase;
	config?: BoardConfig;
	board?: GeneratedBoard;
	world?: World;
	selectedUnitId?: number | null;
	onSelect?: (id: number | null) => void;
	onSceneReady?: () => void;
	onTransitionComplete?: () => void;
	turn?: number;
	focusTileX?: number;
	focusTileZ?: number;
	stormProfile?: StormProfile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SceneLoop({ world }: { world: World }) {
	useFrame(() => {
		resolveAttacks(world);
	});
	return null;
}

function SceneReadySignal({ onReady }: { onReady: () => void }) {
	const notifyReady = useEffectEvent(onReady);
	useEffect(() => {
		notifyReady();
	}, []);
	return null;
}

// ─── Animated Globe (title phases only) ──────────────────────────────────────
// Animates growth via useFrame + direct uniform writes (no React state needed).

function AnimatedGlobe({
	phase,
	onGrowthComplete,
}: {
	phase: GlobePhase;
	onGrowthComplete?: () => void;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const growthRef = useRef(0.3);
	const firedRef = useRef(false);
	const onComplete = useEffectEvent(onGrowthComplete ?? (() => {}));

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 0.3 },
		}),
		[],
	);

	useFrame((state, delta) => {
		if (phase === "generating") {
			growthRef.current = Math.min(1, growthRef.current + delta * 0.14);
			// Fire callback once growth completes
			if (growthRef.current >= 1 && !firedRef.current) {
				firedRef.current = true;
				onComplete();
			}
		} else {
			growthRef.current = 0.3;
			firedRef.current = false;
		}

		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			uniforms.uGrowth.value = growthRef.current;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[2.5, 64, 64]} />
			<shaderMaterial
				vertexShader={globeVertexShader}
				fragmentShader={globeFragmentShader}
				uniforms={uniforms}
			/>
		</mesh>
	);
}

// ─── Animated Title Text (fades out during generating) ───────────────────────
// Uses direct material opacity writes via useFrame.

function AnimatedTitleText({ phase }: { phase: GlobePhase }) {
	const [ready, setReady] = useState(false);
	const groupRef = useRef<THREE.Group>(null);
	const opacityRef = useRef(1);
	const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

	useFrame((state, delta) => {
		if (groupRef.current) {
			groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
		}

		// Animate opacity
		if (phase === "generating") {
			opacityRef.current = Math.max(0, opacityRef.current - delta * 0.3);
		} else {
			opacityRef.current = Math.min(1, opacityRef.current + delta * 2);
		}

		// Apply to all registered materials
		for (const mat of materialsRef.current) {
			mat.opacity = opacityRef.current;
		}
	});

	const title = "SYNTHETERIA";
	const subtitle = "MACHINE CONSCIOUSNESS AWAKENS";
	const radius = 3.0;
	const titleArc = Math.PI * 0.55;
	const subArc = Math.PI * 0.50;

	// Collect material refs
	const registerMaterial = (mat: THREE.MeshBasicMaterial | null) => {
		if (mat && !materialsRef.current.includes(mat)) {
			materialsRef.current.push(mat);
		}
	};

	return (
		<group ref={groupRef} visible={ready}>
			{title.split("").map((char, i) => {
				const angle = -titleArc / 2 + (i / (title.length - 1)) * titleArc;
				const x = Math.sin(angle) * radius;
				const z = Math.cos(angle) * radius;
				return (
					<Text
						key={`t${i}`}
						position={[x, 0.3, z]}
						rotation={[0, angle, 0]}
						fontSize={0.55}
						anchorX="center"
						anchorY="middle"
						renderOrder={10}
						outlineWidth={0.015}
						outlineColor="#3a6a8a"
						onSync={i === 0 ? () => setReady(true) : undefined}
					>
						{char}
						<meshBasicMaterial
							ref={registerMaterial}
							color="#aaeeff"
							toneMapped={false}
							depthTest={false}
							transparent
						/>
					</Text>
				);
			})}

			{subtitle.split("").map((char, i) => {
				const angle = -subArc / 2 + (i / (subtitle.length - 1)) * subArc;
				const x = Math.sin(angle) * radius;
				const z = Math.cos(angle) * radius;
				return (
					<Text
						key={`s${i}`}
						position={[x, -0.25, z]}
						rotation={[0, angle, 0]}
						fontSize={0.12}
						anchorX="center"
						anchorY="middle"
						renderOrder={10}
					>
						{char}
						<meshBasicMaterial
							ref={registerMaterial}
							color="#8be6ff"
							toneMapped={false}
							depthTest={false}
							transparent
						/>
					</Text>
				);
			})}
		</group>
	);
}

// ─── Title Camera — zooms toward globe surface during generating ─────────────

/** Far orbit distance (title/setup). */
const TITLE_CAM_Z = 10;
/** Near distance at end of generating zoom (just above globe surface). */
const SURFACE_CAM_Z = 3.5;
/** Zoom speed — matches ~5s growth rate so camera arrives when growth=1. */
const ZOOM_SPEED = 0.14;

function TitleCamera({ phase }: { phase: GlobePhase }) {
	const camRef = useRef<THREE.PerspectiveCamera>(null);
	const zRef = useRef(TITLE_CAM_Z);

	useFrame((_, delta) => {
		if (!camRef.current) return;
		if (phase === "generating") {
			// Ease toward surface
			const target = SURFACE_CAM_Z;
			const t = 1 - Math.pow(0.15, delta * ZOOM_SPEED * 3);
			zRef.current = zRef.current + (target - zRef.current) * t;
		} else {
			// Snap back to far orbit
			zRef.current = TITLE_CAM_Z;
		}
		camRef.current.position.z = zRef.current;
	});

	return <PerspectiveCamera ref={camRef} makeDefault position={[0, 0, TITLE_CAM_Z]} />;
}

// ─── Title Scene ──────────────────────────────────────────────────────────────

function TitleScene({
	phase,
	onTransitionComplete,
}: {
	phase: GlobePhase;
	onTransitionComplete?: () => void;
}) {
	return (
		<>
			<TitleCamera phase={phase} />
			<ambientLight intensity={0.15} />
			<pointLight position={[10, 10, 10]} intensity={0.4} color="#8be6ff" />
			<pointLight position={[-8, -4, -8]} intensity={0.2} color="#350a55" />

			<AnimatedGlobe phase={phase} onGrowthComplete={onTransitionComplete} />
			<AnimatedTitleText phase={phase} />
		</>
	);
}

// ─── Persistent Storm Effects ─────────────────────────────────────────────────
// StormClouds, Hypercane, and LightningEffect render in ALL phases.
// During title/setup/generating: small scale centered at origin (around the globe).
// During playing: scaled up and centered at board center, forming the sky interior.

/** Scale factor to enlarge title storm effects to game-world sky size. */
const STORM_SKY_SCALE = 30;
/** StormClouds radius during playing — comfortably outside the board sphere. */
const GAME_STORM_RADIUS = 250;

function PersistentStormEffects({
	phase,
	boardCenterX = 0,
	boardCenterZ = 0,
}: {
	phase: GlobePhase;
	boardCenterX?: number;
	boardCenterZ?: number;
}) {
	const isPlaying = phase === "playing";
	return (
		<group
			position={isPlaying ? [boardCenterX, 0, boardCenterZ] : [0, 0, 0]}
			scale={isPlaying ? STORM_SKY_SCALE : 1}
		>
			<StormClouds radius={isPlaying ? GAME_STORM_RADIUS / STORM_SKY_SCALE : 8} />
			<LightningEffect />
			<Hypercane />
		</group>
	);
}

// ─── Game Scene ───────────────────────────────────────────────────────────────

function GameScene({
	board,
	world,
	selectedUnitId,
	onSelect,
	onSceneReady,
	turn = 1,
	focusTileX,
	focusTileZ,
	stormProfile = "stable",
}: {
	board?: GeneratedBoard;
	world?: World;
	selectedUnitId?: number | null;
	onSelect?: (id: number | null) => void;
	onSceneReady?: () => void;
	turn?: number;
	focusTileX?: number;
	focusTileZ?: number;
	stormProfile?: StormProfile;
}) {
	const { dayAngle, season } = turnToChronometry(turn);

	const bw = board?.config.width;
	const bh = board?.config.height;

	return (
		<>
			{onSceneReady && <SceneReadySignal onReady={onSceneReady} />}

			{/* Storm-filtered ambient — dim baseline, illuminator orbs provide local light */}
			<ambientLight intensity={0.6} color={0xe8dcd0} />
			<hemisphereLight
				intensity={0.4}
				color={0xd0c8c0}
				groundColor={0x302820}
			/>
			{/* Wormhole eye zenith glow — faint directional from the eye column */}
			<directionalLight
				position={[0, 100, 0]}
				intensity={1.0}
				color={0xd8d0e8}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-near={0.5}
				shadow-camera-far={400}
				shadow-camera-left={-80}
				shadow-camera-right={80}
				shadow-camera-top={80}
				shadow-camera-bottom={-80}
			/>

			<StormSky
				centerX={0}
				centerZ={0}
				dayAngle={dayAngle}
				season={season}
				stormProfile={stormProfile}
			/>

			{board && (
				<SphereOrbitCamera
					initialTileX={focusTileX ?? Math.floor(board.config.width / 2)}
					initialTileZ={focusTileZ ?? Math.floor(board.config.height / 2)}
					boardWidth={board.config.width}
					boardHeight={board.config.height}
				/>
			)}
			<CutawayClipPlane />

			{board && <LodGlobe boardWidth={board.config.width} boardHeight={board.config.height} />}
			{board && <BiomeRenderer board={board} dayAngle={dayAngle} season={season} />}
			{board && <UnifiedTerrainRenderer board={board} world={world ?? undefined} turn={turn} />}
			{board && <StructureRenderer board={board} world={world ?? undefined} useSphere boardWidth={bw} boardHeight={bh} />}
			{board && <InfrastructureRenderer board={board} world={world ?? undefined} />}

			{world && bw && bh && <SalvageRenderer world={world} useSphere boardWidth={bw} boardHeight={bh} />}
			{world && bw && bh && <BuildingRenderer world={world} useSphere boardWidth={bw} boardHeight={bh} />}
			{world && bw && bh && <CultDomeRenderer world={world} boardWidth={bw} boardHeight={bh} />}
			{board && bw && bh && <IlluminatorRenderer board={board} boardWidth={bw} boardHeight={bh} />}
			<FragmentRenderer />
			{world && board && <TerritoryOverlayRenderer board={board} world={world} />}

			{world && <SceneLoop world={world} />}
			{world && bw && bh && <HighlightRenderer world={world} useSphere boardWidth={bw} boardHeight={bh} />}
			<PathRenderer />
			{world && bw && bh && <UnitRenderer world={world} useSphere boardWidth={bw} boardHeight={bh} />}
			{world && board && onSelect && (
				<BoardInput
					world={world}
					board={board}
					selectedId={selectedUnitId}
					onSelect={onSelect}
					useSphere
				/>
			)}
			{world && board && <HoverTracker world={world} board={board} />}
			{world && <CombatEffectsRenderer world={world} />}
			{world && <UnitStatusBars world={world} selectedUnitId={selectedUnitId} />}
			{world && <SpeechBubbleRenderer world={world} />}
			<ParticleRenderer />
		</>
	);
}

// ─── Globe Component ─────────────────────────────────────────────────────────

export function Globe({
	phase,
	board,
	world,
	selectedUnitId,
	onSelect,
	onSceneReady,
	onTransitionComplete,
	turn = 1,
	focusTileX,
	focusTileZ,
	stormProfile,
}: GlobeProps) {
	return (
		<Canvas
			style={{
				position: "absolute",
				inset: 0,
				background: phase === "playing" ? "#2a2535" : "#030308",
			}}
			gl={{ alpha: false }}
			shadows={phase === "playing" ? { type: THREE.PCFShadowMap } : undefined}
			onCreated={({ gl }) => {
				const canvas = gl.domElement;
				canvas.addEventListener("webglcontextlost", (e) => {
					e.preventDefault();
					console.warn("[Globe] WebGL context lost — attempting restore");
				});
				canvas.addEventListener("webglcontextrestored", () => {
					console.warn("[Globe] WebGL context restored");
				});
			}}
		>
			{phase === "playing" && (
				<fogExp2 attach="fog" args={["#2a2535", 0.006]} />
			)}

			<Suspense fallback={null}>
				{phase !== "playing" && <TitleScene phase={phase} onTransitionComplete={onTransitionComplete} />}

				{phase === "playing" && (
					<GameScene
						board={board}
						world={world}
						selectedUnitId={selectedUnitId}
						onSelect={onSelect}
						onSceneReady={onSceneReady}
						turn={turn}
						focusTileX={focusTileX}
						focusTileZ={focusTileZ}
						stormProfile={stormProfile}
					/>
				)}

				{/* Storm effects render in ALL phases — they ARE the sky */}
				<PersistentStormEffects
					phase={phase}
					boardCenterX={0}
					boardCenterZ={0}
				/>
			</Suspense>
		</Canvas>
	);
}
