/**
 * LoadingScreen — shown while the 3D scene chunk loads via React.lazy.
 * Matches the title screen aesthetic so the transition feels seamless.
 */

import { useEffect, useState } from "react";

export function LoadingScreen() {
	const [dots, setDots] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
		}, 400);
		return () => clearInterval(interval);
	}, []);

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "#000",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "'Courier New', monospace",
				color: "#00ffaa",
				zIndex: 300,
			}}
		>
			{/* Scanline overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.03) 2px, rgba(0,255,170,0.03) 4px)",
					pointerEvents: "none",
				}}
			/>

			<div
				style={{
					fontSize: "clamp(14px, 3vw, 18px)",
					letterSpacing: "0.3em",
					textShadow: "0 0 20px rgba(0,255,170,0.4)",
				}}
			>
				INITIALIZING{dots}
			</div>

			{/* Progress bar */}
			<div
				style={{
					marginTop: "24px",
					width: "min(200px, 60vw)",
					height: "2px",
					background: "rgba(0,255,170,0.15)",
					borderRadius: "1px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						background: "#00ffaa",
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
