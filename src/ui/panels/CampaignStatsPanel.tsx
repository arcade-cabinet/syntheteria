/**
 * CampaignStatsPanel — displays campaign-wide statistics
 * inside the slide-out detail panel.
 */

import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import {
	getCampaignStats,
	subscribeCampaignStats,
} from "../../systems/campaignStats";

function StatRow({
	label,
	value,
	tone = "default",
}: {
	label: string;
	value: string | number;
	tone?: "default" | "amber" | "cyan" | "red";
}) {
	const valueColor =
		tone === "amber"
			? "#ffe9b0"
			: tone === "cyan"
				? "#d0f4ff"
				: tone === "red"
					? "#ffd7d7"
					: "#d9fff3";

	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
				paddingVertical: 4,
			}}
		>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 10,
					color: "rgba(255, 255, 255, 0.5)",
					letterSpacing: 1,
					textTransform: "uppercase",
				}}
			>
				{label}
			</Text>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: valueColor,
					fontWeight: "600",
					letterSpacing: 0.5,
				}}
			>
				{value}
			</Text>
		</View>
	);
}

export function CampaignStatsPanel() {
	const stats = useSyncExternalStore(subscribeCampaignStats, getCampaignStats);

	const explorationPct =
		stats.totalCells > 0
			? `${Math.round((stats.cellsDiscovered / stats.totalCells) * 100)}%`
			: "0%";

	return (
		<View style={{ gap: 2 }}>
			<StatRow label="Turns" value={stats.turnsElapsed} tone="cyan" />
			<StatRow
				label="Structures Harvested"
				value={stats.structuresHarvested}
				tone="amber"
			/>
			<StatRow
				label="Structures Built"
				value={stats.structuresBuilt}
				tone="amber"
			/>
			<StatRow label="Area Explored" value={explorationPct} tone="cyan" />
			<StatRow label="Units Built" value={stats.unitsBuilt} />
			<StatRow label="Units Lost" value={stats.unitsLost} tone="red" />
			<StatRow label="Units Hacked" value={stats.unitsHacked} tone="cyan" />
		</View>
	);
}
