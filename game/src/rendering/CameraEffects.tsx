/**
 * Camera damage effects based on bot component health.
 *
 * Renders CSS-based overlays for visual corruption when components
 * are damaged or missing, plus useFrame camera shake for leg damage.
 *
 * Effects:
 * - No camera / broken camera: heavy static overlay
 * - Damaged camera: scan line corruption, chromatic aberration via CSS
 * - No power cell: periodic blackouts
 * - Damaged legs: camera bob / shake
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { UnitComponent } from "../ecs/types";
import { getActivePlayerBot } from "../ecs/world";

// ---------------------------------------------------------------------------
// Component health helpers
// ---------------------------------------------------------------------------

function findComponent(
	components: UnitComponent[],
	name: string,
): UnitComponent | undefined {
	return components.find((c) => c.name === name);
}

interface HealthState {
	hasCamera: boolean;
	cameraDamaged: boolean;
	hasPowerCell: boolean;
	powerCellDamaged: boolean;
	hasLegs: boolean;
	legsDamaged: boolean;
}

function getHealthState(): HealthState {
	const bot = getActivePlayerBot();
	if (!bot) {
		return {
			hasCamera: false,
			cameraDamaged: false,
			hasPowerCell: false,
			powerCellDamaged: false,
			hasLegs: false,
			legsDamaged: false,
		};
	}

	const comps = bot.unit.components;
	const camera = findComponent(comps, "camera");
	const powerCell = findComponent(comps, "power_cell");
	const legs = findComponent(comps, "legs");

	return {
		hasCamera: camera !== undefined,
		cameraDamaged: camera !== undefined && !camera.functional,
		hasPowerCell: powerCell !== undefined,
		powerCellDamaged: powerCell !== undefined && !powerCell.functional,
		hasLegs: legs !== undefined,
		legsDamaged: legs !== undefined && !legs.functional,
	};
}

// ---------------------------------------------------------------------------
// CSS keyframes injected once
// ---------------------------------------------------------------------------

const STYLE_ID = "camera-effects-styles";

function ensureStyles() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
		@keyframes ce-static-noise {
			0% { background-position: 0 0; }
			10% { background-position: -5% -10%; }
			20% { background-position: -15% 5%; }
			30% { background-position: 7% -25%; }
			40% { background-position: -20% 25%; }
			50% { background-position: -15% 10%; }
			60% { background-position: 15% 0%; }
			70% { background-position: 0% 15%; }
			80% { background-position: 3% 35%; }
			90% { background-position: -10% 10%; }
			100% { background-position: 0 0; }
		}

		@keyframes ce-scanline-glitch {
			0% { transform: translateX(0); }
			5% { transform: translateX(-2px); }
			10% { transform: translateX(3px); }
			15% { transform: translateX(0); }
			80% { transform: translateX(0); }
			85% { transform: translateX(4px); }
			90% { transform: translateX(-1px); }
			95% { transform: translateX(0); }
			100% { transform: translateX(0); }
		}

		@keyframes ce-blackout {
			0% { opacity: 0; }
			45% { opacity: 0; }
			50% { opacity: 0.95; }
			55% { opacity: 0.95; }
			60% { opacity: 0; }
			100% { opacity: 0; }
		}

		@keyframes ce-flicker {
			0% { opacity: 0.7; }
			20% { opacity: 0.3; }
			40% { opacity: 0.8; }
			60% { opacity: 0.5; }
			80% { opacity: 0.9; }
			100% { opacity: 0.7; }
		}
	`;
	document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Camera shake (useFrame — runs inside R3F Canvas)
// ---------------------------------------------------------------------------

export function CameraShake() {
	const timeRef = useRef(0);

	useFrame((state, delta) => {
		timeRef.current += delta;
		const health = getHealthState();

		if (health.legsDamaged) {
			const t = timeRef.current;
			// Irregular sinusoidal bob
			const bobX = Math.sin(t * 7.3) * 0.04 + Math.sin(t * 13.1) * 0.02;
			const bobY =
				Math.sin(t * 5.7) * 0.06 +
				Math.sin(t * 11.3) * 0.03 +
				Math.sin(t * 2.1) * 0.02;
			const bobZ = Math.sin(t * 9.1) * 0.03;

			state.camera.position.x += bobX;
			state.camera.position.y += bobY;
			state.camera.position.z += bobZ;
		}
	});

	return null;
}

// ---------------------------------------------------------------------------
// CSS overlay effects (renders outside Canvas, in the DOM)
// ---------------------------------------------------------------------------

export function CameraEffects() {
	const [health, setHealth] = useState<HealthState>(getHealthState);
	const frameRef = useRef(0);

	useEffect(() => {
		ensureStyles();
	}, []);

	// Poll health state at ~10fps via requestAnimationFrame
	useEffect(() => {
		let running = true;
		let lastUpdate = 0;

		const tick = (time: number) => {
			if (!running) return;
			if (time - lastUpdate > 100) {
				lastUpdate = time;
				setHealth(getHealthState());
			}
			frameRef.current = requestAnimationFrame(tick);
		};

		frameRef.current = requestAnimationFrame(tick);
		return () => {
			running = false;
			cancelAnimationFrame(frameRef.current);
		};
	}, []);

	const noCamera = !health.hasCamera || health.cameraDamaged;
	const noPower = !health.hasPowerCell || health.powerCellDamaged;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				zIndex: 90,
			}}
		>
			{/* Heavy static — no camera or camera broken */}
			{noCamera && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: health.hasCamera ? 0.5 : 0.8,
						background:
							"repeating-linear-gradient(0deg, " +
							"rgba(255,255,255,0.06) 0px, " +
							"rgba(0,0,0,0.1) 1px, " +
							"rgba(255,255,255,0.04) 2px, " +
							"rgba(0,0,0,0.08) 3px)",
						backgroundSize: "100% 4px",
						animation: "ce-static-noise 0.15s steps(8) infinite",
						mixBlendMode: "overlay",
					}}
				/>
			)}

			{/* Scan line corruption — damaged camera */}
			{health.cameraDamaged && (
				<>
					{/* Thick scan lines */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							background:
								"repeating-linear-gradient(0deg, " +
								"transparent 0px, transparent 3px, " +
								"rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px)",
							animation: "ce-scanline-glitch 0.8s ease-in-out infinite",
						}}
					/>
					{/* Chromatic aberration — red/cyan offset layers */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							boxShadow:
								"inset 3px 0 0 rgba(255,0,0,0.15), " +
								"inset -3px 0 0 rgba(0,255,255,0.15)",
						}}
					/>
					{/* Desaturation overlay */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(128,128,128,0.2)",
							mixBlendMode: "saturation",
						}}
					/>
				</>
			)}

			{/* Periodic blackouts — no power cell */}
			{noPower && (
				<>
					{/* Dim overlay — constant */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(0,0,0,0.7)",
						}}
					/>
					{/* Blackout pulse */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "#000",
							animation: "ce-blackout 3s ease-in-out infinite",
						}}
					/>
				</>
			)}

			{/* Power cell damaged but not missing — occasional flicker */}
			{health.hasPowerCell && health.powerCellDamaged && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "rgba(0,0,0,0.4)",
						animation: "ce-flicker 0.5s steps(4) infinite",
					}}
				/>
			)}
		</div>
	);
}
