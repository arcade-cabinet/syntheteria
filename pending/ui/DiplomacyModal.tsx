/**
 * Diplomacy UI — Faction relations panel with standings and trade offers.
 *
 * Shows the player's standing with each rival faction, recent diplomacy
 * events, and pending trade offers.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
	ALL_DIPLOMACY_FACTIONS,
	acceptTrade,
	type DiplomacyFactionId,
	getFactionProfile,
	getPendingTrades,
	getRecentEvents,
	getStanding,
	getStandingDisplay,
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
	const fadeRef = useRef<HTMLDivElement>(null);

	// Subscribe to diplomacy and turn state for re-renders
	useSyncExternalStore(subscribeDiplomacy, getPlayerReclaimersStanding);
	const turn = useSyncExternalStore(subscribeTurnState, getTurnState);

	useEffect(() => {
		if (!fadeRef.current) return;
		fadeRef.current.style.transition = "opacity 200ms";
		fadeRef.current.style.opacity = visible ? "1" : "0";
	}, [visible]);

	if (!visible) return null;

	const pendingTrades = getPendingTrades("player");
	const events = getRecentEvents();

	return (
		<div
			ref={fadeRef}
			className="fixed inset-0 z-[60] flex items-center justify-center"
			style={{ pointerEvents: visible ? "auto" : "none" }}
		>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/60"
				onClick={onClose}
				aria-label="Close diplomacy"
				style={{ border: "none", cursor: "default" }}
			/>

			{/* Panel */}
			<div
				className="relative w-full max-w-[480px] mx-4 rounded-xl overflow-hidden flex flex-col"
				style={{
					maxHeight: "85vh",
					border: "1px solid rgba(246, 197, 106, 0.2)",
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					backdropFilter: "blur(16px)",
				}}
			>
				{/* Header */}
				<div
					className="flex flex-row justify-between items-center px-5 py-4"
					style={{ borderBottom: "1px solid rgba(246, 197, 106, 0.1)" }}
				>
					<div>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: "2.5px",
								color: "rgba(246, 197, 106, 0.5)",
								textTransform: "uppercase",
								display: "block",
							}}
						>
							Inter-Faction
						</span>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 18,
								fontWeight: 700,
								color: "#ffe9b0",
								letterSpacing: "1px",
								marginTop: 2,
								display: "block",
							}}
						>
							Diplomacy
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						style={{
							width: 36,
							height: 36,
							borderRadius: 6,
							border: "1px solid rgba(255,255,255,0.1)",
							backgroundColor: "rgba(255,255,255,0.04)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
						}}
					>
						<span
							style={{
								color: "#f6c56a",
								fontSize: 16,
								fontFamily: "monospace",
							}}
						>
							x
						</span>
					</button>
				</div>

				<div
					className="overflow-y-auto flex-1"
					style={{
						padding: 16,
						paddingBottom: 24,
						display: "flex",
						flexDirection: "column",
						gap: 20,
					}}
				>
					{/* Faction standings */}
					<div>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: "2px",
								color: "rgba(246, 197, 106, 0.5)",
								textTransform: "uppercase",
								display: "block",
								marginBottom: 8,
							}}
						>
							Faction Relations
						</span>

						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{ALL_DIPLOMACY_FACTIONS.map((factionId) => (
								<FactionStandingCard key={factionId} factionId={factionId} />
							))}
						</div>
					</div>

					{/* Pending trade offers */}
					{pendingTrades.length > 0 && (
						<div>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: "2px",
									color: "rgba(246, 197, 106, 0.5)",
									textTransform: "uppercase",
									display: "block",
									marginBottom: 8,
								}}
							>
								Trade Offers
							</span>

							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								{pendingTrades.map((trade) => (
									<div
										key={trade.id}
										style={{
											border: "1px solid rgba(246, 197, 106, 0.2)",
											borderRadius: 8,
											padding: 12,
											backgroundColor: "rgba(246, 197, 106, 0.04)",
										}}
									>
										<span
											style={{
												fontFamily: "monospace",
												fontSize: 11,
												color: "#ffe9b0",
												display: "block",
												marginBottom: 8,
											}}
										>
											Offer from {trade.from}
										</span>

										<div
											style={{
												display: "flex",
												flexDirection: "row",
												gap: 12,
												marginBottom: 8,
											}}
										>
											<button
												type="button"
												onClick={() => acceptTrade(trade.id, turn.turnNumber)}
												aria-label="Accept trade"
												style={{
													flex: 1,
													border: "1px solid rgba(111, 243, 200, 0.4)",
													borderRadius: 6,
													paddingTop: 8,
													paddingBottom: 8,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													backgroundColor: "rgba(111, 243, 200, 0.08)",
													cursor: "pointer",
												}}
											>
												<span
													style={{
														fontFamily: "monospace",
														fontSize: 10,
														letterSpacing: "1.5px",
														color: "#6ff3c8",
														textTransform: "uppercase",
													}}
												>
													Accept
												</span>
											</button>

											<button
												type="button"
												onClick={() => rejectTrade(trade.id, turn.turnNumber)}
												aria-label="Reject trade"
												style={{
													flex: 1,
													border: "1px solid rgba(255, 143, 143, 0.4)",
													borderRadius: 6,
													paddingTop: 8,
													paddingBottom: 8,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													backgroundColor: "rgba(255, 143, 143, 0.08)",
													cursor: "pointer",
												}}
											>
												<span
													style={{
														fontFamily: "monospace",
														fontSize: 10,
														letterSpacing: "1.5px",
														color: "#ff8f8f",
														textTransform: "uppercase",
													}}
												>
													Reject
												</span>
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Recent events */}
					{events.length > 0 && (
						<div>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: "2px",
									color: "rgba(246, 197, 106, 0.5)",
									textTransform: "uppercase",
									display: "block",
									marginBottom: 8,
								}}
							>
								Recent Events
							</span>

							<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
								{events
									.slice(-5)
									.reverse()
									.map((event, i) => (
										<div
											key={`${event.type}_${event.turnNumber}_${i}`}
											style={{
												display: "flex",
												flexDirection: "row",
												alignItems: "center",
												gap: 8,
												paddingTop: 4,
												paddingBottom: 4,
											}}
										>
											<div
												style={{
													width: 6,
													height: 6,
													borderRadius: 3,
													backgroundColor:
														event.standingChange > 0 ? "#6ff3c8" : "#ff8f8f",
													flexShrink: 0,
												}}
											/>
											<span
												style={{
													fontFamily: "monospace",
													fontSize: 10,
													color: "rgba(255,255,255,0.5)",
													flex: 1,
												}}
											>
												Turn {event.turnNumber}: {event.type.replace(/_/g, " ")}{" "}
												({event.factionA} / {event.factionB})
											</span>
											<span
												style={{
													fontFamily: "monospace",
													fontSize: 10,
													color:
														event.standingChange > 0 ? "#6ff3c8" : "#ff8f8f",
													fontWeight: 600,
												}}
											>
												{event.standingChange > 0 ? "+" : ""}
												{event.standingChange}
											</span>
										</div>
									))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Faction Standing Card ───────────────────────────────────────────────────

function FactionStandingCard({ factionId }: { factionId: DiplomacyFactionId }) {
	const profile = getFactionProfile(factionId);
	const display = getStandingDisplay("player", factionId);

	// Standing bar: -100 to +100 mapped to 0..100%
	const barPercent = Math.round(((display.value + 100) / 200) * 100);

	return (
		<div
			style={{
				border: `1px solid ${profile.color}33`,
				borderRadius: 8,
				padding: 12,
				backgroundColor: `${profile.color}08`,
			}}
			aria-label={`${profile.displayName}: ${display.label} (${display.value})`}
		>
			{/* Faction name + standing label */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 8,
					}}
				>
					<div
						style={{
							width: 8,
							height: 8,
							borderRadius: 4,
							backgroundColor: profile.color,
						}}
					/>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 13,
							fontWeight: 600,
							color: profile.color,
							letterSpacing: "0.5px",
						}}
					>
						{profile.displayName}
					</span>
				</div>

				<div
					style={{
						borderRadius: 4,
						paddingLeft: 6,
						paddingRight: 6,
						paddingTop: 2,
						paddingBottom: 2,
						backgroundColor: `${display.color}22`,
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: "1.5px",
							color: display.color,
							textTransform: "uppercase",
						}}
					>
						{display.label}
					</span>
				</div>
			</div>

			{/* Description */}
			<p
				style={{
					fontFamily: "monospace",
					fontSize: 10,
					color: "rgba(255,255,255,0.4)",
					marginTop: 4,
					lineHeight: "14px",
					margin: "4px 0 0 0",
				}}
			>
				{profile.description}
			</p>

			{/* Standing bar */}
			<div style={{ marginTop: 8 }}>
				<div
					style={{
						height: 4,
						borderRadius: 2,
						backgroundColor: "rgba(255,255,255,0.08)",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							height: "100%",
							width: `${barPercent}%`,
							backgroundColor: display.color,
							borderRadius: 2,
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-between",
						marginTop: 2,
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 7,
							color: "rgba(255,255,255,0.2)",
						}}
					>
						Hostile
					</span>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: display.color,
							fontWeight: 600,
						}}
					>
						{display.value}
					</span>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 7,
							color: "rgba(255,255,255,0.2)",
						}}
					>
						Allied
					</span>
				</div>
			</div>
		</div>
	);
}
