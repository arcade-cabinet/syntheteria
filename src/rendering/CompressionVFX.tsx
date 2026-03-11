/**
 * CompressionVFX — screen shake and flash overlay for the compression sequence.
 *
 * Reads the compressionJuice system each frame and applies:
 *   - Camera position shake proportional to shakeIntensity + shakeFrequency
 *   - A full-screen DOM flash overlay (outside Canvas) when flashIntensity > 0
 *   - Vignette darkening during the critical / slam phases
 *
 * The DOM overlay is rendered as a sibling to the R3F Canvas so it works
 * with all post-processing pipelines. The camera shake uses the R3F camera
 * directly (same pattern as CameraShake in CameraEffects.tsx).
 *
 * This component must be mounted both:
 *   - Inside <Canvas> for the useFrame camera shake (CameraShakeFromCompression)
 *   - Outside <Canvas> for the DOM overlay (CompressionFlashOverlay)
 *
 * Usage in GameScene:
 *   <Canvas>
 *     <CameraShakeFromCompression />
 *   </Canvas>
 *   <CompressionFlashOverlay />
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
	getCompressionPhase,
	getCompressionProgress,
	isCompressionActive,
	updateCompression,
	type CompressionFrame,
} from "../systems/compressionJuice";

// ---------------------------------------------------------------------------
// Pure utility — exported for tests
// ---------------------------------------------------------------------------

/**
 * Compute the camera shake displacement for a given frame.
 *
 * Returns (dx, dy, dz) to add to camera.position.
 * Uses two phase-offset sines per axis so the motion isn't perfectly periodic.
 */
export function computeShakeDisplacement(
	intensity: number,
	frequency: number,
	time: number,
): { dx: number; dy: number; dz: number } {
	if (intensity <= 0) return { dx: 0, dy: 0, dz: 0 };
	const amp = intensity * 0.12;
	const f = frequency;
	const dx = (Math.sin(time * f * 6.28) + Math.sin(time * f * 11.7 + 1.3)) * amp * 0.5;
	const dy = (Math.sin(time * f * 5.9 + 2.1) + Math.sin(time * f * 9.3 + 0.7)) * amp * 0.5;
	const dz = Math.sin(time * f * 7.4 + 3.1) * amp * 0.3;
	return { dx, dy, dz };
}

/**
 * Compute the CSS color for the flash overlay.
 * Returns a rgba() string or null when no flash should show.
 */
export function computeFlashColor(
	frame: CompressionFrame,
): string | null {
	if (!frame.active) return null;
	if (frame.flashIntensity <= 0.01) return null;
	const alpha = Math.min(frame.flashIntensity, 0.9);
	// Flash color is supplied by the juice system (e.g. "white" or "orange")
	const base = frame.flashColor || "255,255,200";
	return `rgba(${base},${alpha.toFixed(2)})`;
}

/**
 * Compute the CSS for the vignette overlay during compression.
 * Returns opacity value (0-1) or 0 when inactive.
 */
export function computeVignetteOpacity(frame: CompressionFrame): number {
	if (!frame.active) return 0;
	return Math.min(frame.vignetteIntensity ?? 0, 0.85);
}

// ---------------------------------------------------------------------------
// Camera shake component (mount INSIDE <Canvas>)
// ---------------------------------------------------------------------------

/**
 * Applies compression-driven camera shake via useFrame.
 * Mount this component inside the R3F <Canvas>.
 */
export function CameraShakeFromCompression() {
	const prevShakeRef = useRef({ dx: 0, dy: 0, dz: 0 });

	useFrame((state, delta) => {
		const frame = updateCompression(delta);

		// Remove previous frame's shake displacement before applying new one
		state.camera.position.x -= prevShakeRef.current.dx;
		state.camera.position.y -= prevShakeRef.current.dy;
		state.camera.position.z -= prevShakeRef.current.dz;

		if (!frame.active) {
			prevShakeRef.current = { dx: 0, dy: 0, dz: 0 };
			return;
		}

		const { dx, dy, dz } = computeShakeDisplacement(
			frame.shakeIntensity,
			frame.shakeFrequency,
			state.clock.elapsedTime,
		);

		state.camera.position.x += dx;
		state.camera.position.y += dy;
		state.camera.position.z += dz;

		prevShakeRef.current = { dx, dy, dz };
	});

	return null;
}

// ---------------------------------------------------------------------------
// DOM flash/vignette overlay component (mount OUTSIDE <Canvas>)
// ---------------------------------------------------------------------------

interface OverlayState {
	flash: string | null;
	vignetteOpacity: number;
	phase: string;
}

/**
 * Renders the compression flash and vignette overlays as a DOM div.
 * Mount this component outside the R3F <Canvas>, as a sibling to it.
 */
export function CompressionFlashOverlay() {
	const [overlay, setOverlay] = useState<OverlayState>({
		flash: null,
		vignetteOpacity: 0,
		phase: "idle",
	});

	// Poll the juice state at 60fps via requestAnimationFrame.
	// We read state rather than calling updateCompression here — the inside-Canvas
	// component (CameraShakeFromCompression) already drives the update each frame.
	useEffect(() => {
		let running = true;
		let rafId = 0;
		let lastTime = performance.now();

		const tick = (now: number) => {
			if (!running) return;
			const delta = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;

			const phase = getCompressionPhase();
			const active = isCompressionActive();
			const progress = getCompressionProgress();

			// Synthesize a minimal frame for overlay computation
			const frame: CompressionFrame = {
				active,
				progress,
				phase,
				pressure: progress,
				temperature: progress * 0.8,
				inDangerZone: progress > 0.66,
				shakeIntensity: 0,
				shakeFrequency: 0,
				flashIntensity: phase === "slam" || phase === "eject" ? (1 - progress) * 0.8 : 0,
				flashColor: "255,220,150",
				vignetteIntensity: active ? Math.min(progress * 0.6, 0.5) : 0,
				soundEvents: [],
				pitchModifier: 1,
				particleEvents: [],
				showOverlay: active,
				overlayColor: "#ff6600",
				statusText: active ? "COMPRESSING..." : "",
			};

			setOverlay({
				flash: computeFlashColor(frame),
				vignetteOpacity: computeVignetteOpacity(frame),
				phase,
			});

			// Use delta to suppress unused warning
			void delta;
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => {
			running = false;
			cancelAnimationFrame(rafId);
		};
	}, []);

	if (overlay.phase === "idle" && !overlay.flash && overlay.vignetteOpacity <= 0) {
		return null;
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				zIndex: 95,
			}}
		>
			{/* Radial vignette — darkens edges during compression buildup */}
			{overlay.vignetteOpacity > 0 && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "radial-gradient(ellipse at center, transparent 40%, rgba(255,80,0,0.3) 100%)",
						opacity: overlay.vignetteOpacity,
					}}
				/>
			)}

			{/* Flash burst — spikes on slam and eject */}
			{overlay.flash && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: overlay.flash,
					}}
				/>
			)}
		</div>
	);
}
