/**
 * PowerPanel — for Storm Transmitter, Power Plant, Solar Array, Geothermal Tap.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_DEFS } from "../../../config/buildings";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import { getBuildingUpgradeJob, startBuildingUpgrade } from "../../../systems";
import { Building, Powered, PowerGrid } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

export function PowerPanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingType, buildingTier } = buildingData;
	const def = BUILDING_DEFS[buildingType];
	const displayName = def?.displayName ?? buildingType.replace(/_/g, " ");

	const gridData = useMemo(() => {
		for (const e of world.query(Building, PowerGrid)) {
			if (e.id() === entityId) {
				return e.get(PowerGrid);
			}
		}
		return null;
	}, [world, entityId]);

	const powered = (() => {
		for (const e of world.query(Building, Powered)) {
			if (e.id() === entityId) return true;
		}
		return false;
	})();
	const upgradeJob = getBuildingUpgradeJob(entityId);
	const chain =
		BUILDING_UNLOCK_CHAINS[buildingType as keyof typeof BUILDING_UNLOCK_CHAINS];
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>
				{displayName} — Tier {buildingTier}
			</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Output</span>
				<span style={{ ...valueStyle, color: "#e8c86a" }}>
					+{def?.powerDelta ?? gridData?.powerDelta ?? 0} power
				</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Radius</span>
				<span style={valueStyle}>
					{def?.powerRadius ?? gridData?.powerRadius ?? 0} tiles
				</span>
			</div>

			{gridData && gridData.storageCapacity > 0 && (
				<div style={statRowStyle}>
					<span style={labelStyle}>Stored</span>
					<span style={valueStyle}>
						{gridData.currentCharge}/{gridData.storageCapacity}
					</span>
				</div>
			)}

			<div style={statRowStyle}>
				<span style={labelStyle}>Status</span>
				<span style={{ ...valueStyle, color: powered ? "#7ee7cb" : "#cc6666" }}>
					{powered ? "ACTIVE" : "INACTIVE"}
				</span>
			</div>

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
