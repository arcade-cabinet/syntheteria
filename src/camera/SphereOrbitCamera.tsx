/**
 * SphereOrbitCamera — orbit camera around the game sphere.
 *
 * Sphere world orbit camera. The camera orbits around
 * the sphere center (0,0,0). "Panning" rotates the globe under the camera.
 * Scroll zooms (changes orbit distance).
 *
 * Controls:
 *   - Left drag: orbit (rotate azimuth + polar)
 *   - Scroll: zoom (change orbit radius)
 *   - WASD: orbit via keyboard (rotate around sphere)
 *   - Pan is DISABLED — the world rotates, not the camera target
 *
 * Polar angle clamped so the camera stays in a useful viewing range:
 *   MIN_POLAR ~20° from equator (near overhead at pole)
 *   MAX_POLAR ~80° from equator (near horizon)
 *
 * The camera starts positioned above the player's spawn GPS coordinate
 * on the sphere, computed via tileToSpherePos().
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
import { sphereRadius, tileToSpherePos } from "../board";
import {
	registerCameraControls,
	unregisterCameraControls,
} from "./cameraStore";
import type { CameraControls } from "./types";

// ── Camera constants ──────────────────────────────────────────────────────────

/** Field of view. */
export const FOV = 45;

/**
 * Zoom bounds (orbit distance from sphere center).
 * MIN_ZOOM: close to the surface (tactical view).
 * MAX_ZOOM: far enough to see the whole planet.
 */
export const MIN_ZOOM_FACTOR = 1.15; // 1.15x sphere radius = surface level
export const MAX_ZOOM_FACTOR = 5.5; // 5.5x sphere radius = full planet in viewport (strategic zoom)

/** Default zoom: 1.8x radius — see a district-sized area. */
export const DEFAULT_ZOOM_FACTOR = 1.8;

/**
 * Polar angle bounds (angle from Y+ axis, in radians).
 * 0 = directly above north pole, PI/2 = equator, PI = south pole.
 * We clamp to [~10°, ~170°] so the camera can reach both poles
 * but never goes to the exact singularity.
 */
export const MIN_POLAR = Math.PI * 0.05; // ~9° from north pole
export const MAX_POLAR = Math.PI * 0.95; // ~9° from south pole

const KEY_ORBIT_SPEED = 1.5; // radians/sec for WASD orbit

// ── Component ─────────────────────────────────────────────────────────────────

type SphereOrbitCameraProps = {
	/** Tile X of initial camera focus (e.g., player spawn). */
	initialTileX?: number;
	/** Tile Z of initial camera focus (e.g., player spawn). */
	initialTileZ?: number;
	/** Board width in tiles. */
	boardWidth: number;
	/** Board height in tiles. */
	boardHeight: number;
	/** Optional ref to receive imperative camera controls. */
	controlsRef?: MutableRefObject<CameraControls | null>;
};

export function SphereOrbitCamera({
	initialTileX,
	initialTileZ,
	boardWidth,
	boardHeight,
	controlsRef,
}: SphereOrbitCameraProps) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orbitRef = useRef<any>(null);
	const keys = useRef(new Set<string>());
	const { camera } = useThree();

	const R = useMemo(
		() => sphereRadius(boardWidth, boardHeight),
		[boardWidth, boardHeight],
	);
	const minDist = R * MIN_ZOOM_FACTOR;
	const maxDist = R * MAX_ZOOM_FACTOR;
	const defaultDist = R * DEFAULT_ZOOM_FACTOR;

	// Compute initial camera position — above the spawn tile on the sphere
	const startTileX = initialTileX ?? Math.floor(boardWidth / 2);
	const startTileZ = initialTileZ ?? Math.floor(boardHeight / 2);
	const spawnPos = useMemo(
		() => tileToSpherePos(startTileX, startTileZ, boardWidth, boardHeight, R),
		[startTileX, startTileZ, boardWidth, boardHeight, R],
	);

	// Camera position: along the spawn direction, at defaultDist from center
	const startCamPos = useMemo(() => {
		const len = Math.sqrt(
			spawnPos.x * spawnPos.x +
				spawnPos.y * spawnPos.y +
				spawnPos.z * spawnPos.z,
		);
		const scale = defaultDist / Math.max(len, 0.001);
		return new THREE.Vector3(
			spawnPos.x * scale,
			spawnPos.y * scale,
			spawnPos.z * scale,
		);
	}, [spawnPos, defaultDist]);

	// ── Seat camera on mount ────────────────────────────────────────────────
	useEffect(() => {
		const ctrl = orbitRef.current;
		if (!ctrl) return;
		ctrl.target.set(0, 0, 0);
		ctrl.object.position.copy(startCamPos);
		ctrl.object.lookAt(0, 0, 0);
		ctrl.update();
	}, [startCamPos]);

	// ── Keyboard listeners (skip typing targets) ────────────────────────────
	useEffect(() => {
		const isTyping = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			return (
				t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable
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
			panTo(x: number, z: number) {
				// Convert tile world-space coords to sphere position and orbit there
				const ctrl = orbitRef.current;
				if (!ctrl) return;
				const tileX = Math.floor(x / 2.0); // TILE_SIZE_M = 2.0
				const tileZ = Math.floor(z / 2.0);
				const pos = tileToSpherePos(tileX, tileZ, boardWidth, boardHeight, R);
				const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
				const currentDist = ctrl.object.position.length();
				const scale = currentDist / Math.max(len, 0.001);
				ctrl.object.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
				ctrl.object.lookAt(0, 0, 0);
				ctrl.update();
			},
			snapTo(x: number, z: number) {
				this.panTo(x, z);
			},
			setZoom(distance: number) {
				const ctrl = orbitRef.current;
				if (!ctrl) return;
				const clamped = Math.max(minDist, Math.min(maxDist, distance));
				const dir = ctrl.object.position.clone().normalize();
				ctrl.object.position.copy(dir.multiplyScalar(clamped));
				ctrl.update();
			},
			reset(centerX: number, centerZ: number) {
				this.panTo(centerX, centerZ);
			},
		}),
		[boardWidth, boardHeight, R, minDist, maxDist],
	);

	useImperativeHandle(controlsRef, () => controls, [controls]);

	// Register for global access (Minimap click-to-pan, etc.)
	useEffect(() => {
		registerCameraControls(controls);
		return () => unregisterCameraControls();
	}, [controls]);

	// ── Per-frame: WASD orbit ───────────────────────────────────────────────
	useFrame((_state, delta) => {
		const ctrl = orbitRef.current;
		if (!ctrl) return;

		const k = keys.current;
		if (k.size === 0) return;

		// WASD orbit: rotate camera position around the sphere center.
		// We modify the OrbitControls azimuthal and polar angles directly
		// by adjusting the camera position in spherical coordinates.
		let dAzimuth = 0;
		let dPolar = 0;
		const speed = KEY_ORBIT_SPEED * delta;

		if (k.has("a") || k.has("arrowleft")) dAzimuth += speed;
		if (k.has("d") || k.has("arrowright")) dAzimuth -= speed;
		if (k.has("w") || k.has("arrowup")) dPolar -= speed;
		if (k.has("s") || k.has("arrowdown")) dPolar += speed;

		if (dAzimuth !== 0 || dPolar !== 0) {
			// Convert camera position to spherical, adjust, convert back
			const pos = camera.position.clone();
			const spherical = new THREE.Spherical().setFromVector3(pos);
			spherical.theta += dAzimuth;
			spherical.phi = Math.max(
				MIN_POLAR,
				Math.min(MAX_POLAR, spherical.phi + dPolar),
			);
			pos.setFromSpherical(spherical);
			camera.position.copy(pos);
			camera.lookAt(0, 0, 0);
			ctrl.update();
		}
	});

	return (
		<>
			<PerspectiveCamera
				makeDefault
				fov={FOV}
				position={[startCamPos.x, startCamPos.y, startCamPos.z]}
				near={0.5}
				far={R * 10}
			/>
			<OrbitControls
				ref={orbitRef}
				target={[0, 0, 0]}
				enableDamping
				dampingFactor={0.08}
				enableZoom
				enablePan={false}
				enableRotate
				minDistance={minDist}
				maxDistance={maxDist}
				minPolarAngle={MIN_POLAR}
				maxPolarAngle={MAX_POLAR}
				rotateSpeed={0.5}
				zoomSpeed={1.0}
				mouseButtons={{
					LEFT: THREE.MOUSE.ROTATE,
					MIDDLE: THREE.MOUSE.DOLLY,
					RIGHT: THREE.MOUSE.ROTATE,
				}}
				touches={{
					ONE: THREE.TOUCH.ROTATE,
					TWO: THREE.TOUCH.DOLLY_ROTATE,
				}}
			/>
		</>
	);
}
