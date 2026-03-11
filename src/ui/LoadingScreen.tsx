/**
 * LoadingScreen — shown during world initialization.
 *
 * Supports two modes:
 *  1. Passive (no props): simple animated pulse bar — for React.lazy Suspense fallback.
 *  2. Active (with progress): labeled progress steps, industrial aesthetic,
 *     otter hologram appears at 80%+.
 *
 * Matches the industrial amber/chrome aesthetic of TitleScreen.
 */

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";
const COLOR_ACCENT = "#e8a020";
const COLOR_CHROME = "#b8c4cc";
const COLOR_ACCENT_MUTED = "rgba(232,160,32,0.22)";

// ---------------------------------------------------------------------------
// Initialization steps (14 phases per GDD-010)
// ---------------------------------------------------------------------------

export const INIT_STEPS = [
	"Seeding world state",
	"Generating terrain heightmap",
	"Applying biome distribution",
	"Placing ore deposits",
	"Spawning rival colonies",
	"Building fog of war grid",
	"Initializing power network",
	"Loading patron AI modules",
	"Constructing navigation mesh",
	"Spawning colony units",
	"Calibrating weather systems",
	"Activating signal network",
	"Establishing patron uplink",
	"Briefing otter hologram",
] as const;

export type InitStep = (typeof INIT_STEPS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingScreenProps {
	/** 0–100 progress percentage. If undefined, show passive pulse animation. */
	progress?: number;
	/** Current step label shown below the bar. */
	currentStep?: string;
}

// ---------------------------------------------------------------------------
// Passive mode (used as Suspense fallback)
// ---------------------------------------------------------------------------

function PassiveLoadingScreen() {
	const [dots, setDots] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
		}, 400);
		return () => clearInterval(interval);
	}, []);

	return (
		<div
			aria-label="Loading"
			style={{
				position: "absolute",
				inset: 0,
				background: "#05070a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: MONO,
				color: COLOR_ACCENT,
				zIndex: 300,
			}}
		>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle, rgba(232,160,32,0.04) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					pointerEvents: "none",
				}}
			/>

			<div
				style={{
					fontSize: "clamp(13px, 3vw, 17px)",
					letterSpacing: "0.3em",
					textShadow: `0 0 16px rgba(232,160,32,0.4)`,
				}}
			>
				INITIALIZING{dots}
			</div>

			{/* Pulse bar */}
			<div
				style={{
					marginTop: "24px",
					width: "min(200px, 60vw)",
					height: "3px",
					background: COLOR_ACCENT_MUTED,
					borderRadius: "2px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						background: COLOR_ACCENT,
						animation: "loading-pulse 1.5s ease-in-out infinite",
						transformOrigin: "left",
					}}
				/>
			</div>

			<style>{`
				@keyframes loading-pulse {
					0% { transform: scaleX(0); opacity: 0.3; }
					50% { transform: scaleX(0.7); opacity: 1; }
					100% { transform: scaleX(0); opacity: 0.3; }
				}
			`}</style>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Active mode (with progress tracking)
// ---------------------------------------------------------------------------

function ActiveLoadingScreen({ progress, currentStep }: Required<LoadingScreenProps>) {
	const pct = Math.max(0, Math.min(100, progress));
	const showOtter = pct >= 80;
	const [otterOpacity, setOtterOpacity] = useState(0);
	const prevPct = useRef(0);

	// Fade in otter when we cross 80%
	useEffect(() => {
		if (prevPct.current < 80 && pct >= 80) {
			const t = setTimeout(() => setOtterOpacity(1), 100);
			return () => clearTimeout(t);
		}
		prevPct.current = pct;
	}, [pct]);

	// Completed steps
	const completedCount = Math.floor((pct / 100) * INIT_STEPS.length);

	return (
		<div
			aria-label="Initializing colony mission"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
			style={{
				position: "absolute",
				inset: 0,
				background: "#05070a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: MONO,
				color: COLOR_ACCENT,
				zIndex: 300,
				overflow: "hidden",
			}}
		>
			{/* Dot grid background */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle, rgba(232,160,32,0.04) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					pointerEvents: "none",
				}}
			/>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Top edge rule */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Content */}
			<div
				style={{
					position: "relative",
					zIndex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					width: "min(520px, 88vw)",
				}}
			>
				{/* Classification banner */}
				<div
					style={{
						fontSize: "9px",
						color: COLOR_ACCENT_MUTED,
						letterSpacing: "0.5em",
						marginBottom: "20px",
					}}
				>
					// COLONY INITIALIZATION SEQUENCE //
				</div>

				{/* Title */}
				<div
					style={{
						fontSize: "clamp(18px, 4vw, 26px)",
						fontWeight: "bold",
						letterSpacing: "0.25em",
						color: COLOR_ACCENT,
						textShadow: `0 0 20px rgba(232,160,32,0.35)`,
						marginBottom: "8px",
					}}
				>
					SYNTHETERIA
				</div>

				<div
					style={{
						fontSize: "10px",
						color: `rgba(184,196,204,0.45)`,
						letterSpacing: "0.35em",
						marginBottom: "32px",
					}}
				>
					MACHINE PLANET — COLONY DEPLOYMENT
				</div>

				{/* Otter hologram placeholder */}
				{showOtter && (
					<div
						style={{
							opacity: otterOpacity,
							transition: "opacity 1s ease-in",
							marginBottom: "24px",
							textAlign: "center",
						}}
					>
						<div
							style={{
								fontFamily: MONO,
								fontSize: "12px",
								color: `rgba(100,200,255,0.7)`,
								letterSpacing: "0.08em",
								lineHeight: "1.6",
								textShadow: "0 0 8px rgba(100,200,255,0.4)",
							}}
						>
							<div style={{ fontSize: "20px", marginBottom: "4px" }}>~ O ~</div>
							<div>Patron uplink established.</div>
							<div style={{ fontSize: "10px", opacity: 0.6 }}>
								Otter hologram standing by.
							</div>
						</div>
					</div>
				)}

				{/* Progress bar */}
				<div style={{ width: "100%", marginBottom: "12px" }}>
					<div
						style={{
							width: "100%",
							height: "6px",
							background: COLOR_ACCENT_MUTED,
							borderRadius: "3px",
							overflow: "hidden",
							border: `1px solid rgba(232,160,32,0.1)`,
						}}
					>
						<div
							style={{
								width: `${pct}%`,
								height: "100%",
								background: `linear-gradient(90deg, ${COLOR_ACCENT}88, ${COLOR_ACCENT})`,
								borderRadius: "3px",
								transition: "width 0.3s ease-out",
								boxShadow: `0 0 8px ${COLOR_ACCENT}40`,
							}}
						/>
					</div>

					{/* Progress % */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: "6px",
							fontSize: "10px",
							color: COLOR_ACCENT_MUTED,
							letterSpacing: "0.1em",
						}}
					>
						<span>{currentStep}</span>
						<span>{pct.toFixed(0)}%</span>
					</div>
				</div>

				{/* Step list */}
				<div
					style={{
						width: "100%",
						display: "flex",
						flexDirection: "column",
						gap: "3px",
						maxHeight: "200px",
						overflowY: "auto",
					}}
				>
					{INIT_STEPS.map((step, i) => {
						const isDone = i < completedCount;
						const isActive = i === completedCount && pct < 100;
						return (
							<div
								key={step}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "10px",
									color: isDone
										? `rgba(68,204,136,0.7)`
										: isActive
											? COLOR_ACCENT
											: `rgba(184,196,204,0.2)`,
									letterSpacing: "0.05em",
									transition: "color 0.3s",
								}}
							>
								<span style={{ flexShrink: 0, width: "12px" }}>
									{isDone ? "✓" : isActive ? "▶" : "·"}
								</span>
								<span>{step}</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function LoadingScreen({ progress, currentStep }: LoadingScreenProps = {}) {
	if (progress !== undefined && currentStep !== undefined) {
		return (
			<ActiveLoadingScreen progress={progress} currentStep={currentStep} />
		);
	}
	return <PassiveLoadingScreen />;
}
