/**
 * CampaignStatsPanel — displays campaign-wide statistics
 * inside the slide-out detail panel.
 */

import { useSyncExternalStore } from "react";
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
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
				paddingTop: 4,
				paddingBottom: 4,
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 10,
					color: "rgba(255, 255, 255, 0.5)",
					letterSpacing: 1,
					textTransform: "uppercase",
				}}
			>
				{label}
			</span>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: valueColor,
					fontWeight: "600",
					letterSpacing: 0.5,
				}}
			>
				{value}
			</span>
		</div>
	);
}

export function CampaignStatsPanel() {
	const stats = useSyncExternalStore(subscribeCampaignStats, getCampaignStats);

	const explorationPct =
		stats.totalCells > 0
			? `${Math.round((stats.cellsDiscovered / stats.totalCells) * 100)}%`
			: "0%";

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
		</div>
	);
}
