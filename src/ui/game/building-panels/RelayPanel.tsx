/**
 * RelayPanel — for Relay Tower buildings.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import { getBuildingUpgradeJob, startBuildingUpgrade } from "../../../systems";
import { Building, Powered, SignalNode } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

export function RelayPanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier, factionId, tileX, tileZ } = buildingData;

	const signalData = useMemo(() => {
		for (const e of world.query(Building, SignalNode)) {
			if (e.id() === entityId) {
				return e.get(SignalNode);
			}
		}
		return null;
	}, [world, entityId]);

	const connectedNodes = useMemo(() => {
		const nodes: Array<{ type: string; dist: number }> = [];
		const range = signalData?.range ?? 0;
		for (const e of world.query(Building, SignalNode)) {
			if (e.id() === entityId) continue;
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			const dist = Math.abs(b.tileX - tileX) + Math.abs(b.tileZ - tileZ);
			if (dist <= range) {
				nodes.push({ type: b.buildingType, dist });
			}
		}
		return nodes;
	}, [world, entityId, factionId, tileX, tileZ, signalData]);

	const powered = (() => {
		for (const e of world.query(Building, Powered)) {
			if (e.id() === entityId) return true;
		}
		return false;
	})();
	const upgradeJob = getBuildingUpgradeJob(entityId);
	const chain = BUILDING_UNLOCK_CHAINS.relay_tower;
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Relay Tower — Tier {buildingTier}</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Status</span>
				<span style={{ ...valueStyle, color: powered ? "#7ee7cb" : "#cc6666" }}>
					{powered ? "BROADCASTING" : "OFFLINE"}
				</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Range</span>
				<span style={valueStyle}>{signalData?.range ?? 0} tiles</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Strength</span>
				<span style={valueStyle}>
					{signalData?.strength?.toFixed(1) ?? "0.0"}
				</span>
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
				Connected nodes ({connectedNodes.length})
			</div>

			{connectedNodes.length === 0 && (
				<div
					style={{
						fontSize: 9,
						color: "rgba(255,255,255,0.3)",
						padding: "4px 0",
					}}
				>
					No signal nodes in range.
				</div>
			)}

			{connectedNodes.map((n, i) => (
				<div
					key={i}
					style={{
						fontSize: 9,
						color: "rgba(255,255,255,0.5)",
						padding: "2px 0",
					}}
				>
					{n.type.replace(/_/g, " ")} (dist {n.dist})
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
