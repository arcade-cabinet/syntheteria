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
import { Platform, Pressable, Text, View } from "react-native";
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
			<View className="absolute left-0 top-0 right-0 pointer-events-none pt-safe">
				<View
					className="pointer-events-auto mx-3 mt-2 flex-row items-center justify-between"
					style={{ gap: 8 }}
				>
					{/* Left: Energy + Storm indicator */}
					<View className="flex-row items-center" style={{ gap: 8 }}>
						{/* Energy panel */}
						<View
							style={{
								borderWidth: 1,
								borderColor: "rgba(139, 230, 255, 0.3)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingHorizontal: 12,
								paddingVertical: 8,
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
								...(Platform.OS === "web"
									? ({
											backdropFilter: "blur(8px)",
										} as Record<string, string>)
									: {}),
							}}
							accessibilityLabel={`Energy: ${snap.power.totalGeneration}`}
						>
							<BoltIcon width={14} height={14} color="#8be6ff" />
							<Text
								className="font-mono"
								style={{
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(139, 230, 255, 0.7)",
									textTransform: "uppercase",
								}}
							>
								Energy
							</Text>
							<Text
								className="font-mono"
								style={{
									fontSize: 16,
									fontWeight: "700",
									color: "#d0f4ff",
									letterSpacing: 1,
								}}
							>
								{snap.power.totalGeneration}
							</Text>
						</View>

						{/* Storm pressure compact indicator */}
						<View
							style={{
								borderWidth: 1,
								borderColor:
									snap.power.stormIntensity >= 0.6
										? "rgba(255, 80, 80, 0.3)"
										: "rgba(246, 197, 106, 0.25)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingHorizontal: 8,
								paddingVertical: 8,
								flexDirection: "row",
								alignItems: "center",
								gap: 4,
								...(Platform.OS === "web"
									? ({
											backdropFilter: "blur(8px)",
										} as Record<string, string>)
									: {}),
							}}
							accessibilityLabel={`Storm: ${Math.round(snap.power.stormIntensity * 100)}%`}
						>
							<StormIcon
								width={14}
								height={14}
								color={snap.power.stormIntensity >= 0.6 ? "#ff8f8f" : "#f6c56a"}
							/>
							<Text
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
							</Text>
						</View>
					</View>

					{/* Right: Turn + End Turn + Hamburger */}
					<View className="flex-row items-center" style={{ gap: 6 }}>
						{/* Turn counter */}
						<View
							style={{
								borderWidth: 1,
								borderColor: "rgba(176, 136, 216, 0.3)",
								borderRadius: 6,
								backgroundColor: "rgba(7, 17, 23, 0.75)",
								paddingHorizontal: 10,
								paddingVertical: 8,
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
								...(Platform.OS === "web"
									? ({
											backdropFilter: "blur(8px)",
										} as Record<string, string>)
									: {}),
							}}
							accessibilityLabel={`Turn ${turn.turnNumber}`}
						>
							<Text
								className="font-mono"
								style={{
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(176, 136, 216, 0.7)",
									textTransform: "uppercase",
								}}
							>
								Turn
							</Text>
							<Text
								className="font-mono"
								style={{
									fontSize: 16,
									fontWeight: "700",
									color: "#d4b0ff",
									letterSpacing: 1,
								}}
							>
								{turn.turnNumber}
							</Text>
						</View>

						{/* End Turn button */}
						<Pressable
							testID="end-turn-button"
							onPress={endPlayerTurn}
							disabled={!isPlayerPhase}
							accessibilityLabel="End turn"
							accessibilityRole="button"
							accessibilityState={{ disabled: !isPlayerPhase }}
							style={{
								borderWidth: 1.5,
								borderColor: isPlayerPhase
									? "rgba(139, 230, 255, 0.5)"
									: "rgba(139, 230, 255, 0.2)",
								borderRadius: 6,
								backgroundColor: isPlayerPhase
									? "rgba(139, 230, 255, 0.12)"
									: "rgba(139, 230, 255, 0.04)",
								paddingHorizontal: 14,
								paddingVertical: 10,
								alignItems: "center",
								justifyContent: "center",
								minHeight: 44,
								opacity: isPlayerPhase ? 1 : 0.5,
								...(Platform.OS === "web"
									? ({
											backdropFilter: "blur(8px)",
										} as Record<string, string>)
									: {}),
							}}
						>
							<Text
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
							</Text>
						</Pressable>

						{/* Pause button */}
						{onPause && (
							<Pressable
								testID="pause-button"
								onPress={onPause}
								accessibilityLabel="Pause game"
								accessibilityRole="button"
								style={({ pressed }) => ({
									width: 44,
									height: 44,
									borderRadius: 6,
									borderWidth: 1.5,
									borderColor: "rgba(176, 136, 216, 0.3)",
									backgroundColor: pressed
										? "rgba(176, 136, 216, 0.1)"
										: "rgba(7, 17, 23, 0.75)",
									alignItems: "center",
									justifyContent: "center",
									...(Platform.OS === "web"
										? ({
												backdropFilter: "blur(8px)",
											} as Record<string, string>)
										: {}),
								})}
							>
								<PauseIcon width={16} height={16} color="#d4b0ff" />
							</Pressable>
						)}

						{/* Hamburger menu button */}
						<Pressable
							testID="hamburger-menu-button"
							onPress={() => setPanelOpen((prev) => !prev)}
							accessibilityLabel="Open detail panel"
							accessibilityRole="button"
							style={({ pressed }) => ({
								width: 44,
								height: 44,
								borderRadius: 6,
								borderWidth: 1.5,
								borderColor: panelOpen
									? "rgba(139, 230, 255, 0.6)"
									: "rgba(139, 230, 255, 0.3)",
								backgroundColor: panelOpen
									? "rgba(139, 230, 255, 0.18)"
									: pressed
										? "rgba(139, 230, 255, 0.1)"
										: "rgba(7, 17, 23, 0.75)",
								alignItems: "center",
								justifyContent: "center",
								...(Platform.OS === "web"
									? ({
											backdropFilter: "blur(8px)",
										} as Record<string, string>)
									: {}),
							})}
						>
							<MenuIcon width={20} height={20} color="#8be6ff" />
						</Pressable>
					</View>
				</View>
			</View>

			{/* Slide-out detail panel */}
			<SlideOutPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
		</>
	);
}
