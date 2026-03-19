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
 *   "generating" — 7-second diegetic cinematic:
 *                   Phase 1 (0-1.5s):  Lattice spreads (uGrowth 0.3->0.7)
 *                   Phase 2 (1.5-3s):  Storm intensifies, lightning doubles
 *                   Phase 3 (3-4.5s):  Wormhole opens, uGrowth->1.0, bright flash
 *                   Phase 4 (4.5-6s):  Camera zooms orbit->surface, title gone
 *                   Phase 5 (6-7s):    Transition complete, game phase begins
 *   "playing"    — Game renderers active, title scene hidden
 */

import { PerspectiveCamera, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { World } from "koota";
import {
	Suspense,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import type { BoardConfig, GeneratedBoard } from "../board/types";
import { SphereOrbitCamera } from "../camera";
import { resolveAttacks } from "../systems/attackSystem";
import { BoardInput } from "../input/BoardInput";
import { BiomeRenderer } from "../view/renderers/BiomeRenderer";
import { BuildingRenderer } from "../view/renderers/BuildingRenderer";
import { CombatEffectsRenderer } from "../view/effects/CombatEffectsRenderer";
import { CultDomeRenderer } from "../view/renderers/CultDomeRenderer";
import { CutawayClipPlane } from "../view/renderers/CutawayClipPlane";
import { FogOfWarRenderer } from "../view/overlays/FogOfWarRenderer";
import { FragmentRenderer } from "../view/renderers/FragmentRenderer";
import { Hypercane, LightningEffect, StormClouds } from "../view/globe";
import { cinematicState } from "../rendering/globe/cinematicState";
import {
	globeFragmentShader,
	globeVertexShader,
} from "../rendering/globe/shaders";
import { HighlightRenderer } from "../view/overlays/HighlightRenderer";
import { IlluminatorRenderer } from "../view/renderers/IlluminatorRenderer";
import { InfrastructureRenderer } from "../view/renderers/InfrastructureRenderer";
import { LodGlobe } from "../view/renderers/LodGlobe";
import { PathRenderer } from "../view/overlays/PathRenderer";
import { ParticleRenderer } from "../view/effects/ParticleRenderer";
import { SalvageRenderer } from "../view/renderers/SalvageRenderer";
import { SpeechBubbleRenderer } from "../view/effects/SpeechBubbleRenderer";
import { StormSky } from "../view/renderers/StormSky";
import { StructureRenderer } from "../view/renderers/StructureRenderer";
import { turnToChronometry } from "../rendering/sky/chronometry";
import { TerritoryOverlayRenderer } from "../view/overlays/TerritoryOverlayRenderer";
import { UnifiedTerrainRenderer } from "../view/renderers/UnifiedTerrainRenderer";
import { UnitRenderer } from "../view/renderers/UnitRenderer";
import { UnitStatusBars } from "../view/UnitStatusBars";
import type { StormProfile } from "../world/config";
import { HoverTracker } from "./game/HoverTracker";

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

// ─── Cinematic Timeline ──────────────────────────────────────────────────────
// 5-phase, 7-second diegetic transition when "generating" begins.
//
// Phase 1 (0–1.5s):  Lattice spreads across globe (uGrowth 0.3→0.7)
// Phase 2 (1.5–3s):  Storm intensifies — clouds faster, lightning doubles
// Phase 3 (3–4.5s):  Wormhole opens — hypercane spins up, uGrowth 0.9→1.0, flash
// Phase 4 (4.5–6s):  Camera zooms from orbit to surface, title text fully faded
// Phase 5 (6–7s):    "GENERATING..." overlay fades, game phase begins

const CINEMATIC_DURATION = 7;

// cinematicState is imported from rendering/globe/cinematicState.ts
// Written here by TitleScene's useFrame, read by storm effect components each frame.

/** Compute cinematic beat parameters from elapsed time [0, CINEMATIC_DURATION]. */
function cinematicBeat(t: number) {
	// Clamp to [0, duration]
	const ct = Math.max(0, Math.min(t, CINEMATIC_DURATION));

	// uGrowth: 0.3→0.7 (0–1.5s), 0.7→0.9 (1.5–3s), 0.9→1.0 (3–4.5s), hold 1.0
	let growth: number;
	if (ct < 1.5) {
		growth = 0.3 + (0.4 * ct) / 1.5; // 0.3 → 0.7
	} else if (ct < 3) {
		growth = 0.7 + (0.2 * (ct - 1.5)) / 1.5; // 0.7 → 0.9
	} else if (ct < 4.5) {
		growth = 0.9 + (0.1 * (ct - 3)) / 1.5; // 0.9 → 1.0
	} else {
		growth = 1.0;
	}

	// Storm cloud speed multiplier: 1→1 (0–1.5s), ramp 1→2.5 (1.5–3s), hold 2.5
	const stormSpeed = ct < 1.5 ? 1 : ct < 3 ? 1 + (1.5 * (ct - 1.5)) / 1.5 : 2.5;

	// Lightning frequency multiplier: 1 (0–1.5s), 2 (1.5–3s+)
	const lightningFreq = ct < 1.5 ? 1 : 2;

	// Wormhole/hypercane intensity: 1 (0–3s), ramp 1→3 (3–4.5s), hold 3
	const wormholeIntensity =
		ct < 3 ? 1 : ct < 4.5 ? 1 + (2 * (ct - 3)) / 1.5 : 3;

	// Camera zoom: hold orbit (0–4.5s), zoom (4.5–6s), hold surface (6+)
	// Returns 0→1 zoom progress
	const zoomProgress = ct < 4.5 ? 0 : ct < 6 ? (ct - 4.5) / 1.5 : 1;

	// Title text opacity: hold 1 (0–1.5s), fade 1→0 (1.5–4.5s)
	const titleOpacity = ct < 1.5 ? 1 : ct < 4.5 ? 1 - (ct - 1.5) / 3 : 0;

	// Flash intensity: spike at growth=1.0 moment (~4.5s), decay quickly
	let flash = 0;
	if (ct >= 4.3 && ct < 5.5) {
		// Peak at 4.5s, sharp rise then exponential decay
		const ft = ct - 4.5;
		if (ft < 0) flash = Math.max(0, 1 - Math.abs(ft) * 5);
		else flash = Math.exp(-ft * 4);
	}

	return {
		growth,
		stormSpeed,
		lightningFreq,
		wormholeIntensity,
		zoomProgress,
		titleOpacity,
		flash,
	};
}

// ─── Animated Globe (title phases only) ──────────────────────────────────────
// Animates growth via useFrame + direct uniform writes (no React state needed).

function AnimatedGlobe({
	phase,
	cinematicTime,
}: {
	phase: GlobePhase;
	cinematicTime: React.RefObject<number>;
}) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 0.3 },
		}),
		[],
	);

	useFrame((state) => {
		const growth =
			phase === "generating"
				? cinematicBeat(cinematicTime.current).growth
				: 0.3;

		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			uniforms.uGrowth.value = growth;
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

// ─── Cinematic Flash Overlay ─────────────────────────────────────────────────
// Full-screen additive flash at the wormhole-opens moment (uGrowth hits 1.0).

function CinematicFlash({
	phase,
	cinematicTime,
}: {
	phase: GlobePhase;
	cinematicTime: React.RefObject<number>;
}) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uFlash: { value: 0 },
		}),
		[],
	);

	useFrame(() => {
		if (!meshRef.current) return;
		const flash =
			phase === "generating" ? cinematicBeat(cinematicTime.current).flash : 0;
		uniforms.uFlash.value = flash;
		meshRef.current.visible = flash > 0.01;
	});

	return (
		<mesh ref={meshRef} renderOrder={999} visible={false}>
			<planeGeometry args={[100, 100]} />
			<shaderMaterial
				uniforms={uniforms}
				vertexShader={`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`}
				fragmentShader={`
					uniform float uFlash;
					void main() {
						gl_FragColor = vec4(0.85, 0.75, 1.0, uFlash * 0.8);
					}
				`}
				transparent
				depthTest={false}
				depthWrite={false}
				blending={THREE.AdditiveBlending}
			/>
		</mesh>
	);
}

// ─── Animated Title Text (fades out during generating) ───────────────────────
// Uses direct material opacity writes via useFrame.

function AnimatedTitleText({
	phase,
	cinematicTime,
}: {
	phase: GlobePhase;
	cinematicTime: React.RefObject<number>;
}) {
	const [ready, setReady] = useState(false);
	const groupRef = useRef<THREE.Group>(null);
	const opacityRef = useRef(1);
	const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

	useFrame((state, delta) => {
		if (groupRef.current) {
			groupRef.current.position.y =
				Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
		}

		// Animate opacity — cinematic-driven during generating, instant restore otherwise
		if (phase === "generating") {
			opacityRef.current = cinematicBeat(cinematicTime.current).titleOpacity;
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
	const subArc = Math.PI * 0.5;

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

function TitleCamera({
	phase,
	cinematicTime,
}: {
	phase: GlobePhase;
	cinematicTime: React.RefObject<number>;
}) {
	const camRef = useRef<THREE.PerspectiveCamera>(null);
	const zRef = useRef(TITLE_CAM_Z);

	useFrame(() => {
		if (!camRef.current) return;
		if (phase === "generating") {
			const { zoomProgress } = cinematicBeat(cinematicTime.current);
			// Ease-out cubic for smooth zoom
			const eased = 1 - Math.pow(1 - zoomProgress, 3);
			zRef.current = TITLE_CAM_Z + (SURFACE_CAM_Z - TITLE_CAM_Z) * eased;
		} else {
			// Snap back to far orbit
			zRef.current = TITLE_CAM_Z;
		}
		camRef.current.position.z = zRef.current;
	});

	return (
		<PerspectiveCamera
			ref={camRef}
			makeDefault
			position={[0, 0, TITLE_CAM_Z]}
		/>
	);
}

// ─── Title Scene ──────────────────────────────────────────────────────────────

function TitleScene({
	phase,
	onTransitionComplete,
	cinematicTime,
}: {
	phase: GlobePhase;
	onTransitionComplete?: () => void;
	cinematicTime: React.RefObject<number>;
}) {
	const firedRef = useRef(false);
	const onComplete = useEffectEvent(onTransitionComplete ?? (() => {}));

	// Accumulate cinematic elapsed time during "generating"
	useFrame((_, delta) => {
		if (phase === "generating") {
			cinematicTime.current = Math.min(
				CINEMATIC_DURATION,
				cinematicTime.current + delta,
			);
			// Update module-level cinematic state for storm effects
			const beat = cinematicBeat(cinematicTime.current);
			cinematicState.stormSpeed = beat.stormSpeed;
			cinematicState.lightningFreq = beat.lightningFreq;
			cinematicState.wormholeIntensity = beat.wormholeIntensity;
			// Fire transition callback once cinematic completes
			if (cinematicTime.current >= CINEMATIC_DURATION && !firedRef.current) {
				firedRef.current = true;
				onComplete();
			}
		} else {
			cinematicTime.current = 0;
			firedRef.current = false;
			// Reset storm state
			cinematicState.stormSpeed = 1;
			cinematicState.lightningFreq = 1;
			cinematicState.wormholeIntensity = 1;
		}
	});

	return (
		<>
			<TitleCamera phase={phase} cinematicTime={cinematicTime} />
			<ambientLight intensity={0.15} />
			<pointLight position={[10, 10, 10]} intensity={0.4} color="#8be6ff" />
			<pointLight position={[-8, -4, -8]} intensity={0.2} color="#350a55" />

			<AnimatedGlobe phase={phase} cinematicTime={cinematicTime} />
			<AnimatedTitleText phase={phase} cinematicTime={cinematicTime} />
			<CinematicFlash phase={phase} cinematicTime={cinematicTime} />
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
			<StormClouds
				radius={isPlaying ? GAME_STORM_RADIUS / STORM_SKY_SCALE : 8}
			/>
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

			{/* Storm-filtered ambient — readable baseline, illuminator orbs add extra pools of light */}
			<ambientLight intensity={0.8} color={0xe8dcd0} />
			<hemisphereLight
				intensity={0.5}
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

			{board && (
				<LodGlobe
					boardWidth={board.config.width}
					boardHeight={board.config.height}
				/>
			)}
			{board && (
				<BiomeRenderer board={board} dayAngle={dayAngle} season={season} />
			)}
			{board && (
				<UnifiedTerrainRenderer
					board={board}
					world={world ?? undefined}
					turn={turn}
				/>
			)}
			{board && (
				<StructureRenderer
					board={board}
					world={world ?? undefined}
					useSphere
					boardWidth={bw}
					boardHeight={bh}
				/>
			)}
			{board && (
				<InfrastructureRenderer board={board} world={world ?? undefined} />
			)}

			{world && bw && bh && (
				<SalvageRenderer
					world={world}
					useSphere
					boardWidth={bw}
					boardHeight={bh}
				/>
			)}
			{world && bw && bh && (
				<BuildingRenderer
					world={world}
					useSphere
					boardWidth={bw}
					boardHeight={bh}
				/>
			)}
			{world && bw && bh && (
				<CultDomeRenderer world={world} boardWidth={bw} boardHeight={bh} />
			)}
			{board && bw && bh && (
				<IlluminatorRenderer board={board} boardWidth={bw} boardHeight={bh} />
			)}
			<FragmentRenderer />
			{world && board && (
				<TerritoryOverlayRenderer board={board} world={world} />
			)}
			{world && board && <FogOfWarRenderer world={world} board={board} />}

			{world && <SceneLoop world={world} />}
			{world && bw && bh && (
				<HighlightRenderer
					world={world}
					useSphere
					boardWidth={bw}
					boardHeight={bh}
				/>
			)}
			<PathRenderer />
			{world && bw && bh && (
				<UnitRenderer
					world={world}
					selectedUnitId={selectedUnitId}
					useSphere
					boardWidth={bw}
					boardHeight={bh}
				/>
			)}
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
			{world && (
				<UnitStatusBars world={world} selectedUnitId={selectedUnitId} />
			)}
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
	const cinematicTime = useRef(0);

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
				{phase !== "playing" && (
					<TitleScene
						phase={phase}
						onTransitionComplete={onTransitionComplete}
						cinematicTime={cinematicTime}
					/>
				)}

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
