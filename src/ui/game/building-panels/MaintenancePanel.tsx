/**
 * MaintenancePanel — for Maintenance Bay buildings.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_UNLOCK_CHAINS } from "../../../config/buildingUnlockDefs";
import { getBuildingUpgradeJob, startBuildingUpgrade } from "../../../systems";
import {
	Building,
	Powered,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import {
	headerStyle,
	labelStyle,
	statRowStyle,
	upgradeBarStyle,
	upgradeBtnStyle,
	valueStyle,
} from "./GenericBuildingPanel";

const REPAIR_RANGE = 2;
const REPAIR_AMOUNT = 2;

export function MaintenancePanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier, factionId, tileX, tileZ } = buildingData;

	const unitsInRange = useMemo(() => {
		const units: Array<{ hp: number; maxHp: number }> = [];
		for (const e of world.query(UnitPos, UnitStats, UnitFaction)) {
			const fac = e.get(UnitFaction);
			if (!fac || fac.factionId !== factionId) continue;
			const pos = e.get(UnitPos);
			if (!pos) continue;
			const dist = Math.abs(pos.tileX - tileX) + Math.abs(pos.tileZ - tileZ);
			if (dist <= REPAIR_RANGE) {
				const stats = e.get(UnitStats);
				if (stats) units.push({ hp: stats.hp, maxHp: stats.maxHp });
			}
		}
		return units;
	}, [world, factionId, tileX, tileZ]);

	const damagedCount = unitsInRange.filter((u) => u.hp < u.maxHp).length;
	const powered = (() => {
		for (const e of world.query(Building, Powered)) {
			if (e.id() === entityId) return true;
		}
		return false;
	})();
	const upgradeJob = getBuildingUpgradeJob(entityId);
	const chain = BUILDING_UNLOCK_CHAINS.maintenance_bay;
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef = chain?.tiers[(buildingTier + 1) as 2 | 3];

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Maintenance Bay — Tier {buildingTier}</h3>

			<div style={statRowStyle}>
				<span style={labelStyle}>Status</span>
				<span style={{ ...valueStyle, color: powered ? "#7ee7cb" : "#cc6666" }}>
					{powered ? "OPERATIONAL" : "UNPOWERED"}
				</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Radius</span>
				<span style={valueStyle}>{REPAIR_RANGE} tiles</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Rate</span>
				<span style={valueStyle}>+{REPAIR_AMOUNT} HP/turn</span>
			</div>

			<div style={statRowStyle}>
				<span style={labelStyle}>Units</span>
				<span style={valueStyle}>
					{unitsInRange.length} in range ({damagedCount} damaged)
				</span>
			</div>

			{unitsInRange.length > 0 && (
				<div style={{ marginTop: 6 }}>
					{unitsInRange.map((u, i) => (
						<div
							key={i}
							style={{
								fontSize: 9,
								color: u.hp < u.maxHp ? "#e8c86a" : "rgba(255,255,255,0.4)",
								padding: "2px 0",
							}}
						>
							Unit — {u.hp}/{u.maxHp} HP {u.hp < u.maxHp ? "(repairing)" : ""}
						</div>
					))}
				</div>
			)}

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
