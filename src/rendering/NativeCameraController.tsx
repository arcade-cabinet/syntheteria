/**
 * Legacy: touch pan + pinch zoom for native. Was used with Filament; app is now R3F-only.
 * Kept for Expo/RN legacy path; primary build is Vite (main.tsx → AppVite).
 */

import { useCallback, useRef } from "react";
import {
	type GestureResponderEvent,
	type NativeTouchEvent,
	Platform,
} from "react-native";
import { getCameraState, setCameraState } from "./cameraStateStore";

const MIN_ZOOM = 8;
const MAX_ZOOM = 120;
const PAN_SCALE = 0.003;
const DOUBLE_TAP_MS = 400;

const DEFAULT_CAMERA = {
	position: [0, 20, 20] as [number, number, number],
	target: [0, 0, 0] as [number, number, number],
	fov: 45,
	near: 0.1,
	far: 2000,
};

function distance(a: NativeTouchEvent, b: NativeTouchEvent): number {
	const dx = b.pageX - a.pageX;
	const dy = b.pageY - a.pageY;
	return Math.hypot(dx, dy);
}

function center(
	a: NativeTouchEvent,
	b: NativeTouchEvent,
): { x: number; y: number } {
	return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

export function useNativeCameraPanHandlers() {
	const gestureRef = useRef<{
		targetX: number;
		targetZ: number;
		zoom: number;
		startX: number;
		startY: number;
		startDistance?: number;
		startCenterX?: number;
		startCenterY?: number;
	} | null>(null);
	const hasMovedRef = useRef(false);
	const lastTapTimeRef = useRef(0);

	const onTouchStart = useCallback((e: GestureResponderEvent) => {
		hasMovedRef.current = false;
		if (Platform.OS === "web") return;
		const touches = e.nativeEvent.touches;
		if (touches.length === 0) return;
		const cam = getCameraState();
		const target = cam.target ?? [0, 0, 0];
		const zoom = cam.position[1];
		if (touches.length >= 2) {
			const d = distance(touches[0], touches[1]);
			const c = center(touches[0], touches[1]);
			gestureRef.current = {
				targetX: target[0],
				targetZ: target[2],
				zoom,
				startX: touches[0].pageX,
				startY: touches[0].pageY,
				startDistance: d,
				startCenterX: c.x,
				startCenterY: c.y,
			};
		} else {
			gestureRef.current = {
				targetX: target[0],
				targetZ: target[2],
				zoom,
				startX: touches[0].pageX,
				startY: touches[0].pageY,
			};
		}
	}, []);

	const onTouchMove = useCallback((e: GestureResponderEvent) => {
		hasMovedRef.current = true;
		const g = gestureRef.current;
		if (!g) return;
		const touches = e.nativeEvent.touches;
		if (
			touches.length >= 2 &&
			g.startDistance != null &&
			g.startCenterX != null &&
			g.startCenterY != null
		) {
			const d = distance(touches[0], touches[1]);
			const c = center(touches[0], touches[1]);
			const scale = d / g.startDistance;
			const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.zoom * scale));
			const panScale = newZoom * PAN_SCALE;
			const targetX = g.targetX - (c.x - g.startCenterX) * panScale;
			const targetZ = g.targetZ - (c.y - g.startCenterY) * panScale;
			setCameraState({
				position: [targetX, newZoom, targetZ + newZoom * 0.6],
				target: [targetX, 0, targetZ],
				fov: 45,
				near: 0.1,
				far: 2000,
			});
		} else if (touches.length === 1) {
			const panScale = g.zoom * PAN_SCALE;
			const targetX = g.targetX - (touches[0].pageX - g.startX) * panScale;
			const targetZ = g.targetZ - (touches[0].pageY - g.startY) * panScale;
			setCameraState({
				position: [targetX, g.zoom, targetZ + g.zoom * 0.6],
				target: [targetX, 0, targetZ],
				fov: 45,
				near: 0.1,
				far: 2000,
			});
		}
	}, []);

	const onTouchEnd = useCallback((e: GestureResponderEvent) => {
		if (e.nativeEvent.touches.length < 2) {
			if (
				!hasMovedRef.current &&
				Date.now() - lastTapTimeRef.current < DOUBLE_TAP_MS
			) {
				setCameraState({ ...DEFAULT_CAMERA });
				lastTapTimeRef.current = 0;
			} else {
				lastTapTimeRef.current = Date.now();
			}
			gestureRef.current = null;
		}
	}, []);

	return { onTouchStart, onTouchMove, onTouchEnd };
}
