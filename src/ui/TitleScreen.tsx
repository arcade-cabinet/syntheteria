/**
 * Main title screen — "SYNTHETERIA" with factory planet identity.
 *
 * Industrial mechanical aesthetic: chrome panels, amber-orange accents,
 * rust tones. NOT generic terminal green.
 *
 * Clean entry point: just the brand + menu buttons. Seed configuration
 * happens in the pregame screen where the player sets up their mission.
 */
import { useEffect, useState } from "react";
import { getSaveSlots, loadGame, type SaveSlotInfo } from "../save/SaveManager";
import { FONT_MONO, menu } from "./designTokens";

// Aliases for readability (match shared design tokens)
const MONO = FONT_MONO;
const COLOR_ACCENT = menu.accent;
const COLOR_ACCENT_DIM = menu.accentDim;
const COLOR_ACCENT_MUTED = menu.accentMuted;
const COLOR_CHROME = menu.chrome;
const BG_INSET = menu.bgInset;

export function TitleScreen({
	onNewGame,
	onContinue,
}: {
	onNewGame: () => void;
	onContinue?: () => void;
}) {
	const [titleOpacity, setTitleOpacity] = useState(0);
	const [menuOpacity, setMenuOpacity] = useState(0);
	const [glitch, setGlitch] = useState(false);
	const [latestSave, setLatestSave] = useState<SaveSlotInfo | null>(null);

	// Check for existing saves to enable CONTINUE button
	useEffect(() => {
		getSaveSlots()
			.then((slots) => {
				if (slots.length > 0) {
					const sorted = [...slots].sort(
						(a, b) => b.updatedAt - a.updatedAt,
					);
					setLatestSave(sorted[0]);
				}
			})
			.catch(() => {
				// No saves or error — leave CONTINUE disabled
			});
	}, []);

	useEffect(() => {
		const t1 = setTimeout(() => setTitleOpacity(1), 200);
		const t2 = setTimeout(() => setMenuOpacity(1), 1400);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, []);

	// Periodic glitch effect on title
	useEffect(() => {
		const interval = setInterval(
			() => {
				setGlitch(true);
				setTimeout(() => setGlitch(false), 80 + Math.random() * 120);
			},
			4000 + Math.random() * 5000,
		);
		return () => clearInterval(interval);
	}, []);

	const handleNewGame = () => {
		onNewGame();
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "#05070a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 200,
				overflow: "hidden",
			}}
		>
			{/* Rivet grid background — industrial panel texture */}
			<RivetBackground />

			{/* Top edge panel rule */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Bottom edge panel rule */}
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Corner bolts */}
			<Bolt top={12} left={16} />
			<Bolt top={12} right={16} />
			<Bolt bottom={12} left={16} />
			<Bolt bottom={12} right={16} />

			{/* Main content column */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					position: "relative",
					zIndex: 1,
				}}
			>
				{/* Classification banner */}
				<div
					style={{
						opacity: titleOpacity * 0.6,
						transition: "opacity 1s ease-in",
						fontFamily: MONO,
						fontSize: "clamp(9px, 1.8vw, 11px)",
						color: COLOR_ACCENT_DIM,
						letterSpacing: "0.5em",
						marginBottom: "20px",
						textAlign: "center",
						textTransform: "uppercase",
					}}
				>
					// COLONY MISSION BRIEFING //
				</div>

				{/* Horizontal rule */}
				<div
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.2s ease-in",
						width: "clamp(180px, 55vw, 520px)",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, ${COLOR_CHROME}, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginBottom: "18px",
					}}
				/>

				{/* SYNTHETERIA title */}
				<div
					aria-label="Syntheteria"
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.5s ease-in-out",
						fontFamily: MONO,
						fontSize: "clamp(30px, 8vw, 76px)",
						fontWeight: "bold",
						letterSpacing: "0.28em",
						color: COLOR_ACCENT,
						textShadow: glitch
							? `4px 0 ${COLOR_ERROR}, -4px 0 #0044cc, 0 0 40px rgba(232,160,32,0.5)`
							: `0 0 30px rgba(232,160,32,0.35), 0 0 60px rgba(232,160,32,0.12), 0 2px 0 rgba(0,0,0,0.8)`,
						transform: glitch
							? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px) skewX(${Math.random() * 0.5 - 0.25}deg)`
							: "none",
						userSelect: "none",
						textAlign: "center",
						padding: "0 16px",
					}}
				>
					SYNTHETERIA
				</div>

				{/* Factory planet subtitle */}
				<div
					style={{
						opacity: titleOpacity * 0.7,
						transition: "opacity 2s ease-in-out",
						fontFamily: MONO,
						fontSize: "clamp(10px, 2vw, 14px)",
						color: COLOR_CHROME,
						letterSpacing: "0.4em",
						marginTop: "10px",
						textAlign: "center",
						textShadow: `0 0 12px rgba(184,196,204,0.25)`,
					}}
				>
					MACHINE PLANET — SECTOR 7 COLONY OUTPOST
				</div>

				{/* Horizontal rule */}
				<div
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.5s ease-in",
						width: "clamp(180px, 55vw, 520px)",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, ${COLOR_CHROME}, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginTop: "18px",
						marginBottom: "clamp(24px, 5vh, 48px)",
					}}
				/>

				{/* Menu panel */}
				<div
					style={{
						opacity: menuOpacity,
						transition: "opacity 1s ease-in-out",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "10px",
						width: "min(340px, 88vw)",
						background: BG_INSET,
						border: `1px solid ${COLOR_ACCENT_MUTED}`,
						borderRadius: "6px",
						padding: "20px 20px 16px",
					}}
				>
					{/* Buttons */}
					<MenuButton
						label="NEW GAME"
						onClick={handleNewGame}
						primary
						aria-label="Start new colony mission"
					/>
					<MenuButton
						label="CONTINUE"
						disabled={!latestSave}
						onClick={
							latestSave
								? () => {
										loadGame(latestSave.slotId)
											.then(() => onContinue?.())
											.catch((err) =>
												console.error("[Continue] Load failed:", err),
											);
									}
								: undefined
						}
						aria-label={
							latestSave ? "Continue last colony mission" : "No saved missions"
						}
					/>
					<MenuButton
						label="SETTINGS"
						disabled
						aria-label="Settings — not yet available"
					/>
					<MenuButton
						label="SPECTATE"
						disabled
						aria-label="Spectate mode — not yet available"
					/>
				</div>
			</div>

			{/* Version + build info */}
			<div
				style={{
					position: "absolute",
					bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
					right: "20px",
					fontFamily: MONO,
					fontSize: "10px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.12em",
					textAlign: "right",
				}}
			>
				v0.1.0 — PHASE 1 PROTOTYPE
			</div>

			{/* Status indicator bottom-left */}
			<div
				style={{
					position: "absolute",
					bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
					left: "20px",
					fontFamily: MONO,
					fontSize: "10px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.1em",
					display: "flex",
					alignItems: "center",
					gap: "6px",
				}}
			>
				<div
					style={{
						width: "6px",
						height: "6px",
						borderRadius: "50%",
						background: "#44cc88",
						boxShadow: "0 0 4px #44cc88",
					}}
				/>
				SYSTEMS NOMINAL
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Menu button
// ---------------------------------------------------------------------------

function MenuButton({
	label,
	onClick,
	primary,
	disabled,
	"aria-label": ariaLabel,
}: {
	label: string;
	onClick?: () => void;
	primary?: boolean;
	disabled?: boolean;
	"aria-label"?: string;
}) {
	const [hovered, setHovered] = useState(false);

	const bg = disabled
		? "transparent"
		: hovered
			? primary
				? `rgba(232,160,32,0.14)`
				: `rgba(184,196,204,0.07)`
			: "transparent";

	const borderColor = disabled
		? `rgba(232,160,32,0.1)`
		: hovered
			? primary
				? COLOR_ACCENT
				: `rgba(184,196,204,0.5)`
			: primary
				? COLOR_ACCENT_MUTED
				: `rgba(184,196,204,0.2)`;

	const color = disabled
		? `rgba(232,160,32,0.18)`
		: primary
			? COLOR_ACCENT
			: COLOR_CHROME;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			aria-label={ariaLabel}
			style={{
				background: bg,
				color,
				border: `1px solid ${borderColor}`,
				borderRadius: "3px",
				padding: "10px 0",
				fontSize: "clamp(12px, 3vw, 14px)",
				fontFamily: MONO,
				letterSpacing: "0.22em",
				cursor: disabled ? "default" : "pointer",
				width: "100%",
				transition: "all 0.15s ease",
				textShadow:
					!disabled && hovered && primary
						? `0 0 12px rgba(232,160,32,0.5)`
						: "none",
				boxShadow:
					primary && hovered && !disabled
						? `0 0 16px rgba(232,160,32,0.15), inset 0 0 16px rgba(232,160,32,0.04)`
						: "none",
				minHeight: "44px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Decorative corner bolt
// ---------------------------------------------------------------------------

function Bolt({
	top,
	bottom,
	left,
	right,
}: {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
}) {
	return (
		<div
			aria-hidden="true"
			style={{
				position: "absolute",
				top,
				bottom,
				left,
				right,
				width: "8px",
				height: "8px",
				borderRadius: "50%",
				background: "radial-gradient(circle at 35% 35%, #8a8e92, #3a3c40)",
				boxShadow: "0 0 3px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15)",
			}}
		/>
	);
}

// ---------------------------------------------------------------------------
// Decorative rivet-grid background
// ---------------------------------------------------------------------------

function RivetBackground() {
	return (
		<>
			{/* Dark panel gradient */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(14,18,24,0.8) 0%, rgba(5,7,10,1) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Fine dot grid — simulates panel rivets */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle, rgba(232,160,32,0.06) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					pointerEvents: "none",
				}}
			/>

			{/* Vignette overlay */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Subtle horizontal scan lines */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
					pointerEvents: "none",
				}}
			/>
		</>
	);
}
