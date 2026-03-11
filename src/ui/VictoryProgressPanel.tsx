/**
 * VictoryProgressPanel — collapsible HUD panel showing 4-path victory progress.
 *
 * Positioned at the left edge, toggled with Tab key (keyboard) or a small
 * tab handle click. Collapsed by default to avoid cluttering the HUD.
 *
 * Shows 4 paths (Technical Mastery, Subjugation, Social Networking, Faith),
 * each with a progress bar and the underlying condition scores. The player's
 * leading path is highlighted.
 *
 * Reads from:
 *   - victoryTracking (subscribeVictory / getVictorySnapshot)
 *   - newGameInit (getLastPlayerFaction)
 *
 * Accessibility: role="region", aria-label, aria-expanded, keyboard toggle.
 */

import { memo, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
	getVictorySnapshot,
	subscribeVictory,
} from "../systems/victoryTracking";
import { getLastPlayerFaction } from "../systems/newGameInit";
import {
	buildVictoryProgressDisplay,
} from "./victoryProgressData";
import { fillToCSSPercent } from "./hudGauges";
import { FONT_MONO } from "./designTokens";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const VictoryProgressPanel = memo(function VictoryProgressPanel() {
	const [open, setOpen] = useState(false);

	// Toggle on Tab key
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const snap = useSyncExternalStore(subscribeVictory, getVictorySnapshot);

	const playerFaction = getLastPlayerFaction();

	const rawProgress = playerFaction
		? snap.factionProgress.get(playerFaction)
		: undefined;

	const display = buildVictoryProgressDisplay(
		rawProgress ?? {
			economic: { score: 0, met: false },
			military: { score: 0, met: false },
			scientific: { score: 0, met: false },
			cultural: { score: 0, met: false },
			hacking: { score: 0, met: false },
			survival: { score: 0, met: false },
		},
	);

	const onToggle = useCallback(() => setOpen((prev) => !prev), []);

	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: "50%",
				transform: "translateY(-50%)",
				display: "flex",
				alignItems: "center",
				pointerEvents: "none",
				zIndex: 25,
			}}
		>
			{/* Expanded panel */}
			{open && (
				<div
					role="region"
					aria-label="Victory path progress"
					style={{
						background: "rgba(0, 8, 4, 0.88)",
						border: "1px solid rgba(0,255,170,0.15)",
						borderRight: "none",
						borderRadius: "0 4px 4px 0",
						padding: "12px 14px",
						fontFamily: FONT_MONO,
						pointerEvents: "auto",
						minWidth: "200px",
						maxWidth: "220px",
					}}
				>
					{/* Header */}
					<div
						style={{
							fontSize: "9px",
							color: "rgba(0,255,170,0.5)",
							letterSpacing: "0.25em",
							marginBottom: "10px",
						}}
					>
						VICTORY PATHS
					</div>

					{/* Path rows */}
					{display.paths.map((path) => {
						const isLeading = path.id === display.leadingPathId;
						const accentAlpha = isLeading ? "ff" : "88";
						const accent = `${path.accentColor}${accentAlpha}`;

						return (
							<div key={path.id} style={{ marginBottom: "10px" }}>
								{/* Path name */}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "baseline",
										marginBottom: "3px",
									}}
								>
									<span
										style={{
											fontSize: "9px",
											color: accent,
											letterSpacing: "0.1em",
											fontWeight: isLeading ? "bold" : "normal",
										}}
									>
										{path.met ? "✓ " : ""}{path.displayName.toUpperCase()}
									</span>
									<span
										style={{
											fontSize: "9px",
											color: `${path.accentColor}88`,
											letterSpacing: "0.05em",
										}}
									>
										{Math.round(path.score * 100)}%
									</span>
								</div>

								{/* Progress bar */}
								<div
									role="progressbar"
									aria-valuenow={Math.round(path.score * 100)}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label={`${path.displayName} progress: ${Math.round(path.score * 100)}%`}
									style={{
										width: "100%",
										height: "2px",
										background: `${path.accentColor}22`,
										borderRadius: "1px",
										overflow: "hidden",
									}}
								>
									<div
										style={{
											width: fillToCSSPercent(path.score),
											height: "100%",
											background: path.met
												? path.accentColor
												: `linear-gradient(90deg, ${path.accentColor}88, ${path.accentColor})`,
											borderRadius: "1px",
											transition: "width 0.4s ease-out",
										}}
									/>
								</div>
							</div>
						);
					})}

					{/* Footer hint */}
					<div
						style={{
							fontSize: "8px",
							color: "rgba(0,255,170,0.25)",
							letterSpacing: "0.1em",
							marginTop: "4px",
						}}
					>
						[TAB] to close
					</div>
				</div>
			)}

			{/* Toggle tab handle — always visible */}
			<button
				onClick={onToggle}
				aria-label={open ? "Close victory paths panel" : "Open victory paths panel"}
				aria-expanded={open}
				aria-controls="victory-progress-panel"
				style={{
					pointerEvents: "auto",
					background: "rgba(0, 8, 4, 0.88)",
					border: "1px solid rgba(0,255,170,0.15)",
					borderLeft: "none",
					borderRadius: "0 4px 4px 0",
					color: "rgba(0,255,170,0.5)",
					fontFamily: FONT_MONO,
					fontSize: "9px",
					letterSpacing: "0.1em",
					padding: "8px 4px",
					cursor: "pointer",
					writingMode: "vertical-rl",
					textOrientation: "mixed",
					minHeight: "60px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				tabIndex={0}
			>
				{open ? "◀" : "▶"}
			</button>
		</div>
	);
});
