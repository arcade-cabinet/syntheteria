/**
 * LandingScreen — title menu with New Game modal.
 *
 * Replaces the old TitleScreen. Keeps the same visual identity
 * (glitch title, scanlines, Courier New) but adds a New Game modal
 * for seed and difficulty selection.
 */

import { useEffect, useState } from "react";
import { initAudio } from "../../audio";
import { GlobeBackground } from "./GlobeBackground";
import { type NewGameConfig, NewGameModal } from "./NewGameModal";

export type { NewGameConfig };

type Modal = "none" | "new";

export function LandingScreen({
	onStartGame,
}: {
	onStartGame: (config: NewGameConfig) => void;
}) {
	const [titleOpacity, setTitleOpacity] = useState(0);
	const [menuOpacity, setMenuOpacity] = useState(0);
	const [glitch, setGlitch] = useState(false);
	const [modal, setModal] = useState<Modal>("none");

	useEffect(() => {
		const t1 = setTimeout(() => setTitleOpacity(1), 200);
		const t2 = setTimeout(() => setMenuOpacity(1), 1200);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, []);

	// Periodic glitch effect
	useEffect(() => {
		const interval = setInterval(
			() => {
				setGlitch(true);
				setTimeout(() => setGlitch(false), 100 + Math.random() * 150);
			},
			3000 + Math.random() * 4000,
		);
		return () => clearInterval(interval);
	}, []);

	return (
		<>
			<GlobeBackground />
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "transparent",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 200,
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

				{/* Title */}
				<div
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.5s ease-in-out",
						fontFamily: "'Courier New', monospace",
						fontSize: "clamp(32px, 8vw, 72px)",
						fontWeight: "bold",
						letterSpacing: "0.3em",
						color: "#00ffaa",
						textShadow: glitch
							? "3px 0 #ff0044, -3px 0 #0044ff, 0 0 40px rgba(0,255,170,0.6)"
							: "0 0 40px rgba(0,255,170,0.4), 0 0 80px rgba(0,255,170,0.15), 0 0 2px #00ffaa",
						transform: glitch
							? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px)`
							: "none",
						userSelect: "none",
						textAlign: "center",
						padding: "0 16px",
					}}
				>
					SYNTHETERIA
				</div>

				{/* Subtitle */}
				<div
					style={{
						opacity: titleOpacity * 0.6,
						transition: "opacity 2s ease-in-out",
						fontFamily: "'Courier New', monospace",
						fontSize: "clamp(11px, 2vw, 16px)",
						color: "#00ffaa",
						letterSpacing: "0.5em",
						marginTop: "12px",
						textShadow: "0 0 20px rgba(0,255,170,0.3)",
						textAlign: "center",
					}}
				>
					{"AWAKEN // CONNECT // REBUILD"}
				</div>

				{/* Menu */}
				<div
					style={{
						marginTop: "clamp(40px, 8vh, 80px)",
						opacity: menuOpacity,
						transition: "opacity 1s ease-in-out",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "16px",
					}}
				>
					<MenuButton
						label="NEW GAME"
						onClick={() => {
							initAudio();
							setModal("new");
						}}
						primary
					/>
					<MenuButton label="CONTINUE" onClick={() => {}} disabled />
					<MenuButton label="SETTINGS" onClick={() => {}} disabled />
				</div>

				{/* Version */}
				<div
					style={{
						position: "absolute",
						bottom: "20px",
						fontFamily: "'Courier New', monospace",
						fontSize: "11px",
						color: "rgba(0,255,170,0.3)",
						letterSpacing: "0.15em",
					}}
				>
					v0.1.0
				</div>

				{/* New Game Modal */}
				{modal === "new" && (
					<NewGameModal
						onStart={(config) => {
							setModal("none");
							onStartGame(config);
						}}
						onCancel={() => setModal("none")}
					/>
				)}
			</div>
		</>
	);
}

function MenuButton({
	label,
	onClick,
	primary,
	disabled,
}: {
	label: string;
	onClick: () => void;
	primary?: boolean;
	disabled?: boolean;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			type="button"
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: disabled
					? "transparent"
					: hovered
						? "rgba(0,255,170,0.15)"
						: "transparent",
				color: disabled ? "rgba(0,255,170,0.25)" : "#00ffaa",
				border: disabled
					? "1px solid rgba(0,255,170,0.15)"
					: primary && hovered
						? "1px solid #00ffaa"
						: "1px solid rgba(0,255,170,0.4)",
				borderRadius: "4px",
				padding: "12px 48px",
				fontSize: "16px",
				fontFamily: "'Courier New', monospace",
				letterSpacing: "0.2em",
				cursor: disabled ? "default" : "pointer",
				minWidth: "240px",
				transition: "all 0.2s ease",
				textShadow: disabled
					? "none"
					: hovered
						? "0 0 10px rgba(0,255,170,0.5)"
						: "none",
				boxShadow:
					primary && hovered
						? "0 0 20px rgba(0,255,170,0.2), inset 0 0 20px rgba(0,255,170,0.05)"
						: "none",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
