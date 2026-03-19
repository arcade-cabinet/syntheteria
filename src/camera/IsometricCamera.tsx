/**
 * IsometricCamera — Civ Rev 2-style fixed-angle diorama camera.
 *
 * PerspectiveCamera (FOV 45) + Drei OrbitControls, locked angle:
 *   - enableRotate = false: the angle is FIXED — no azimuth rotation.
 *     Players always know which way is "north". Disorientation-free strategy view.
 *   - enablePan + enableZoom: WASD/arrows pan the target; scroll/pinch zooms.
 *   - enableDamping for smooth lerped motion.
 *   - Polar angle: ~54°–76° from zenith — classic oblique isometric range.
 *   - FOV 45: wider than 35, still compresses perspective for the toy-board feel.
 *
 * Imperative API: pass a React ref to receive a CameraControls handle.
 *
 *   const camRef = useRef<CameraControls>(null);
 *   <IsometricCamera controlsRef={camRef} initialX={cx} initialZ={cz} />
 *   camRef.current?.panTo(unit.x, unit.z);
 *
 * Reference: Sid Meier's Civilization Revolution 2 (2014)
 *   docs/Grok-Civilization_Revolution_2_Visual_Recreation.md
 */

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
	type MutableRefObject,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from "react";
import * as THREE from "three";
import { registerCameraControls, unregisterCameraControls } from "./cameraStore";
import type { CameraControls } from "./types";

// ── Camera constants ──────────────────────────────────────────────────────────

/** Field of view. */
export const FOV = 45;

/** Camera height above target. */
export const ELEVATION = 80;

/** Camera distance behind target along Z. */
export const BACK_DISTANCE = 50;

/** Zoom bounds (distance from target).
 * MAX_ZOOM capped so the oblique camera angle + cylindrical curvature + fog
 * always hide the board edges. At 100 with fog density 0.018 and GHOST=40,
 * the curved surface rolls under before the edge becomes visible. */
export const MIN_ZOOM = 20;
export const MAX_ZOOM = 100;

/** Nominal default zoom distance. */
export const DEFAULT_ZOOM = Math.sqrt(ELEVATION ** 2 + BACK_DISTANCE ** 2);

/**
 * Polar angle bounds (angle from zenith, in radians).
 * Math.PI * 0.30 ≈ 54° — nearly overhead
 * Math.PI * 0.42 ≈ 76° — shallower, more side-on
 */
export const MIN_POLAR = Math.PI * 0.3;
export const MAX_POLAR = Math.PI * 0.42;

const KEY_PAN_SPEED = 0.25;

// ── Toroidal wrapping ────────────────────────────────────────────────────────

/**
 * Wrap a coordinate into [0, size) using modular arithmetic.
 * Works for negative values too: wrap(-1, 100) → 99.
 */
export function wrapCoord(v: number, size: number): number {
	return ((v % size) + size) % size;
}

/**
 * Apply toroidal wrapping to an OrbitControls instance.
 * Shifts both target and camera position by the same delta so the view
 * doesn't snap — only the world-space coordinates change.
 */
export function applyToroidalWrap(
	target: THREE.Vector3,
	cameraPos: THREE.Vector3,
	boardWidth: number,
	boardHeight: number,
): void {
	const wrappedX = wrapCoord(target.x, boardWidth);
	const wrappedZ = wrapCoord(target.z, boardHeight);
	const dx = wrappedX - target.x;
	const dz = wrappedZ - target.z;
	if (dx !== 0 || dz !== 0) {
		target.x = wrappedX;
		target.z = wrappedZ;
		cameraPos.x += dx;
		cameraPos.z += dz;
	}
}

// ── Component ─────────────────────────────────────────────────────────────────

type IsometricCameraProps = {
	initialX?: number;
	initialZ?: number;
	/** Initial zoom distance. Defaults to 40 (zoomed in on spawn). */
	initialZoom?: number;
	/** Board width in world units — enables toroidal wrapping on X axis. */
	boardWidth?: number;
	/** Board height in world units — enables toroidal wrapping on Z axis. */
	boardHeight?: number;
	/** Optional ref to receive imperative camera controls. */
	controlsRef?: MutableRefObject<CameraControls | null>;
};

/** Default zoom: tight on player spawn so first impression is immersive. */
export const INITIAL_ZOOM = 40;

export function IsometricCamera({
	initialX = 0,
	initialZ = 0,
	initialZoom = INITIAL_ZOOM,
	boardWidth,
	boardHeight,
	controlsRef,
}: IsometricCameraProps) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orbitRef = useRef<any>(null);
	const keys = useRef(new Set<string>());
	const { camera } = useThree();

	// Smooth panTo target
	const panTarget = useRef<THREE.Vector3 | null>(null);

	// ── Seat camera on mount ────────────────────────────────────────────────
	useEffect(() => {
		const ctrl = orbitRef.current;
		if (!ctrl) return;
		// Scale elevation and back distance by zoom / defaultZoom ratio
		// so initialZoom=40 starts noticeably closer than the default ~94.
		const ratio = initialZoom / DEFAULT_ZOOM;
		const elev = ELEVATION * ratio;
		const back = BACK_DISTANCE * ratio;
		ctrl.target.set(initialX, 0, initialZ);
		ctrl.object.position.set(initialX, elev, initialZ + back);
		ctrl.object.lookAt(initialX, 0, initialZ);
		ctrl.update();
	}, [initialX, initialZ, initialZoom]);

	// ── Keyboard listeners (skip typing targets) ────────────────────────────
	useEffect(() => {
		const isTyping = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			return (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.isContentEditable
			);
		};
		const down = (e: KeyboardEvent) => {
			if (!isTyping(e)) keys.current.add(e.key.toLowerCase());
		};
		const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		return () => {
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
		};
	}, []);

	// ── Imperative API ──────────────────────────────────────────────────────
	const controls = useMemo<CameraControls>(
		() => ({
			panTo(x, z) {
				panTarget.current = new THREE.Vector3(x, 0, z);
			},
			snapTo(x, z) {
				const ctrl = orbitRef.current;
				if (!ctrl) return;
				const dx = x - ctrl.target.x;
				const dz = z - ctrl.target.z;
				ctrl.target.set(x, 0, z);
				ctrl.object.position.x += dx;
				ctrl.object.position.z += dz;
				ctrl.update();
				panTarget.current = null;
			},
			setZoom(distance) {
				const ctrl = orbitRef.current;
				if (!ctrl) return;
				const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, distance));
				const dir = new THREE.Vector3()
					.subVectors(ctrl.object.position, ctrl.target)
					.normalize();
				ctrl.object.position.copy(
					ctrl.target.clone().addScaledVector(dir, clamped),
				);
				ctrl.update();
			},
			reset(centerX, centerZ) {
				const ctrl = orbitRef.current;
				if (!ctrl) return;
				ctrl.target.set(centerX, 0, centerZ);
				ctrl.object.position.set(
					centerX,
					ELEVATION,
					centerZ + BACK_DISTANCE,
				);
				ctrl.object.lookAt(centerX, 0, centerZ);
				ctrl.update();
				panTarget.current = null;
			},
		}),
		[],
	);

	useImperativeHandle(controlsRef, () => controls, [controls]);

	// Register for global access (Minimap click-to-pan, etc.)
	useEffect(() => {
		registerCameraControls(controls);
		return () => unregisterCameraControls();
	}, [controls]);

	// ── Per-frame: smooth panTo + WASD panning ──────────────────────────────
	useFrame((_state, delta) => {
		const ctrl = orbitRef.current;
		if (!ctrl) return;

		// Smooth programmatic pan (lerp target toward destination)
		if (panTarget.current) {
			ctrl.target.lerp(panTarget.current, Math.min(1, delta * 5));
			// Keep camera offset constant during pan — angle stays locked
			ctrl.object.position.x = ctrl.target.x;
			ctrl.object.position.z = ctrl.target.z + BACK_DISTANCE;
			if (ctrl.target.distanceTo(panTarget.current) < 0.01) {
				ctrl.target.copy(panTarget.current);
				panTarget.current = null;
			}
			ctrl.update();
		}

		// WASD / arrow key panning along fixed world axes.
		// Since rotation is disabled, world axes = "up/down/left/right on screen".
		const k = keys.current;
		if (k.size > 0) {
			const dist = camera.position.distanceTo(ctrl.target);
			const speed = KEY_PAN_SPEED * dist * delta;

			let dx = 0;
			let dz = 0;
			if (k.has("w") || k.has("arrowup")) dz -= speed;
			if (k.has("s") || k.has("arrowdown")) dz += speed;
			if (k.has("a") || k.has("arrowleft")) dx -= speed;
			if (k.has("d") || k.has("arrowright")) dx += speed;

			if (dx !== 0 || dz !== 0) {
				ctrl.target.x += dx;
				ctrl.target.z += dz;
				ctrl.object.position.x += dx;
				ctrl.object.position.z += dz;
				ctrl.update();
			}
		}

		// ── Toroidal wrap — keep target coordinates within board bounds ──
		// Runs unconditionally: wraps after WASD, mouse drag, or programmatic pan.
		if (boardWidth && boardHeight) {
			const prevX = ctrl.target.x;
			const prevZ = ctrl.target.z;
			applyToroidalWrap(
				ctrl.target,
				ctrl.object.position,
				boardWidth,
				boardHeight,
			);
			if (ctrl.target.x !== prevX || ctrl.target.z !== prevZ) {
				ctrl.update();
			}
		}
	});

	const zoomRatio = initialZoom / DEFAULT_ZOOM;
	const startElev = ELEVATION * zoomRatio;
	const startBack = BACK_DISTANCE * zoomRatio;

	return (
		<>
			<PerspectiveCamera
				makeDefault
				fov={FOV}
				position={[initialX, startElev, initialZ + startBack]}
				near={0.5}
				far={600}
			/>
			<OrbitControls
				ref={orbitRef}
				target={[initialX, 0, initialZ]}
				enableDamping
				dampingFactor={0.08}
				enableZoom
				enablePan
				enableRotate={false}
				minDistance={MIN_ZOOM}
				maxDistance={MAX_ZOOM}
				minPolarAngle={MIN_POLAR}
				maxPolarAngle={MAX_POLAR}
				panSpeed={1.2}
				screenSpacePanning={false}
				mouseButtons={{
					LEFT: THREE.MOUSE.PAN,
					MIDDLE: THREE.MOUSE.DOLLY,
					RIGHT: THREE.MOUSE.PAN,
				}}
				touches={{
					ONE: THREE.TOUCH.PAN,
					TWO: THREE.TOUCH.DOLLY_PAN,
				}}
			/>
		</>
	);
}
