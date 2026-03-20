/**
 * GameHUD — Decluttered top bar showing only essential info.
 *
 * Visible elements:
 *   - Energy (storm charge) with bolt icon — cyan accent
 *   - Turn counter — purple accent
 *   - End Turn button — gated by player phase
 *   - Hamburger menu icon — opens slide-out detail panel
 *
 * All other resources, unit roster, campaign stats are accessed
 * through the hamburger slide-out panel.
 */

import { useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { endPlayerTurn } from "../../systems/turnSystem";
import { useTurnState } from "../hooks/useTurnState";
import { BoltIcon, MenuIcon, PauseIcon, StormIcon } from "../icons";
import { SlideOutPanel } from "./SlideOutPanel";

// ─── Main HUD ────────────────────────────────────────────────────────────────

export function GameHUD({
	onPause,
	onTechTree,
	onDiplomacy,
}: {
	onPause?: () => void;
	onTechTree?: () => void;
	onDiplomacy?: () => void;
}) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const turn = useTurnState();
	const [panelOpen, setPanelOpen] = useState(false);
	const isPlayerPhase = turn.phase === "player";

	return (
		<>
			<div className="absolute left-0 top-0 right-0 pointer-events-none pt-safe">
				<div
					className="pointer-events-auto mx-3 mt-2 flex flex-row items-center justify-between"
					style={{ gap: 8 }}
				>
					{/* Left: Energy + Storm indicator */}
					<div className="flex flex-row items-center" style={{ gap: 8 }}>
						{/* Energy panel */}
						<div
							style={{
								borderWidth: 1,
								borderStyle: "solid",
								borderColor: "rgba(139, 230, 255, 0.3)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingLeft: 12,
								paddingRight: 12,
								paddingTop: 8,
								paddingBottom: 8,
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
								backdropFilter: "blur(8px)",
							}}
							aria-label={`Energy: ${snap.power.totalGeneration}`}
						>
							<BoltIcon width={14} height={14} color="#8be6ff" />
							<span
								className="font-mono"
								style={{
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(139, 230, 255, 0.7)",
									textTransform: "uppercase",
								}}
							>
								Energy
							</span>
							<span
								className="font-mono"
								style={{
									fontSize: 16,
									fontWeight: "700",
									color: "#d0f4ff",
									letterSpacing: 1,
								}}
							>
								{snap.power.totalGeneration}
							</span>
						</div>

						{/* Storm pressure compact indicator */}
						<div
							style={{
								borderWidth: 1,
								borderStyle: "solid",
								borderColor:
									snap.power.stormIntensity >= 0.6
										? "rgba(255, 80, 80, 0.3)"
										: "rgba(246, 197, 106, 0.25)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingLeft: 8,
								paddingRight: 8,
								paddingTop: 8,
								paddingBottom: 8,
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 4,
								backdropFilter: "blur(8px)",
							}}
							aria-label={`Storm: ${Math.round(snap.power.stormIntensity * 100)}%`}
						>
							<StormIcon
								width={14}
								height={14}
								color={snap.power.stormIntensity >= 0.6 ? "#ff8f8f" : "#f6c56a"}
							/>
							<span
								className="font-mono"
								style={{
									fontSize: 12,
									fontWeight: "600",
									color:
										snap.power.stormIntensity >= 0.6 ? "#ffd7d7" : "#ffe9b0",
									letterSpacing: 0.5,
								}}
							>
								{Math.round(snap.power.stormIntensity * 100)}%
							</span>
						</div>
					</div>

					{/* Right: Turn + End Turn + Hamburger */}
					<div className="flex flex-row items-center" style={{ gap: 6 }}>
						{/* Turn counter */}
						<div
							style={{
								borderWidth: 1,
								borderStyle: "solid",
								borderColor: "rgba(176, 136, 216, 0.3)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingLeft: 10,
								paddingRight: 10,
								paddingTop: 8,
								paddingBottom: 8,
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
								backdropFilter: "blur(8px)",
							}}
							aria-label={`Turn ${turn.turnNumber}`}
						>
							<span
								className="font-mono"
								style={{
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(176, 136, 216, 0.7)",
									textTransform: "uppercase",
								}}
							>
								Turn
							</span>
							<span
								className="font-mono"
								style={{
									fontSize: 16,
									fontWeight: "700",
									color: "#d4b0ff",
									letterSpacing: 1,
								}}
							>
								{turn.turnNumber}
							</span>
						</div>

						{/* End Turn button */}
						<button
							type="button"
							data-testid="end-turn-button"
							onClick={endPlayerTurn}
							disabled={!isPlayerPhase}
							aria-label="End turn"
							aria-disabled={!isPlayerPhase}
							style={{
								borderWidth: 1.5,
								borderStyle: "solid",
								borderColor: isPlayerPhase
									? "rgba(139, 230, 255, 0.5)"
									: "rgba(139, 230, 255, 0.2)",
								borderRadius: 6,
								backgroundColor: isPlayerPhase
									? "rgba(139, 230, 255, 0.12)"
									: "rgba(139, 230, 255, 0.04)",
								paddingLeft: 14,
								paddingRight: 14,
								paddingTop: 10,
								paddingBottom: 10,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								minHeight: 44,
								opacity: isPlayerPhase ? 1 : 0.5,
								backdropFilter: "blur(8px)",
								cursor: isPlayerPhase ? "pointer" : "not-allowed",
							}}
						>
							<span
								className="font-mono"
								style={{
									fontSize: 11,
									letterSpacing: 3,
									color: isPlayerPhase ? "#8be6ff" : "rgba(139, 230, 255, 0.4)",
									fontWeight: "700",
									textTransform: "uppercase",
								}}
							>
								End Turn
							</span>
						</button>

						{/* Pause button */}
						{onPause && (
							<button
								type="button"
								data-testid="pause-button"
								onClick={onPause}
								aria-label="Pause game"
								style={{
									width: 44,
									height: 44,
									borderRadius: 6,
									borderWidth: 1.5,
									borderStyle: "solid",
									borderColor: "rgba(176, 136, 216, 0.3)",
									backgroundColor: "rgba(7, 17, 23, 0.75)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									backdropFilter: "blur(8px)",
									cursor: "pointer",
								}}
							>
								<PauseIcon width={16} height={16} color="#d4b0ff" />
							</button>
						)}

						{/* Hamburger menu button */}
						<button
							type="button"
							data-testid="hamburger-menu-button"
							onClick={() => setPanelOpen((prev) => !prev)}
							aria-label="Open detail panel"
							style={{
								width: 44,
								height: 44,
								borderRadius: 6,
								borderWidth: 1.5,
								borderStyle: "solid",
								borderColor: panelOpen
									? "rgba(139, 230, 255, 0.6)"
									: "rgba(139, 230, 255, 0.3)",
								backgroundColor: panelOpen
									? "rgba(139, 230, 255, 0.18)"
									: "rgba(7, 17, 23, 0.75)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								backdropFilter: "blur(8px)",
								cursor: "pointer",
							}}
						>
							<MenuIcon width={20} height={20} color="#8be6ff" />
						</button>
					</div>
				</div>
			</div>

			{/* Slide-out detail panel */}
			<SlideOutPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
		</>
	);
}
