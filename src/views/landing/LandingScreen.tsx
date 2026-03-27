/**
 * LandingScreen — title menu with New Game modal.
 *
 * Replaces the old TitleScreen. Keeps the same visual identity
 * (glitch title, scanlines, Courier New) but adds a New Game modal
 * for seed and difficulty selection.
 */

import { useEffect, useState } from "react";
import { initAudio } from "../../audio";
import { GlobeBackground } from "../../render/landing/GlobeBackground";
import { type NewGameConfig, NewGameModal } from "./NewGameModal";

// ─── Curved Bezel Arc (ported from cursor branch brand identity) ─────────────

function BezelArc() {
	const viewBoxW = 1200;
	const viewBoxH = 200;

	return (
		<svg
			width="100%"
			height="100%"
			viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="none"
			role="img"
			aria-label="Menu bezel arc"
			style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
		>
			<title>Menu bezel arc</title>
			<defs>
				<linearGradient id="bezelFill" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="rgba(6, 17, 26, 0.75)" />
					<stop offset="100%" stopColor="rgba(3, 7, 13, 0.92)" />
				</linearGradient>
			</defs>
			{/* Filled bezel body */}
			<path
				d={`M 0,${viewBoxH} L 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120 L ${viewBoxW},${viewBoxH} Z`}
				fill="url(#bezelFill)"
			/>
			{/* Outer glow border — brand cyan #8be6ff */}
			<path
				d={`M 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.35)"
				strokeWidth="2"
			/>
			{/* Inner accent line */}
			<path
				d={`M 50,125 Q ${viewBoxW / 2},30 ${viewBoxW - 50},125`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.15)"
				strokeWidth="1"
			/>
		</svg>
	);
}

export type { NewGameConfig };

type Modal = "none" | "new";

export function LandingScreen({
	onStartGame,
}: {
	onStartGame: (config: NewGameConfig) => void;
}) {
	const [menuOpacity, setMenuOpacity] = useState(0);
	const [modal, setModal] = useState<Modal>("none");

	useEffect(() => {
		const t2 = setTimeout(() => setMenuOpacity(1), 1200);
		return () => {
			clearTimeout(t2);
		};
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
							"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,230,255,0.03) 2px, rgba(139,230,255,0.03) 4px)",
						pointerEvents: "none",
					}}
				/>

				{/* Bottom bezel zone — curved SVG arc with menu buttons */}
				<div
					style={{
						position: "absolute",
						bottom: 0,
						left: 0,
						right: 0,
						height: "clamp(140px, 25vh, 200px)",
						pointerEvents: "none",
					}}
				>
					<BezelArc />
					<div
						style={{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							display: "flex",
							flexDirection: "row",
							alignItems: "flex-end",
							justifyContent: "center",
							gap: "clamp(16px, 3vw, 40px)",
							paddingBottom: "clamp(16px, 3vh, 32px)",
							opacity: menuOpacity,
							transition: "opacity 1s ease-in-out",
							pointerEvents: "auto",
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
						<MenuButton label="CONTINUE" onClick={() => {}} disabled title="No saved game found" />
						<MenuButton label="SETTINGS" onClick={() => {}} disabled title="Coming soon" />
					</div>
				</div>

				{/* Version — above bezel */}
				<div
					style={{
						position: "absolute",
						bottom: "clamp(140px, 25vh, 200px)",
						fontFamily: "'Courier New', monospace",
						fontSize: "11px",
						color: "rgba(139,230,255,0.3)",
						letterSpacing: "0.15em",
						marginBottom: "8px",
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
	title,
}: {
	label: string;
	onClick: () => void;
	primary?: boolean;
	disabled?: boolean;
	title?: string;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			type="button"
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			title={title}
			style={{
				background: disabled
					? "transparent"
					: hovered
						? "rgba(139,230,255,0.15)"
						: "transparent",
				color: disabled ? "rgba(139,230,255,0.25)" : "#8be6ff",
				border: disabled
					? "1px solid rgba(139,230,255,0.15)"
					: primary && hovered
						? "1px solid #8be6ff"
						: "1px solid rgba(139,230,255,0.4)",
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
						? "0 0 10px rgba(139,230,255,0.5)"
						: "none",
				boxShadow:
					primary && hovered
						? "0 0 20px rgba(139,230,255,0.2), inset 0 0 20px rgba(139,230,255,0.05)"
						: "none",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
