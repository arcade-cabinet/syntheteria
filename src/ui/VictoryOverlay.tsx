/**
 * Victory Overlay — Displayed when any faction achieves a victory condition.
 *
 * Shows: winner faction, victory type, turn count, faction stats.
 * Provides "Return to Title" button to reset and go back to title screen.
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import { RIVAL_FACTIONS } from "../ai/governor/factionGovernors";
import { ALL_ECONOMY_FACTIONS } from "../systems/factionEconomy";
import { getFactionTerritorySize } from "../systems/territorySystem";
import { getTurnState, subscribeTurnState } from "../systems/turnSystem";
import {
	countFactionUnits,
	getVictoryCondition,
	resetVictoryConditions,
	type VictoryCondition,
	type VictoryType,
} from "../systems/victoryConditions";
import { HudButton } from "./components/HudButton";
import { HudPanel } from "./components/HudPanel";

// ─── Faction Display Info ────────────────────────────────────────────────────

const FACTION_DISPLAY: Record<
	string,
	{ label: string; color: string; borderColor: string }
> = {
	player: {
		label: "Your Collective",
		color: "text-[#00cccc]",
		borderColor: "border-[#00cccc]/40",
	},
	rogue: {
		label: "Reclaimers",
		color: "text-[#ffaa44]",
		borderColor: "border-[#ffaa44]/40",
	},
	cultist: {
		label: "Iron Creed",
		color: "text-[#d987ff]",
		borderColor: "border-[#d987ff]/40",
	},
	feral: {
		label: "Volt Collective",
		color: "text-[#44cc44]",
		borderColor: "border-[#44cc44]/40",
	},
};

const VICTORY_TYPE_LABELS: Record<
	VictoryType,
	{ title: string; description: string }
> = {
	subjugation: {
		title: "Territorial Supremacy",
		description: "Dominant control of the ecumenopolis surface achieved.",
	},
	technical_supremacy: {
		title: "Technical Supremacy",
		description: "Mark V combat platforms deployed in decisive numbers.",
	},
	elimination: {
		title: "Total Elimination",
		description: "All rival machine consciousnesses neutralized.",
	},
};

// ─── Component ───────────────────────────────────────────────────────────────

interface VictoryOverlayProps {
	onReturnToTitle: () => void;
}

export function VictoryOverlay({ onReturnToTitle }: VictoryOverlayProps) {
	const victory = getVictoryCondition();

	if (!victory) return null;

	const isPlayerVictory = victory.winner === "player";
	const factionInfo = FACTION_DISPLAY[victory.winner] ?? FACTION_DISPLAY.player;
	const victoryInfo = VICTORY_TYPE_LABELS[victory.type] ?? {
		title: "Victory",
		description: "A faction has achieved dominance.",
	};

	// Gather stats for display
	const unitCounts = countFactionUnits();
	const stats = ALL_ECONOMY_FACTIONS.map((factionId) => ({
		factionId,
		label: FACTION_DISPLAY[factionId]?.label ?? factionId,
		units: unitCounts.get(factionId) ?? 0,
		territory: getFactionTerritorySize(factionId),
	}));

	return (
		<View
			className="absolute inset-0 items-center justify-center bg-black/75"
			style={{ zIndex: 9999 }}
			testID="victory-overlay"
			accessibilityRole="alert"
			accessibilityLabel={
				isPlayerVictory
					? "Victory achieved"
					: `${factionInfo.label} has achieved victory`
			}
		>
			<View className="w-full max-w-[420px] px-4">
				<HudPanel
					eyebrow={isPlayerVictory ? "SIGNAL CONFIRMED" : "SIGNAL LOST"}
					title={isPlayerVictory ? "VICTORY" : "DEFEAT"}
					variant={isPlayerVictory ? "default" : "danger"}
				>
					{/* Victory type */}
					<View className="mb-4 rounded-xl border border-white/8 bg-white/4 px-3 py-2">
						<Text className="font-mono text-xs uppercase tracking-[0.2em] text-[#8be6ff]/70">
							{victoryInfo.title}
						</Text>
						<Text className="mt-1 font-mono text-[11px] leading-4 text-white/60">
							{victoryInfo.description}
						</Text>
					</View>

					{/* Winner */}
					<View className="mb-4 items-center">
						<Text className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
							{isPlayerVictory ? "DOMINANT FACTION" : "VICTORIOUS FACTION"}
						</Text>
						<Text
							className={`mt-1 font-mono text-lg uppercase tracking-[0.2em] ${factionInfo.color}`}
						>
							{factionInfo.label}
						</Text>
					</View>

					{/* Turn count */}
					<View className="mb-4 flex-row justify-center gap-6">
						<View className="items-center">
							<Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
								Turn
							</Text>
							<Text className="mt-0.5 font-mono text-base text-white/80">
								{victory.turnNumber}
							</Text>
						</View>
						<View className="items-center">
							<Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
								Condition
							</Text>
							<Text className="mt-0.5 font-mono text-xs uppercase text-white/60">
								{victory.type.replace("_", " ")}
							</Text>
						</View>
					</View>

					{/* Faction stats table */}
					<View className="mb-4 rounded-xl border border-white/6 bg-white/3 p-2">
						<Text className="mb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-white/35">
							Final Standings
						</Text>
						{stats.map((s) => (
							<View
								key={s.factionId}
								className={`flex-row items-center justify-between px-2 py-1 ${
									s.factionId === victory.winner ? "rounded-lg bg-white/5" : ""
								}`}
							>
								<Text
									className={`font-mono text-[11px] ${
										FACTION_DISPLAY[s.factionId]?.color ?? "text-white/60"
									}`}
								>
									{s.label}
								</Text>
								<View className="flex-row gap-4">
									<Text className="font-mono text-[10px] text-white/45">
										{s.units} units
									</Text>
									<Text className="font-mono text-[10px] text-white/45">
										{s.territory} cells
									</Text>
								</View>
							</View>
						))}
					</View>

					{/* Detail */}
					<Text className="mb-4 text-center font-mono text-[10px] italic text-white/30">
						{victory.detail}
					</Text>

					{/* Return to title button */}
					<HudButton
						label="Return to Title"
						onPress={onReturnToTitle}
						variant={isPlayerVictory ? "primary" : "danger"}
						testID="victory-return-to-title"
					/>
				</HudPanel>
			</View>
		</View>
	);
}
