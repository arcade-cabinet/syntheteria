/**
 * Game over overlay — shown when victory or loss conditions are met.
 *
 * Victory: "SYNTHETERIA RECLAIMED" with industrial celebration styling.
 * Loss:    "SYSTEMS OFFLINE" with red emergency styling.
 *
 * Both states show a restart button that reloads the page (full reset).
 * Uses the same machine-vision aesthetic as the FPSHUD.
 */

import { useEffect, useState } from "react";
import type { GameOverState } from "../systems/gameOverDetection";

const MONO = "'Courier New', monospace";

interface GameOverScreenProps {
	state: GameOverState;
}

export function GameOverScreen({ state }: GameOverScreenProps) {
	const [visible, setVisible] = useState(false);

	// Fade in on mount
	useEffect(() => {
		const timer = setTimeout(() => setVisible(true), 50);
		return () => clearTimeout(timer);
	}, []);

	const handleRestart = () => {
		// Full page reload to reset all module state
		window.location.reload();
	};

	const isVictory = state.won;

	const accentColor = isVictory ? "#00ffaa" : "#ff4444";
	const bgColor = isVictory
		? "rgba(0, 12, 6, 0.92)"
		: "rgba(20, 0, 0, 0.92)";
	const borderColor = isVictory
		? "rgba(0, 255, 170, 0.3)"
		: "rgba(255, 68, 68, 0.3)";
	const glowColor = isVictory
		? "0 0 40px rgba(0, 255, 170, 0.15)"
		: "0 0 40px rgba(255, 68, 68, 0.15)";

	const title = isVictory ? "SYNTHETERIA RECLAIMED" : "SYSTEMS OFFLINE";
	const subtitle = isVictory
		? "The machine planet answers to you now."
		: "Critical failure. All systems non-responsive.";

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: MONO,
				zIndex: 1000,
				opacity: visible ? 1 : 0,
				transition: "opacity 1.5s ease-in",
				pointerEvents: "auto",
			}}
		>
			{/* Background overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: bgColor,
				}}
			/>

			{/* Scan lines */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
					pointerEvents: "none",
				}}
			/>

			{/* Content */}
			<div
				style={{
					position: "relative",
					textAlign: "center",
					padding: "48px 64px",
					border: `1px solid ${borderColor}`,
					borderRadius: "8px",
					boxShadow: glowColor,
					maxWidth: "600px",
				}}
			>
				{/* Status indicator */}
				<div
					style={{
						fontSize: "11px",
						color: accentColor,
						letterSpacing: "0.3em",
						marginBottom: "16px",
						opacity: 0.6,
					}}
				>
					{isVictory ? "// MISSION COMPLETE" : "// CRITICAL FAILURE"}
				</div>

				{/* Title */}
				<h1
					style={{
						fontSize: "32px",
						fontWeight: "bold",
						color: accentColor,
						letterSpacing: "0.15em",
						margin: "0 0 12px 0",
						textShadow: `0 0 20px ${accentColor}40`,
					}}
				>
					{title}
				</h1>

				{/* Subtitle */}
				<p
					style={{
						fontSize: "14px",
						color: `${accentColor}99`,
						margin: "0 0 8px 0",
						letterSpacing: "0.05em",
					}}
				>
					{subtitle}
				</p>

				{/* Reason */}
				<p
					style={{
						fontSize: "12px",
						color: `${accentColor}66`,
						margin: "0 0 32px 0",
						letterSpacing: "0.03em",
					}}
				>
					{state.reason}
				</p>

				{/* Divider */}
				<div
					style={{
						width: "100%",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
						margin: "0 0 32px 0",
					}}
				/>

				{/* Restart button */}
				<button
					type="button"
					onClick={handleRestart}
					style={{
						fontFamily: MONO,
						fontSize: "14px",
						fontWeight: "bold",
						letterSpacing: "0.2em",
						padding: "12px 32px",
						background: "transparent",
						color: accentColor,
						border: `1px solid ${accentColor}66`,
						borderRadius: "4px",
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = `${accentColor}18`;
						e.currentTarget.style.borderColor = accentColor;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "transparent";
						e.currentTarget.style.borderColor = `${accentColor}66`;
					}}
				>
					RESTART
				</button>

				{/* Terminal cursor blink */}
				<div
					style={{
						marginTop: "24px",
						fontSize: "12px",
						color: `${accentColor}44`,
						letterSpacing: "0.1em",
					}}
				>
					<span
						style={{
							animation: "blink 1s step-end infinite",
						}}
					>
						_
					</span>
				</div>

				{/* Inline keyframe for blink animation */}
				<style>
					{`@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }`}
				</style>
			</div>
		</div>
	);
}
