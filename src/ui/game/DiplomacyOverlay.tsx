/**
 * DiplomacyOverlay — faction standings, trade, alliances.
 *
 * DOM overlay showing all faction standings (-100 to +100), relation state,
 * trade sharing status, and recent diplomacy events.
 * Actions: propose alliance, declare war.
 *
 * Diegetic vocabulary: SIGNAL PROTOCOL, FACTION STANDING.
 */

import type { World } from "koota";
import { useEffect, useMemo, useState } from "react";
import { FACTION_COLORS_CSS } from "../../config";
import { FACTION_DEFINITIONS } from "../../factions";
import { getRelation, type RelationType } from "../../factions";
import {
	type DiplomacyEvent,
	declareWar,
	getDiplomacyPersonality,
	getRecentDiplomacyEvents,
	getStandingDisplay,
	proposeAlliance,
	subscribeDiplomacy,
} from "../../systems";
import { Board } from "../../traits";

type DiplomacyOverlayProps = {
	world: World;
	factionId: string;
	onClose: () => void;
};

function getCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

function formatFactionName(id: string): string {
	return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const RELATION_LABELS: Record<RelationType, string> = {
	ally: "ALLIED",
	neutral: "NEUTRAL",
	hostile: "HOSTILE",
};

const RELATION_COLORS: Record<RelationType, string> = {
	ally: "#7ee7cb",
	neutral: "#888888",
	hostile: "#cc4444",
};

export function DiplomacyOverlay({
	world,
	factionId,
	onClose,
}: DiplomacyOverlayProps) {
	const [, setTick] = useState(0);

	// Subscribe to diplomacy changes
	useEffect(() => {
		const unsub = subscribeDiplomacy(() => setTick((t) => t + 1));
		return unsub;
	}, []);

	// Also poll for ECS standing changes
	useEffect(() => {
		const id = setInterval(() => setTick((t) => t + 1), 500);
		return () => clearInterval(id);
	}, []);

	const currentTurn = getCurrentTurn(world);

	// Other factions (not the player)
	const otherFactions = useMemo(
		() => FACTION_DEFINITIONS.filter((f) => f.id !== factionId),
		[factionId],
	);

	const recentEvents = getRecentDiplomacyEvents();

	function handlePropose(targetFactionId: string) {
		proposeAlliance(world, factionId, targetFactionId, currentTurn);
		setTick((t) => t + 1);
	}

	function handleDeclareWar(targetFactionId: string) {
		declareWar(world, factionId, targetFactionId, currentTurn);
		setTick((t) => t + 1);
	}

	return (
		<div
			data-testid="diplomacy-overlay"
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: "rgba(2, 5, 10, 0.92)",
				zIndex: 50,
				pointerEvents: "auto",
				display: "flex",
				flexDirection: "column",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
			}}
		>
			{/* Header */}
			<div
				style={{
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid rgba(255,255,255,0.08)",
					background: "rgba(8, 23, 35, 0.96)",
					padding: "12px 20px",
				}}
			>
				<span
					style={{
						fontSize: 11,
						textTransform: "uppercase",
						letterSpacing: "0.28em",
						color: "#8be6ff",
					}}
				>
					Signal Protocol — Faction Standing
				</span>
				<button
					type="button"
					onClick={onClose}
					style={{
						width: 32,
						height: 32,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: "50%",
						border: "1px solid rgba(255,255,255,0.12)",
						background: "rgba(255,255,255,0.05)",
						color: "rgba(255,255,255,0.5)",
						fontSize: 16,
						cursor: "pointer",
					}}
					aria-label="Close"
				>
					{"\u00D7"}
				</button>
			</div>

			{/* Body */}
			<div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
				{/* Faction cards */}
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					{otherFactions.map((faction) => {
						const relation = getRelation(world, factionId, faction.id);
						const display = getStandingDisplay(world, factionId, faction.id);
						const personality = getDiplomacyPersonality(faction.id);
						const factionColor = FACTION_COLORS_CSS[faction.id] ?? "#ccc";
						const isAlly = relation === "ally";
						const isHostile = relation === "hostile";

						return (
							<div
								key={faction.id}
								data-testid={`diplomacy-${faction.id}`}
								style={{
									borderRadius: 10,
									border: `1px solid ${factionColor}33`,
									background: `${factionColor}08`,
									padding: "14px 16px",
								}}
							>
								{/* Faction header */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<div
										style={{ display: "flex", alignItems: "center", gap: 10 }}
									>
										<span
											style={{
												display: "inline-block",
												width: 12,
												height: 12,
												borderRadius: "50%",
												backgroundColor: factionColor,
											}}
										/>
										<span
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: factionColor,
											}}
										>
											{faction.displayName}
										</span>
									</div>
									<span
										style={{
											fontSize: 10,
											fontWeight: 600,
											letterSpacing: "0.15em",
											color: RELATION_COLORS[relation],
										}}
									>
										{RELATION_LABELS[relation]}
									</span>
								</div>

								{/* Standing bar */}
								<div style={{ marginTop: 10 }}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: 3,
										}}
									>
										<span
											style={{
												fontSize: 9,
												color: "rgba(255,255,255,0.4)",
												letterSpacing: "0.1em",
											}}
										>
											STANDING
										</span>
										<span style={{ fontSize: 9, color: display.color }}>
											{display.value > 0 ? "+" : ""}
											{display.value}
										</span>
									</div>
									<div
										style={{
											height: 6,
											borderRadius: 3,
											background: "rgba(255,255,255,0.06)",
											overflow: "hidden",
											position: "relative",
										}}
									>
										{/* Center marker */}
										<div
											style={{
												position: "absolute",
												left: "50%",
												top: 0,
												bottom: 0,
												width: 1,
												background: "rgba(255,255,255,0.15)",
											}}
										/>
										{/* Standing fill */}
										<div
											style={{
												position: "absolute",
												left:
													display.value >= 0
														? "50%"
														: `${50 + (display.value / 200) * 100}%`,
												width: `${Math.abs(display.value) / 2}%`,
												height: "100%",
												background: display.color,
												borderRadius: 3,
												transition: "all 0.3s ease",
											}}
										/>
									</div>
								</div>

								{/* Description + personality hint */}
								<div
									style={{
										marginTop: 8,
										fontSize: 9,
										color: "rgba(255,255,255,0.35)",
										lineHeight: "13px",
									}}
								>
									{faction.description}
								</div>
								{personality && !personality.acceptsAlliance && (
									<div
										style={{
											marginTop: 4,
											fontSize: 8,
											color: "#cc6666",
											fontStyle: "italic",
										}}
									>
										Will never accept alliance proposals.
									</div>
								)}
								{personality?.willBackstab && (
									<div
										style={{
											marginTop: 4,
											fontSize: 8,
											color: "#f6c56a",
											fontStyle: "italic",
										}}
									>
										Warning: known to betray alliances.
									</div>
								)}

								{/* Trade status */}
								{isAlly && (
									<div
										style={{
											marginTop: 8,
											padding: "4px 8px",
											borderRadius: 4,
											background: "rgba(126, 231, 203, 0.08)",
											border: "1px solid rgba(126, 231, 203, 0.2)",
											fontSize: 9,
											color: "#7ee7cb",
										}}
									>
										TRADE ACTIVE — sharing 15% harvest income
									</div>
								)}

								{/* Actions */}
								<div style={{ display: "flex", gap: 8, marginTop: 10 }}>
									{!isAlly && !isHostile && (
										<button
											type="button"
											data-testid={`propose-alliance-${faction.id}`}
											onClick={() => handlePropose(faction.id)}
											style={{
												padding: "5px 12px",
												borderRadius: 5,
												border: "1px solid rgba(126, 231, 203, 0.3)",
												background: "rgba(126, 231, 203, 0.06)",
												color: "#7ee7cb",
												fontSize: 9,
												letterSpacing: "0.12em",
												textTransform: "uppercase",
												cursor: "pointer",
												fontFamily: "inherit",
											}}
										>
											Propose Alliance
										</button>
									)}
									{!isHostile && (
										<button
											type="button"
											data-testid={`declare-war-${faction.id}`}
											onClick={() => handleDeclareWar(faction.id)}
											style={{
												padding: "5px 12px",
												borderRadius: 5,
												border: "1px solid rgba(204, 68, 68, 0.3)",
												background: "rgba(204, 68, 68, 0.06)",
												color: "#cc6666",
												fontSize: 9,
												letterSpacing: "0.12em",
												textTransform: "uppercase",
												cursor: "pointer",
												fontFamily: "inherit",
											}}
										>
											Declare War
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Recent events log */}
				{recentEvents.length > 0 && (
					<div style={{ marginTop: 24 }}>
						<div
							style={{
								fontSize: 10,
								textTransform: "uppercase",
								letterSpacing: "0.24em",
								color: "#90ddec",
								marginBottom: 10,
							}}
						>
							Signal Log
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
							{recentEvents
								.slice()
								.reverse()
								.slice(0, 10)
								.map((evt, i) => (
									<div
										key={`${evt.type}-${evt.factionA}-${evt.factionB}-${i}`}
										style={{
											fontSize: 9,
											color: "rgba(255,255,255,0.35)",
											padding: "4px 8px",
											borderRadius: 4,
											background: "rgba(255,255,255,0.02)",
											borderLeft: `2px solid ${evt.standingChange < 0 ? "rgba(204,68,68,0.4)" : "rgba(126,231,203,0.4)"}`,
										}}
									>
										<span
											style={{ color: "rgba(255,255,255,0.2)", marginRight: 8 }}
										>
											C{evt.turnNumber}
										</span>
										{formatFactionName(evt.factionA)} /{" "}
										{formatFactionName(evt.factionB)}:{" "}
										{evt.type.replace(/_/g, " ")} (
										<span
											style={{
												color: evt.standingChange < 0 ? "#cc6666" : "#7ee7cb",
											}}
										>
											{evt.standingChange > 0 ? "+" : ""}
											{evt.standingChange}
										</span>
										)
									</div>
								))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
