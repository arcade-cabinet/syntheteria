/**
 * StoragePanel — for Storage Hub buildings.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import {
	getBuildingUpgradeJob,
	getPlayerResources,
	startBuildingUpgrade,
} from "../../../systems";
import { Building, StorageCapacity } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	barContainerStyle,
	barFillStyle,
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

export function StoragePanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier } = buildingData;

	const capacity = useMemo(() => {
		for (const e of world.query(Building, StorageCapacity)) {
			if (e.id() === entityId) {
				const sc = e.get(StorageCapacity);
				return sc?.capacity ?? 0;
			}
		}
		return 0;
	}, [world, entityId]);

	const resources: Record<string, number> = (getPlayerResources(world) ??
		{}) as Record<string, number>;
	const totalStored = Object.values(resources).reduce((a, b) => a + b, 0);
	const usedPct =
		capacity > 0
			? Math.min(100, Math.round((totalStored / capacity) * 100))
			: 0;

	const upgradeJob = getBuildingUpgradeJob(entityId);
	const chain = BUILDING_UNLOCK_CHAINS.storage_hub;
	const canUpgrade = buildingTier < 3 && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Storage Hub — Tier {buildingTier}</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Capacity</span>
				<span style={valueStyle}>{capacity} units</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Used</span>
				<div style={barContainerStyle}>
					<div
						style={{
							...barFillStyle,
							width: `${usedPct}%`,
							background: usedPct > 80 ? "#e8c86a" : "#8be6ff",
						}}
					/>
				</div>
				<span style={valueStyle}>
					{totalStored}/{capacity}
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
				Stored Resources
			</div>

			{Object.entries(resources)
				.filter(([, v]) => v > 0)
				.map(([mat, qty]) => (
					<div
						key={mat}
						style={{
							fontSize: 9,
							color: "rgba(255,255,255,0.5)",
							padding: "2px 0",
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<span>{mat.replace(/_/g, " ")}</span>
						<span>{qty}</span>
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
