/**
 * AnalysisNodePanel — shows acceleration status for Analysis Node buildings.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import {
	analysisAcceleration,
	getBuildingUpgradeJob,
	startBuildingUpgrade,
} from "../../../systems";
import { Building, SignalNode } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

export function AnalysisNodePanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier, factionId, tileX, tileZ } = buildingData;

	const signalRange = useMemo(() => {
		for (const e of world.query(Building, SignalNode)) {
			if (e.id() === entityId) {
				const sn = e.get(SignalNode);
				return sn?.range ?? 0;
			}
		}
		return 0;
	}, [world, entityId]);

	const buildingsInRange = useMemo(() => {
		const inRange: Array<{ type: string; dist: number }> = [];
		for (const e of world.query(Building)) {
			if (e.id() === entityId) continue;
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			const dist = Math.abs(b.tileX - tileX) + Math.abs(b.tileZ - tileZ);
			if (dist <= signalRange) {
				inRange.push({ type: b.buildingType, dist });
			}
		}
		return inRange;
	}, [world, entityId, factionId, tileX, tileZ, signalRange]);

	const accelPct = Math.round(analysisAcceleration(1) * 100);
	const upgradeJob = getBuildingUpgradeJob(entityId);
	const chain = BUILDING_UNLOCK_CHAINS.analysis_node;
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Analysis Node — Tier {buildingTier}</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Range</span>
				<span style={valueStyle}>{signalRange} tiles</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Accel</span>
				<span style={valueStyle}>{accelPct}% upgrade speed boost</span>
			</div>

			<div
				style={{
					marginTop: 10,
					fontSize: 10,
					color: "rgba(255,255,255,0.45)",
					textTransform: "uppercase",
					letterSpacing: "0.2em",
					marginBottom: 6,
				}}
			>
				Buildings in range ({buildingsInRange.length})
			</div>

			{buildingsInRange.length === 0 && (
				<div
					style={{
						fontSize: 9,
						color: "rgba(255,255,255,0.3)",
						padding: "4px 0",
					}}
				>
					No friendly buildings in range.
				</div>
			)}

			{buildingsInRange.map((b, i) => (
				<div
					key={i}
					style={{
						fontSize: 9,
						color: "rgba(255,255,255,0.5)",
						padding: "2px 0",
					}}
				>
					{b.type.replace(/_/g, " ")} (dist {b.dist})
				</div>
			))}

			{upgradeJob && (
				<div style={upgradeBarStyle}>
					Upgrading to Tier {upgradeJob.targetTier} —{" "}
					{upgradeJob.turnsRemaining}t
				</div>
			)}

			{canUpgrade && nextTierDef && (
				<button
					type="button"
					onClick={() => startBuildingUpgrade(world, entityId)}
					style={upgradeBtnStyle}
				>
					Upgrade to Tier {buildingTier + 1} ({nextTierDef.upgradeTurns}t)
				</button>
			)}
		</div>
	);
}
