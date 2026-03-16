import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { setCameraState } from "../rendering/cameraStateStore";
import { cancelCameraFocus, updateCameraFocus } from "../systems/cameraFocus";
import {
	getNextCycleTier,
	getTargetHeightForTier,
	updateZoomTier,
} from "../systems/zoomTier";

/**
 * Mobile-first top-down camera with touch pan/zoom and keyboard/mouse support.
 * No rotation — always looking straight down.
 *
 * Mobile: Two-finger drag to pan, pinch to zoom. Single-finger reserved for unit input.
 * Desktop: WASD/arrows to pan, scroll to zoom. Middle-click drag to pan.
 */

const MIN_ZOOM = 10;
const MAX_ZOOM = 80;
const PAN_SPEED = 0.5;
const MOMENTUM_DECAY = 0.92;

export function TopDownCamera() {
	const { camera, gl } = useThree();
	const target = useRef(new THREE.Vector3(0, 0, 0));
	const zoom = useRef(18);
	const velocity = useRef({ x: 0, z: 0 });
	const keys = useRef(new Set<string>());

	// Touch state
	const touchState = useRef<{
		twoFingerCenter: { x: number; y: number } | null;
		lastPinchDist: number | null;
		lastMoveTime: number;
		isPanning: boolean;
	}>({
		twoFingerCenter: null,
		lastPinchDist: null,
		lastMoveTime: 0,
		isPanning: false,
	});

	// Mouse drag state
	const mouseDrag = useRef<{ lastX: number; lastY: number } | null>(null);

	// Double-tap zoom snap state
	const lastTapTime = useRef(0);
	const lastTapPos = useRef({ x: 0, y: 0 });
	const snapTarget = useRef<number | null>(null);

	// Initialize camera
	useEffect(() => {
		camera.position.set(
			target.current.x,
			zoom.current,
			target.current.z + zoom.current * 0.6,
		);
		camera.lookAt(target.current);
	}, [camera]);

	// Keyboard events
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			keys.current.add(key);

			// Z key: cycle zoom tier (desktop equivalent of double-tap)
			if (key === "z" && !e.repeat) {
				const nextTier = getNextCycleTier();
				snapTarget.current = getTargetHeightForTier(nextTier);
			}
		};
		const onKeyUp = (e: KeyboardEvent) =>
			keys.current.delete(e.key.toLowerCase());
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	// Mouse wheel zoom + middle-click drag
	useEffect(() => {
		const canvas = gl.domElement;

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			zoom.current = Math.max(
				MIN_ZOOM,
				Math.min(MAX_ZOOM, zoom.current + e.deltaY * 0.05),
			);
		};

		const onMouseDown = (e: MouseEvent) => {
			// Middle mouse button for camera pan
			if (e.button === 1) {
				e.preventDefault();
				mouseDrag.current = { lastX: e.clientX, lastY: e.clientY };
			}
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!mouseDrag.current) return;
			const dx = e.clientX - mouseDrag.current.lastX;
			const dy = e.clientY - mouseDrag.current.lastY;
			const scale = zoom.current * 0.003;
			target.current.x -= dx * scale;
			target.current.z -= dy * scale;
			mouseDrag.current = { lastX: e.clientX, lastY: e.clientY };
		};

		const onMouseUp = (e: MouseEvent) => {
			if (e.button === 1) {
				mouseDrag.current = null;
			}
		};

		canvas.addEventListener("wheel", onWheel, { passive: false });
		canvas.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			canvas.removeEventListener("wheel", onWheel);
			canvas.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [gl]);

	// Touch events: two-finger pan and pinch zoom only
	useEffect(() => {
		const canvas = gl.domElement;
		const ts = touchState.current;

		const getTwoFingerCenter = (e: TouchEvent) => ({
			x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
			y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
		});

		const getPinchDist = (e: TouchEvent) => {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			return Math.sqrt(dx * dx + dy * dy);
		};

		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				ts.twoFingerCenter = getTwoFingerCenter(e);
				ts.lastPinchDist = getPinchDist(e);
				ts.isPanning = true;
				velocity.current = { x: 0, z: 0 };
			} else {
				ts.isPanning = false;
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			if (e.touches.length === 2 && ts.isPanning) {
				e.preventDefault();

				// Pan from two-finger drag
				const center = getTwoFingerCenter(e);
				if (ts.twoFingerCenter) {
					const dx = center.x - ts.twoFingerCenter.x;
					const dy = center.y - ts.twoFingerCenter.y;
					const scale = zoom.current * 0.003;
					velocity.current.x = -dx * scale;
					velocity.current.z = -dy * scale;
					target.current.x += velocity.current.x;
					target.current.z += velocity.current.z;
					ts.lastMoveTime = performance.now();
				}
				ts.twoFingerCenter = center;

				// Pinch zoom
				const dist = getPinchDist(e);
				if (ts.lastPinchDist !== null) {
					const delta = ts.lastPinchDist - dist;
					zoom.current = Math.max(
						MIN_ZOOM,
						Math.min(MAX_ZOOM, zoom.current + delta * 0.1),
					);
				}
				ts.lastPinchDist = dist;
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			// Double-tap detection for zoom snap (only on single-finger release)
			if (e.changedTouches.length === 1 && !ts.isPanning) {
				const now = performance.now();
				const touch = e.changedTouches[0];
				const dx = touch.clientX - lastTapPos.current.x;
				const dy = touch.clientY - lastTapPos.current.y;
				const timeDelta = now - lastTapTime.current;

				if (timeDelta < 300 && dx * dx + dy * dy < 900) {
					// Double-tap detected — snap to next zoom tier
					const nextTier = getNextCycleTier();
					snapTarget.current = getTargetHeightForTier(nextTier);
				}

				lastTapTime.current = now;
				lastTapPos.current = { x: touch.clientX, y: touch.clientY };
			}

			ts.twoFingerCenter = null;
			ts.lastPinchDist = null;
			ts.isPanning = false;
		};

		canvas.addEventListener("touchstart", onTouchStart, { passive: false });
		canvas.addEventListener("touchmove", onTouchMove, { passive: false });
		canvas.addEventListener("touchend", onTouchEnd);
		return () => {
			canvas.removeEventListener("touchstart", onTouchStart);
			canvas.removeEventListener("touchmove", onTouchMove);
			canvas.removeEventListener("touchend", onTouchEnd);
		};
	}, [gl]);

	useFrame((_, delta) => {
		const k = keys.current;
		const panAmount = PAN_SPEED * zoom.current * delta;

		// Manual input cancels any active camera focus
		const hasManualInput =
			k.has("w") ||
			k.has("s") ||
			k.has("a") ||
			k.has("d") ||
			k.has("arrowup") ||
			k.has("arrowdown") ||
			k.has("arrowleft") ||
			k.has("arrowright") ||
			mouseDrag.current !== null ||
			touchState.current.isPanning;

		if (hasManualInput) {
			cancelCameraFocus();
		}

		// Camera focus system (smooth pan-to-unit, AI action camera)
		const focusResult = updateCameraFocus(
			target.current.x,
			target.current.z,
			zoom.current,
			delta,
		);

		if (focusResult) {
			target.current.x = focusResult.x;
			target.current.z = focusResult.z;
			zoom.current = focusResult.zoom;
		} else {
			// Keyboard pan (only when no focus active)
			if (k.has("w") || k.has("arrowup")) target.current.z -= panAmount;
			if (k.has("s") || k.has("arrowdown")) target.current.z += panAmount;
			if (k.has("a") || k.has("arrowleft")) target.current.x -= panAmount;
			if (k.has("d") || k.has("arrowright")) target.current.x += panAmount;

			// Touch momentum
			velocity.current.x *= MOMENTUM_DECAY;
			velocity.current.z *= MOMENTUM_DECAY;
			if (
				Math.abs(velocity.current.x) > 0.001 ||
				Math.abs(velocity.current.z) > 0.001
			) {
				if (!touchState.current.isPanning) {
					target.current.x += velocity.current.x;
					target.current.z += velocity.current.z;
				}
			}
		}

		// Snap-to zoom tier animation
		if (snapTarget.current !== null) {
			const diff = snapTarget.current - zoom.current;
			if (Math.abs(diff) < 0.5) {
				zoom.current = snapTarget.current;
				snapTarget.current = null;
			} else {
				// Smooth exponential lerp toward target (300ms feel)
				zoom.current += diff * Math.min(1, delta * 6);
			}
			zoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.current));
		}

		// Update zoom tier system with current camera height
		updateZoomTier(zoom.current, delta);

		// Update camera position (always top-down)
		camera.position.set(
			target.current.x,
			zoom.current,
			target.current.z + zoom.current * 0.6,
		);
		camera.lookAt(target.current);

		// Sync to camera store for scene snapshot (Filament path)
		const persp = camera as import("three").PerspectiveCamera;
		setCameraState({
			position: [camera.position.x, camera.position.y, camera.position.z],
			target: [target.current.x, 0, target.current.z],
			fov: persp.fov,
			near: persp.near,
			far: persp.far,
		});
	});

	return null;
}
