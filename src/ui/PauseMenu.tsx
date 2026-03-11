/**
 * PauseMenu — modal overlay shown when the colony simulation is paused.
 *
 * Toggles via ESC key or the PAUSE button in SpeedControls.
 * Industrial amber/chrome aesthetic matching TitleScreen and PregameScreen.
 *
 * Actions: Resume, Settings (disabled), Save (disabled), Load (disabled),
 *          Quit to Title.
 */

import { useCallback, useEffect, useState } from "react";
import { togglePause } from "../ecs/gameState";
import { getHUDAccent } from "./FPSHUD";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";
const COLOR_ACCENT = "#e8a020";
const COLOR_CHROME = "#b8c4cc";
const COLOR_ACCENT_MUTED = "rgba(232,160,32,0.22)";
const BG_OVERLAY = "rgba(0, 0, 0, 0.75)";
const BG_PANEL = "rgba(8,10,12,0.97)";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PauseMenuProps {
	/** Called when the player clicks "Quit to Title" */
	onQuitToTitle: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PauseMenu({ onQuitToTitle }: PauseMenuProps) {
	const accent = getHUDAccent();
	const [confirmingQuit, setConfirmingQuit] = useState(false);

	// ESC key resumes the game (clears paused state)
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (confirmingQuit) {
					setConfirmingQuit(false);
				} else {
					togglePause();
				}
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [confirmingQuit]);

	const handleResume = useCallback(() => {
		setConfirmingQuit(false);
		togglePause();
	}, []);

	const handleQuit = useCallback(() => {
		if (!confirmingQuit) {
			setConfirmingQuit(true);
			return;
		}
		// Confirmed — quit to title
		onQuitToTitle();
	}, [confirmingQuit, onQuitToTitle]);

	return (
		/* Overlay backdrop */
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Pause Menu"
			style={{
				position: "absolute",
				inset: 0,
				background: BG_OVERLAY,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 500,
				pointerEvents: "auto",
			}}
			onClick={(e) => {
				// Click backdrop to resume
				if (e.target === e.currentTarget) handleResume();
			}}
		>
			{/* Panel */}
			<div
				style={{
					background: BG_PANEL,
					border: `1px solid ${COLOR_ACCENT_MUTED}`,
					borderRadius: "6px",
					padding: "32px 36px",
					width: "min(320px, 88vw)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0",
					position: "relative",
				}}
			>
				{/* Top edge rule */}
				<div
					aria-hidden="true"
					style={{
						position: "absolute",
						top: 0,
						left: "16px",
						right: "16px",
						height: "2px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT}, transparent)`,
						borderRadius: "1px",
					}}
				/>

				{/* Header */}
				<div
					style={{
						fontFamily: MONO,
						fontSize: "9px",
						color: COLOR_ACCENT_MUTED,
						letterSpacing: "0.4em",
						marginBottom: "12px",
					}}
				>
					// SIMULATION PAUSED //
				</div>

				<h2
					style={{
						fontFamily: MONO,
						fontSize: "22px",
						fontWeight: "bold",
						letterSpacing: "0.2em",
						color: accent,
						textShadow: `0 0 16px ${accent}40`,
						marginBottom: "8px",
						textAlign: "center",
					}}
				>
					COLONY STATUS
				</h2>

				<div
					style={{
						width: "100%",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginBottom: "24px",
					}}
				/>

				{/* Confirm quit message */}
				{confirmingQuit && (
					<div
						role="alert"
						style={{
							fontFamily: MONO,
							fontSize: "11px",
							color: "#cc3322",
							letterSpacing: "0.08em",
							textAlign: "center",
							marginBottom: "16px",
							padding: "8px 12px",
							border: "1px solid rgba(204,51,34,0.3)",
							borderRadius: "4px",
							background: "rgba(204,51,34,0.06)",
						}}
					>
						Unsaved progress will be lost.
						<br />
						Click QUIT again to confirm.
					</div>
				)}

				{/* Buttons */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						width: "100%",
					}}
				>
					<PauseButton
						label="RESUME MISSION"
						primary
						onClick={handleResume}
						aria-label="Resume colony simulation"
					/>
					<PauseButton
						label="SETTINGS"
						disabled
						aria-label="Settings — not yet available"
					/>
					<PauseButton
						label="SAVE COLONY"
						disabled
						aria-label="Save colony — not yet available"
					/>
					<PauseButton
						label="LOAD COLONY"
						disabled
						aria-label="Load colony — not yet available"
					/>
					<div
						style={{
							width: "100%",
							height: "1px",
							background: COLOR_ACCENT_MUTED,
							margin: "4px 0",
						}}
					/>
					<PauseButton
						label={confirmingQuit ? "CONFIRM QUIT" : "QUIT TO TITLE"}
						danger={confirmingQuit}
						onClick={handleQuit}
						aria-label="Quit colony and return to title screen"
					/>
				</div>

				{/* ESC hint */}
				<div
					style={{
						marginTop: "16px",
						fontFamily: MONO,
						fontSize: "9px",
						color: `rgba(184,196,204,0.25)`,
						letterSpacing: "0.15em",
					}}
				>
					[ESC] to resume
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// PauseButton
// ---------------------------------------------------------------------------

function PauseButton({
	label,
	onClick,
	primary,
	danger,
	disabled,
	"aria-label": ariaLabel,
}: {
	label: string;
	onClick?: () => void;
	primary?: boolean;
	danger?: boolean;
	disabled?: boolean;
	"aria-label"?: string;
}) {
	const [hovered, setHovered] = useState(false);
	const accent = getHUDAccent();

	let textColor: string;
	let borderColor: string;
	let bgColor: string;

	if (disabled) {
		textColor = "rgba(184,196,204,0.2)";
		borderColor = "rgba(184,196,204,0.08)";
		bgColor = "transparent";
	} else if (danger) {
		textColor = hovered ? "#ff4444" : "#ff444488";
		borderColor = hovered ? "#ff4444" : "rgba(255,68,68,0.3)";
		bgColor = hovered ? "rgba(255,68,68,0.1)" : "transparent";
	} else if (primary) {
		textColor = accent;
		borderColor = hovered ? accent : COLOR_ACCENT_MUTED;
		bgColor = hovered ? `${accent}14` : "transparent";
	} else {
		textColor = hovered ? COLOR_CHROME : "rgba(184,196,204,0.5)";
		borderColor = hovered
			? "rgba(184,196,204,0.4)"
			: "rgba(184,196,204,0.15)";
		bgColor = hovered ? "rgba(184,196,204,0.05)" : "transparent";
	}

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			aria-label={ariaLabel}
			style={{
				background: bgColor,
				color: textColor,
				border: `1px solid ${borderColor}`,
				borderRadius: "3px",
				padding: "10px 0",
				fontSize: "13px",
				fontFamily: MONO,
				letterSpacing: "0.2em",
				cursor: disabled ? "default" : "pointer",
				width: "100%",
				transition: "all 0.15s ease",
				textShadow:
					!disabled && hovered && primary
						? `0 0 10px ${accent}50`
						: "none",
				minHeight: "44px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
