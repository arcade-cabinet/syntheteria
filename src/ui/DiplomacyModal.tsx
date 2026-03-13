/**
 * Diplomacy UI — Faction relations panel with standings and trade offers.
 *
 * Shows the player's standing with each rival faction, recent diplomacy
 * events, and pending trade offers.
 */

import { useSyncExternalStore } from "react";
import {
	Animated,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { useEffect, useRef } from "react";
import {
	type DiplomacyFactionId,
	ALL_DIPLOMACY_FACTIONS,
	getFactionProfile,
	getStanding,
	getStandingDisplay,
	getPendingTrades,
	getRecentEvents,
	acceptTrade,
	rejectTrade,
	subscribeDiplomacy,
} from "../systems/diplomacy";
import { getTurnState, subscribeTurnState } from "../systems/turnSystem";

// Stable snapshot getter (must not be an inline closure)
function getPlayerReclaimersStanding() {
	return getStanding("player", "reclaimers");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DiplomacyModal({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const { width: vw, height: vh } = useWindowDimensions();
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Subscribe to diplomacy and turn state for re-renders
	useSyncExternalStore(subscribeDiplomacy, getPlayerReclaimersStanding);
	const turn = useSyncExternalStore(subscribeTurnState, getTurnState);

	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: visible ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		}).start();
	}, [visible, fadeAnim]);

	if (!visible) return null;

	const panelWidth = Math.min(480, vw * 0.92);
	const pendingTrades = getPendingTrades("player");
	const events = getRecentEvents();

	return (
		<Animated.View
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 60,
				opacity: fadeAnim,
				justifyContent: "center",
				alignItems: "center",
			}}
			pointerEvents={visible ? "auto" : "none"}
		>
			{/* Backdrop */}
			<Pressable
				style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
				onPress={onClose}
				accessibilityLabel="Close diplomacy"
			/>

			{/* Panel */}
			<View
				style={{
					width: panelWidth,
					maxHeight: vh * 0.85,
					borderWidth: 1,
					borderColor: "rgba(246, 197, 106, 0.2)",
					borderRadius: 12,
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					overflow: "hidden",
					...(Platform.OS === "web"
						? ({ backdropFilter: "blur(16px)" } as Record<string, string>)
						: {}),
				}}
			>
				{/* Header */}
				<View
					style={{
						paddingHorizontal: 20,
						paddingVertical: 16,
						borderBottomWidth: 1,
						borderBottomColor: "rgba(246, 197, 106, 0.1)",
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<View>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 2.5,
								color: "rgba(246, 197, 106, 0.5)",
								textTransform: "uppercase",
							}}
						>
							Inter-Faction
						</Text>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 18,
								fontWeight: "700",
								color: "#ffe9b0",
								letterSpacing: 1,
								marginTop: 2,
							}}
						>
							Diplomacy
						</Text>
					</View>

					<Pressable
						onPress={onClose}
						accessibilityLabel="Close"
						accessibilityRole="button"
						style={{
							width: 36,
							height: 36,
							borderRadius: 6,
							borderWidth: 1,
							borderColor: "rgba(255,255,255,0.1)",
							backgroundColor: "rgba(255,255,255,0.04)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text style={{ color: "#f6c56a", fontSize: 16, fontFamily: "monospace" }}>
							x
						</Text>
					</Pressable>
				</View>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Faction standings */}
					<View>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 2,
								color: "rgba(246, 197, 106, 0.5)",
								textTransform: "uppercase",
								marginBottom: 8,
							}}
						>
							Faction Relations
						</Text>

						<View style={{ gap: 8 }}>
							{ALL_DIPLOMACY_FACTIONS.map((factionId) => (
								<FactionStandingCard
									key={factionId}
									factionId={factionId}
								/>
							))}
						</View>
					</View>

					{/* Pending trade offers */}
					{pendingTrades.length > 0 && (
						<View>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(246, 197, 106, 0.5)",
									textTransform: "uppercase",
									marginBottom: 8,
								}}
							>
								Trade Offers
							</Text>

							<View style={{ gap: 8 }}>
								{pendingTrades.map((trade) => (
									<View
										key={trade.id}
										style={{
											borderWidth: 1,
											borderColor: "rgba(246, 197, 106, 0.2)",
											borderRadius: 8,
											padding: 12,
											backgroundColor: "rgba(246, 197, 106, 0.04)",
										}}
									>
										<Text
											style={{
												fontFamily: "monospace",
												fontSize: 11,
												color: "#ffe9b0",
												marginBottom: 8,
											}}
										>
											Offer from {trade.from}
										</Text>

										<View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
											<Pressable
												onPress={() => acceptTrade(trade.id, turn.turnNumber)}
												accessibilityLabel="Accept trade"
												accessibilityRole="button"
												style={{
													flex: 1,
													borderWidth: 1,
													borderColor: "rgba(111, 243, 200, 0.4)",
													borderRadius: 6,
													paddingVertical: 8,
													alignItems: "center",
													backgroundColor: "rgba(111, 243, 200, 0.08)",
												}}
											>
												<Text
													style={{
														fontFamily: "monospace",
														fontSize: 10,
														letterSpacing: 1.5,
														color: "#6ff3c8",
														textTransform: "uppercase",
													}}
												>
													Accept
												</Text>
											</Pressable>

											<Pressable
												onPress={() => rejectTrade(trade.id, turn.turnNumber)}
												accessibilityLabel="Reject trade"
												accessibilityRole="button"
												style={{
													flex: 1,
													borderWidth: 1,
													borderColor: "rgba(255, 143, 143, 0.4)",
													borderRadius: 6,
													paddingVertical: 8,
													alignItems: "center",
													backgroundColor: "rgba(255, 143, 143, 0.08)",
												}}
											>
												<Text
													style={{
														fontFamily: "monospace",
														fontSize: 10,
														letterSpacing: 1.5,
														color: "#ff8f8f",
														textTransform: "uppercase",
													}}
												>
													Reject
												</Text>
											</Pressable>
										</View>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Recent events */}
					{events.length > 0 && (
						<View>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(246, 197, 106, 0.5)",
									textTransform: "uppercase",
									marginBottom: 8,
								}}
							>
								Recent Events
							</Text>

							<View style={{ gap: 4 }}>
								{events.slice(-5).reverse().map((event, i) => (
									<View
										key={`${event.type}_${event.turnNumber}_${i}`}
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: 8,
											paddingVertical: 4,
										}}
									>
										<View
											style={{
												width: 6,
												height: 6,
												borderRadius: 3,
												backgroundColor:
													event.standingChange > 0 ? "#6ff3c8" : "#ff8f8f",
											}}
										/>
										<Text
											style={{
												fontFamily: "monospace",
												fontSize: 10,
												color: "rgba(255,255,255,0.5)",
												flex: 1,
											}}
										>
											Turn {event.turnNumber}: {event.type.replace(/_/g, " ")}{" "}
											({event.factionA} / {event.factionB})
										</Text>
										<Text
											style={{
												fontFamily: "monospace",
												fontSize: 10,
												color:
													event.standingChange > 0 ? "#6ff3c8" : "#ff8f8f",
												fontWeight: "600",
											}}
										>
											{event.standingChange > 0 ? "+" : ""}
											{event.standingChange}
										</Text>
									</View>
								))}
							</View>
						</View>
					)}
				</ScrollView>
			</View>
		</Animated.View>
	);
}

// ─── Faction Standing Card ───────────────────────────────────────────────────

function FactionStandingCard({
	factionId,
}: {
	factionId: DiplomacyFactionId;
}) {
	const profile = getFactionProfile(factionId);
	const display = getStandingDisplay("player", factionId);

	// Standing bar: -100 to +100 mapped to 0..100%
	const barPercent = Math.round(((display.value + 100) / 200) * 100);

	return (
		<View
			style={{
				borderWidth: 1,
				borderColor: `${profile.color}33`,
				borderRadius: 8,
				padding: 12,
				backgroundColor: `${profile.color}08`,
			}}
			accessibilityLabel={`${profile.displayName}: ${display.label} (${display.value})`}
		>
			{/* Faction name + standing label */}
			<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
					<View
						style={{
							width: 8,
							height: 8,
							borderRadius: 4,
							backgroundColor: profile.color,
						}}
					/>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 13,
							fontWeight: "600",
							color: profile.color,
							letterSpacing: 0.5,
						}}
					>
						{profile.displayName}
					</Text>
				</View>

				<View
					style={{
						borderRadius: 4,
						paddingHorizontal: 6,
						paddingVertical: 2,
						backgroundColor: `${display.color}22`,
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: 1.5,
							color: display.color,
							textTransform: "uppercase",
						}}
					>
						{display.label}
					</Text>
				</View>
			</View>

			{/* Description */}
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 10,
					color: "rgba(255,255,255,0.4)",
					marginTop: 4,
					lineHeight: 14,
				}}
			>
				{profile.description}
			</Text>

			{/* Standing bar */}
			<View style={{ marginTop: 8 }}>
				<View
					style={{
						height: 4,
						borderRadius: 2,
						backgroundColor: "rgba(255,255,255,0.08)",
						overflow: "hidden",
					}}
				>
					<View
						style={{
							height: "100%",
							width: `${barPercent}%`,
							backgroundColor: display.color,
							borderRadius: 2,
						}}
					/>
				</View>
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						marginTop: 2,
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 7,
							color: "rgba(255,255,255,0.2)",
						}}
					>
						Hostile
					</Text>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: display.color,
							fontWeight: "600",
						}}
					>
						{display.value}
					</Text>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 7,
							color: "rgba(255,255,255,0.2)",
						}}
					>
						Allied
					</Text>
				</View>
			</View>
		</View>
	);
}
