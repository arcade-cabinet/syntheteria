/**
 * SpectatorHUD — overlay shown during AI-vs-AI spectator mode.
 *
 * Shows:
 *   - "SPECTATOR MODE" banner at top center
 *   - Speed preset buttons: 0.5×, 1×, 2×, 4×
 *   - Camera hint (WASD pan, scroll zoom)
 *   - "EXIT SPECTATOR" button
 *
 * Keyboard shortcuts:
 *   - 1/2/3/4 → speed presets (0.5×, 1×, 2×, 4×)
 *   - Escape → exit spectator (handled by SpectatorHUD, not SaveLoadMenu)
 *
 * Accessibility: role="toolbar", aria-label on all buttons.
 */

import { memo, useCallback, useEffect, useSyncExternalStore } from "react";
import {
	getSpectatorSnapshot,
	setSpectatorMode,
	setSpectatorSpeed,
	SPEED_PRESETS,
	subscribeSpectator,
} from "../systems/spectatorSystem";
import { FONT_MONO, hud } from "./designTokens";

export const SpectatorHUD = memo(function SpectatorHUD() {
	const snap = useSyncExternalStore(subscribeSpectator, getSpectatorSnapshot);

	// Keyboard shortcuts: 1-4 for speed presets
	useEffect(() => {
		if (!snap.active) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "1") setSpectatorSpeed(0.5);
			else if (e.key === "2") setSpectatorSpeed(1.0);
			else if (e.key === "3") setSpectatorSpeed(2.0);
			else if (e.key === "4") setSpectatorSpeed(4.0);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [snap.active]);

	const onExit = useCallback(() => setSpectatorMode(false), []);

	if (!snap.active) return null;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				fontFamily: FONT_MONO,
				zIndex: 30,
			}}
		>
			{/* Top banner */}
			<div
				role="status"
				aria-live="polite"
				aria-label="Spectator mode active"
				style={{
					position: "absolute",
					top: "calc(12px + env(safe-area-inset-top, 0px))",
					left: "50%",
					transform: "translateX(-50%)",
					background: "rgba(0, 8, 4, 0.85)",
					border: `1px solid ${hud.accentDim}`,
					borderRadius: "4px",
					padding: "6px 20px",
					display: "flex",
					alignItems: "center",
					gap: "16px",
					pointerEvents: "none",
				}}
			>
				<span
					style={{
						fontSize: "10px",
						color: hud.accentDim,
						letterSpacing: "0.3em",
					}}
				>
					// SPECTATOR MODE
				</span>
				<span
					style={{
						fontSize: "10px",
						color: `${hud.accent}cc`,
						letterSpacing: "0.15em",
					}}
				>
					{snap.speed}×
				</span>
			</div>

			{/* Speed controls — bottom center */}
			<div
				role="toolbar"
				aria-label="Simulation speed controls"
				style={{
					position: "absolute",
					bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
					left: "50%",
					transform: "translateX(-50%)",
					display: "flex",
					alignItems: "center",
					gap: "6px",
					pointerEvents: "auto",
				}}
			>
				{/* Speed label */}
				<span
					style={{
						fontSize: "9px",
						color: hud.accentDim,
						letterSpacing: "0.2em",
						marginRight: "4px",
					}}
				>
					SPEED
				</span>

				{/* Preset buttons */}
				{SPEED_PRESETS.map((preset, i) => {
					const isActive = Math.abs(snap.speed - preset.value) < 0.01;
					return (
						<button
							key={preset.value}
							onClick={() => setSpectatorSpeed(preset.value)}
							aria-label={`Set simulation speed to ${preset.label}`}
							aria-pressed={isActive}
							style={{
								fontFamily: FONT_MONO,
								fontSize: "11px",
								letterSpacing: "0.08em",
								padding: "6px 12px",
								minWidth: "48px",
								minHeight: "36px",
								background: isActive ? `${hud.accent}22` : "rgba(0, 8, 4, 0.85)",
								color: isActive ? hud.accent : hud.accentDim,
								border: `1px solid ${isActive ? hud.accent : hud.accentDim}`,
								borderRadius: "3px",
								cursor: "pointer",
								transition: "all 0.15s ease",
							}}
						>
							{preset.label}
							{/* Keyboard hint */}
							<span
								aria-hidden="true"
								style={{
									display: "block",
									fontSize: "7px",
									color: `${hud.accentDim}88`,
									letterSpacing: "0.1em",
									marginTop: "1px",
								}}
							>
								[{i + 1}]
							</span>
						</button>
					);
				})}

				{/* Divider */}
				<div
					style={{
						width: "1px",
						height: "32px",
						background: hud.accentDim,
						margin: "0 6px",
					}}
				/>

				{/* Exit button */}
				<button
					onClick={onExit}
					aria-label="Exit spectator mode and return to normal play"
					style={{
						fontFamily: FONT_MONO,
						fontSize: "10px",
						letterSpacing: "0.12em",
						padding: "6px 14px",
						minHeight: "36px",
						background: "rgba(0, 8, 4, 0.85)",
						color: `${hud.warning}cc`,
						border: `1px solid ${hud.warning}66`,
						borderRadius: "3px",
						cursor: "pointer",
						transition: "all 0.15s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = `${hud.warning}18`;
						e.currentTarget.style.borderColor = hud.warning;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "rgba(0, 8, 4, 0.85)";
						e.currentTarget.style.borderColor = `${hud.warning}66`;
					}}
				>
					EXIT SPECTATOR
				</button>
			</div>

			{/* Camera hint — bottom right */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
					right: "calc(16px + env(safe-area-inset-right, 0px))",
					fontFamily: FONT_MONO,
					fontSize: "9px",
					color: hud.accentDim,
					letterSpacing: "0.1em",
					lineHeight: 1.6,
					textAlign: "right",
					pointerEvents: "none",
				}}
			>
				<div>WASD — pan camera</div>
				<div>SCROLL — zoom</div>
				<div>MMB drag — pan</div>
			</div>
		</div>
	);
});
