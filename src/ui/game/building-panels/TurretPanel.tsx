/**
 * TurretPanel — for Defense Turret buildings.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import { getBuildingUpgradeJob, startBuildingUpgrade } from "../../../systems";
import { Building, Powered, TurretStats } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

export function TurretPanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier } = buildingData;

	const turretData = useMemo(() => {
		for (const e of world.query(Building, TurretStats)) {
			if (e.id() === entityId) {
				return e.get(TurretStats);
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
	const chain = BUILDING_UNLOCK_CHAINS.defense_turret;
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Defense Turret — Tier {buildingTier}</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Status</span>
				<span style={{ ...valueStyle, color: powered ? "#7ee7cb" : "#cc6666" }}>
					{powered ? "ARMED" : "UNPOWERED"}
				</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Damage</span>
				<span style={{ ...valueStyle, color: "#cc4444" }}>
					{turretData?.attackDamage ?? 3}
				</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Range</span>
				<span style={valueStyle}>{turretData?.attackRange ?? 8} tiles</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Cooldown</span>
				<span style={valueStyle}>
					{turretData?.cooldownTurns ?? 2}t
					{turretData && turretData.currentCooldown > 0 && (
						<span style={{ color: "#e8c86a", marginLeft: 6 }}>
							(reloading: {turretData.currentCooldown}t)
						</span>
					)}
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
